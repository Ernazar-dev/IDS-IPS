// CICIDS2017 statistikasi + rule-based aniqlash

const CICIDS_STATS = {
  BENIGN: {
    flow_duration:    [500000, 2000000],
    tot_fwd_pkts:     [8, 40],
    tot_bwd_pkts:     [6, 35],
    fwd_pkt_len_mean: [400, 1200],
    bwd_pkt_len_mean: [500, 1400],
    flow_byts_s:      [2000, 80000],
    flow_pkts_s:      [5, 80],
    pkt_len_mean:     [400, 1100],
    fwd_iat_mean:     [10000, 200000],
    fin_flag_cnt:     [1, 2],
  },
  SYN: {
    flow_duration:    [50, 500],
    tot_fwd_pkts:     [1, 3],
    tot_bwd_pkts:     [0, 0],
    fwd_pkt_len_mean: [0, 40],
    bwd_pkt_len_mean: [0, 0],
    flow_byts_s:      [100000, 1200000],
    flow_pkts_s:      [5000, 60000],
    pkt_len_mean:     [0, 40],
    fwd_iat_mean:     [0, 100],
    fin_flag_cnt:     [0, 0],
  },
  UDP: {
    flow_duration:    [100, 1500],
    tot_fwd_pkts:     [20, 100],
    tot_bwd_pkts:     [0, 1],
    fwd_pkt_len_mean: [1400, 8000],
    bwd_pkt_len_mean: [0, 50],
    flow_byts_s:      [500000, 3000000],
    flow_pkts_s:      [2000, 15000],
    pkt_len_mean:     [1200, 7000],
    fwd_iat_mean:     [0, 300],
    fin_flag_cnt:     [0, 0],
  },
  PORTSCAN: {
    flow_duration:    [50, 300],
    tot_fwd_pkts:     [1, 3],
    tot_bwd_pkts:     [0, 1],
    fwd_pkt_len_mean: [0, 28],
    bwd_pkt_len_mean: [0, 30],
    flow_byts_s:      [5000, 60000],
    flow_pkts_s:      [3000, 25000],
    pkt_len_mean:     [0, 28],
    fwd_iat_mean:     [0, 200],
    fin_flag_cnt:     [0, 0],
  },
  DNS: {
    flow_duration:    [100, 800],
    tot_fwd_pkts:     [1, 4],
    tot_bwd_pkts:     [1, 4],
    fwd_pkt_len_mean: [60, 180],
    bwd_pkt_len_mean: [150, 600],
    flow_byts_s:      [20000, 400000],
    flow_pkts_s:      [500, 8000],
    pkt_len_mean:     [100, 400],
    fwd_iat_mean:     [0, 400],
    fin_flag_cnt:     [0, 0],
  },
};

const FEATURE_ORDER = [
  "flow_duration", "tot_fwd_pkts", "tot_bwd_pkts", "fwd_pkt_len_mean",
  "bwd_pkt_len_mean", "flow_byts_s", "flow_pkts_s", "pkt_len_mean",
  "fwd_iat_mean", "fin_flag_cnt",
];

const ATTACK_TYPE_MAP = {
  SYN_FLOOD:   "SYN",
  UDP_FLOOD:   "UDP",
  DNS_AMP:     "DNS",
  PORTSCAN:    "PORTSCAN",
  NORMAL_TEST: "BENIGN",
};

function classifyPattern(reqPerSec, pktSize) {
  if (reqPerSec > 50  && pktSize < 100)  return ["SYN",      Math.min((reqPerSec - 50)  / 200, 1.0)];
  if (reqPerSec > 40  && pktSize > 500)  return ["UDP",      Math.min((reqPerSec - 40)  / 150, 1.0)];
  if (reqPerSec > 60  && pktSize < 80)   return ["PORTSCAN", Math.min((reqPerSec - 60)  / 150, 1.0)];
  if (reqPerSec > 30  && pktSize < 400)  return ["DNS",      Math.min((reqPerSec - 30)  / 100, 1.0)];
  return ["BENIGN", Math.min(reqPerSec / 20.0, 0.4)];
}

function buildFeaturesFromHttp(reqPerSec, pktSize, attackHint) {
  let attackType, t;

  if (attackHint) {
    const normalized = attackHint.trim().toUpperCase();
    attackType = ATTACK_TYPE_MAP[normalized] || null;
    if (!attackType || !CICIDS_STATS[attackType]) {
      [attackType] = classifyPattern(reqPerSec, pktSize);
    }
    t = attackType === "BENIGN" ? 0.5 : 0.92;
  } else {
    [attackType, t] = classifyPattern(reqPerSec, pktSize);
  }

  const stats    = CICIDS_STATS[attackType];
  const features = [];

  for (const feat of FEATURE_ORDER) {
    const [lo, hi] = stats[feat];
    const val      = lo + (hi - lo) * t;
    const noise    = (hi - lo) * 0.02 * (Math.random() * 2 - 1);
    features.push(Math.max(lo, val + noise));
  }

  return [features, `HTTP_${attackType}_t${t.toFixed(2)}`];
}

// ---------------------------------------------------------------------------
// Rule-based aniqlash — pastroq thresholdlar bilan ishonchliroq
// ---------------------------------------------------------------------------
const ATTACK_PROFILES = {
  SYN: {
    rps_min: 8.0,  rps_high: 40.0,
    pkt_max: 150,
    w_rps: 0.70, w_pkt: 0.30,
  },
  UDP: {
    rps_min: 8.0,  rps_high: 40.0,
    pkt_min: 400,
    w_rps: 0.55, w_pkt: 0.45,
  },
  PORTSCAN: {
    rps_min: 6.0,  rps_high: 30.0,
    pkt_max: 100,
    w_rps: 0.65, w_pkt: 0.35,
  },
  DNS: {
    rps_min: 6.0,  rps_high: 30.0,
    pkt_lo: 40,   pkt_hi: 700,
    w_rps: 0.65, w_pkt: 0.35,
  },
};

const RULE_ATTACK_MAP = {
  SYN_FLOOD:   "SYN",
  UDP_FLOOD:   "UDP",
  DNS_AMP:     "DNS",
  PORTSCAN:    "PORTSCAN",
  NORMAL_TEST: "BENIGN",
};

function attackScore(reqS, pktSize, profile) {
  if (reqS < profile.rps_min) return 0.0;

  const rpsScore = Math.min(
    (reqS - profile.rps_min) / Math.max(profile.rps_high - profile.rps_min, 1.0),
    1.0,
  );

  let pktScore;
  if ("pkt_max" in profile) {
    pktScore = Math.max(0.0, 1.0 - (pktSize / profile.pkt_max) * 0.5);
  } else if ("pkt_min" in profile) {
    pktScore = Math.min((pktSize / profile.pkt_min) * 0.85, 1.0);
  } else if ("pkt_lo" in profile) {
    pktScore = (pktSize >= profile.pkt_lo && pktSize <= profile.pkt_hi) ? 0.85 : 0.20;
  } else {
    pktScore = 0.50;
  }

  return Math.min(rpsScore * profile.w_rps + pktScore * profile.w_pkt, 1.0);
}

function ruleBasedDetect(reqS, attackHint, pktSize) {
  if (attackHint) {
    const normalized  = attackHint.trim().toUpperCase();
    const attackType  = RULE_ATTACK_MAP[normalized] || "SYN";

    if (attackType === "BENIGN") return ["NORMAL", "BENIGN", 0.08];

    const profile = ATTACK_PROFILES[attackType] || ATTACK_PROFILES.SYN;
    const score   = attackScore(reqS, pktSize, profile);

    if (score >= 0.25) {
      return ["ATTACK", attackType, Math.round((0.50 + score * 0.49) * 1000) / 1000];
    }
    return ["NORMAL", attackType, Math.min(score + 0.10, 0.49)];
  }

  let bestType  = "BENIGN";
  let bestScore = 0.0;
  for (const [atype, profile] of Object.entries(ATTACK_PROFILES)) {
    const s = attackScore(reqS, pktSize, profile);
    if (s > bestScore) { bestScore = s; bestType = atype; }
  }

  if (bestScore >= 0.45) {
    return ["ATTACK", bestType, Math.round((0.50 + bestScore * 0.49) * 1000) / 1000];
  }
  const label = bestScore > 0.10 ? bestType : "BENIGN";
  return ["NORMAL", label, Math.min(bestScore + 0.05, 0.49)];
}

module.exports = {
  buildFeaturesFromHttp,
  ruleBasedDetect,
  ATTACK_TYPE_MAP,
  FEATURE_ORDER,
};
