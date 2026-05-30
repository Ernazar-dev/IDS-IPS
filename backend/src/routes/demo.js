const express      = require("express");
const requireAuth  = require("../middleware/auth");
const mlBridge     = require("../services/mlBridge");
const { buildFeaturesFromHttp, ruleBasedDetect, ATTACK_TYPE_MAP, FEATURE_ORDER }
                   = require("../services/ruleEngine");
const NetworkLog   = require("../models/NetworkLog");

const router = express.Router();

// Demo parametrlari — ko'proq realistik qiymatlar
const DEMO_PARAMS = {
  SYN_FLOOD:   { req_s: 120.0, pkt_size: 40   },
  UDP_FLOOD:   { req_s:  90.0, pkt_size: 1400 },
  DNS_AMP:     { req_s:  60.0, pkt_size: 512  },
  PORTSCAN:    { req_s: 180.0, pkt_size: 32   },
  NORMAL_TEST: { req_s:   1.5, pkt_size: 800  },
};

// CICIDS2017 ga asoslangan hardcoded fallback feature vektorlar
// (demo_samples.pkl bo'lmasa ML uchun ishlatiladi)
const FALLBACK_FEATURES = {
  SYN: [
    320,     // flow_duration (μs)
    2,       // tot_fwd_pkts
    0,       // tot_bwd_pkts
    38,      // fwd_pkt_len_mean
    0,       // bwd_pkt_len_mean
    712500,  // flow_byts_s
    44000,   // flow_pkts_s
    38,      // pkt_len_mean
    85,      // fwd_iat_mean
    0,       // fin_flag_cnt
  ],
  UDP: [
    800,     // flow_duration
    50,      // tot_fwd_pkts
    1,       // tot_bwd_pkts
    4200,    // fwd_pkt_len_mean
    80,      // bwd_pkt_len_mean
    1400000, // flow_byts_s
    6500,    // flow_pkts_s
    3800,    // pkt_len_mean
    180,     // fwd_iat_mean
    0,       // fin_flag_cnt
  ],
  DNS: [
    600,     // flow_duration
    3,       // tot_fwd_pkts
    3,       // tot_bwd_pkts
    120,     // fwd_pkt_len_mean
    420,     // bwd_pkt_len_mean
    180000,  // flow_byts_s
    3000,    // flow_pkts_s
    220,     // pkt_len_mean
    220,     // fwd_iat_mean
    0,       // fin_flag_cnt
  ],
  PORTSCAN: [
    180,     // flow_duration
    2,       // tot_fwd_pkts
    0,       // tot_bwd_pkts
    22,      // fwd_pkt_len_mean
    0,       // bwd_pkt_len_mean
    28000,   // flow_byts_s
    12000,   // flow_pkts_s
    22,      // pkt_len_mean
    95,      // fwd_iat_mean
    0,       // fin_flag_cnt
  ],
  BENIGN: [
    1800000, // flow_duration
    24,      // tot_fwd_pkts
    18,      // tot_bwd_pkts
    820,     // fwd_pkt_len_mean
    980,     // bwd_pkt_len_mean
    40000,   // flow_byts_s
    30,      // flow_pkts_s
    750,     // pkt_len_mean
    85000,   // fwd_iat_mean
    2,       // fin_flag_cnt
  ],
};

const DEMO_LABEL_MAP = {
  SYN_FLOOD:   "SYN",
  UDP_FLOOD:   "SYN",   // DoS/DDoS → SYN sinfi
  DNS_AMP:     "SYN",   // DDoS amplification → SYN sinfi
  PORTSCAN:    "PORTSCAN",
  NORMAL_TEST: "BENIGN",
};

let _io = null;
function setIo(io) { _io = io; }

router.post("/", requireAuth, async (req, res) => {
  const attackHint = (req.body?.attack_type || "SYN_FLOOD").toUpperCase();
  const params     = DEMO_PARAMS[attackHint] || DEMO_PARAMS.SYN_FLOOD;
  const { req_s: reqS, pkt_size: pktSize } = params;

  const [ruleStatus, ruleAttack, ruleConf] = ruleBasedDetect(reqS, attackHint, pktSize);

  let mlStatus = "N/A", mlAttack = "N/A", mlConf = 0;
  let mlProba = {}, features, pattern, sampleSource;

  if (mlBridge.ready) {
    try {
      const label = DEMO_LABEL_MAP[attackHint] || "SYN";

      // demo_samples.pkl yo'q bo'lsa CICIDS2017 ga asoslangan fallback ishlatiladi
      const fallback = FALLBACK_FEATURES[label] || FALLBACK_FEATURES.BENIGN;

      const result  = await mlBridge.demo(label, fallback);

      mlStatus     = result.status;
      mlAttack     = result.attack_type;
      mlConf       = result.confidence;
      mlProba      = result.proba || {};
      features     = result.features;
      sampleSource = result.using_real ? "real" : "synthetic";
      pattern      = result.using_real ? `REAL_${label}` : `CICIDS_${label}_fallback`;
    } catch (err) {
      console.warn("[Demo] ML xatosi:", err.message);
      [features, pattern] = buildFeaturesFromHttp(reqS, pktSize, attackHint);
      sampleSource = "synthetic";
    }
  } else {
    [features, pattern] = buildFeaturesFromHttp(reqS, pktSize, attackHint);
    sampleSource = "ml_yuklanmagan";
  }

  if (!features) {
    const label = DEMO_LABEL_MAP[attackHint] || "SYN";
    features = FALLBACK_FEATURES[label] || FALLBACK_FEATURES.BENIGN;
    sampleSource = "synthetic";
  }

  const flowBytsS = features[5];

  const ruleAtk = ruleStatus === "ATTACK" ? ruleConf : 0.0;
  const mlAtk   = mlStatus   === "ATTACK" ? (mlConf || 0) : 0.0;
  const combined = ruleAtk * 0.55 + mlAtk * 0.45;

  let status, attackType, confidence, detMode;
  if (combined >= 0.28) {
    if (ruleStatus === "ATTACK" && mlStatus === "ATTACK") {
      [detMode, attackType, confidence] = ["RULE+ML", ruleAttack, Math.max(ruleConf, mlConf || 0)];
    } else if (ruleStatus === "ATTACK") {
      [detMode, attackType, confidence] = ["RULE", ruleAttack, ruleConf];
    } else {
      [detMode, attackType, confidence] = ["ML", mlAttack, mlConf || 0];
    }
    status = "ATTACK";
  } else {
    if (mlStatus === "NORMAL") {
      [detMode, attackType, confidence] = ["ML", mlAttack, mlConf || 0];
    } else {
      [detMode, attackType, confidence] = ["RULE", ruleAttack, ruleConf];
    }
    status = "NORMAL";
  }

  const sourceIp = "demo.local";
  console.log(`[Demo] ${attackHint} → ${status} ${attackType} (${(confidence * 100).toFixed(0)}%) [${sampleSource}] Rule=${ruleStatus} ML=${mlStatus}`);

  NetworkLog.create({
    ip_address:   sourceIp,
    attack_type:  attackType,
    req_per_sec:  reqS,
    flow_byts_s:  flowBytsS,
    status,
    confidence,
    pattern,
    capture_mode: "demo",
  }).catch((err) => console.error("[Demo] DB xatosi:", err.message));

  if (_io) {
    try {
      _io.emit("new_alert", {
        ip:          sourceIp,
        attack_type: attackType,
        status,
        req:         reqS,
        bytes_s:     Math.round(flowBytsS),
        time:        new Date().toTimeString().slice(0, 8),
        confidence:  Math.round(confidence * 1000) / 10,
        pattern,
      });
    } catch { /* ignore */ }
  }

  const featuresDict = {};
  FEATURE_ORDER.forEach((key, i) => {
    featuresDict[key] = Math.round((features[i] || 0) * 100) / 100;
  });

  return res.json({
    status,
    attack_type:   attackType,
    confidence:    Math.round(confidence * 1000) / 10,
    req_per_sec:   reqS,
    det_mode:      detMode,
    combined:      Math.round(combined * 1000) / 10,
    sample_source: sampleSource,
    rule: {
      status:     ruleStatus,
      type:       ruleAttack,
      confidence: Math.round(ruleConf * 1000) / 10,
    },
    ml: {
      status:     mlStatus,
      type:       mlAttack,
      confidence: Math.round((mlConf || 0) * 1000) / 10,
      proba:      mlProba,
    },
    features: featuresDict,
  });
});

module.exports = { router, setIo };
