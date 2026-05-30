import { useState } from "react";
import {
  FlaskConical, Play, ShieldAlert, ShieldCheck,
  Cpu, BarChart2, Database, Zap, ChevronRight, Sparkles,
} from "lucide-react";
import { api } from "../hooks/useAuth";
import { getAttackColor } from "../config";

const ATTACK_TYPES = [
  {
    key: "SYN_FLOOD",
    label: "SYN Flood",
    desc: "TCP SYN paketleri menen server resursların toltırıw",
    accent: "#dc2626",
    req_s: "35 req/s",
    pkt:   "40 bayt",
  },
  {
    key: "UDP_FLOOD",
    label: "UDP Flood",
    desc: "Úlken UDP paketleri menen tarmaqtı toltırıw",
    accent: "#ea580c",
    req_s: "25 req/s",
    pkt:   "1400 bayt",
  },
  {
    key: "DNS_AMP",
    label: "DNS Amplification",
    desc: "DNS serverleri arqali amplifikatsiyalı DDoS hújim",
    accent: "#2563eb",
    req_s: "20 req/s",
    pkt:   "512 bayt",
  },
  {
    key: "PORTSCAN",
    label: "Port Scan",
    desc: "Ashıq portlardı tabıw ushın sistemalı skanerlew",
    accent: "#ca8a04",
    req_s: "80 req/s",
    pkt:   "32 bayt",
  },
  {
    key: "NORMAL_TEST",
    label: "Normal trafik",
    desc: "Ápiwayı paydalanıwshı sorawı — BENIGN sıpatında anıqlanıwı kerek",
    accent: "#10b981",
    req_s: "2 req/s",
    pkt:   "800 bayt",
  },
];

const FEATURES_UZ = {
  flow_duration:    "Aǵıs dawamlılıǵı (μs)",
  tot_fwd_pkts:     "Forward paketler",
  tot_bwd_pkts:     "Backward paketler",
  fwd_pkt_len_mean: "Fwd paket ólshemi (ort.)",
  bwd_pkt_len_mean: "Bwd paket ólshemi (ort.)",
  flow_byts_s:      "Bayt/sekund",
  flow_pkts_s:      "Paket/sekund",
  pkt_len_mean:     "Ortasha paket ólshemi",
  fwd_iat_mean:     "Forward IAT (ort.)",
  fin_flag_cnt:     "FIN flag sanı",
};

export default function Demo() {
  const [selected, setSelected] = useState("SYN_FLOOD");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState("");

  const cfg = ATTACK_TYPES.find((a) => a.key === selected);

  const runDemo = async () => {
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const res = await api.post("/demo", { attack_type: selected });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Serverge ulanıp bolmadı");
    } finally {
      setLoading(false);
    }
  };

  const isAttack = result?.status === "ATTACK";
  const c = result ? getAttackColor(result.attack_type) : null;

  return (
    <div>
      <style>{`
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        .demo-btn:hover:not(:disabled){ background:#1d4ed8; }
        .demo-btn:disabled{ background:#cbd5e1; cursor:not-allowed; color:#fff; }
        .atk-card:hover:not(.disabled){ border-color:#cbd5e1; }
        .atk-card.active{ border-color:#2563eb !important; background:#eff6ff !important; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Tizim sınaǵı</h1>
          <p style={styles.subtitle}>
            ML modelin sintetik trafik penen sınaw · serverge real hújim jasamastan
          </p>
        </div>
        <div style={styles.pill}>
          <Sparkles size={12} color="#2563eb" />
          Pipeline tester
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 16 }}>
        {/* ─── LEFT: Selector ─── */}
        <div>
          <div style={styles.panel}>
            <div style={styles.sectionLabel}>TRAFIK TÚRI</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {ATTACK_TYPES.map((atk) => {
                const isActive = selected === atk.key;
                return (
                  <button
                    key={atk.key}
                    onClick={() => { setSelected(atk.key); setResult(null); }}
                    disabled={loading}
                    className={`atk-card ${isActive ? "active" : ""} ${loading ? "disabled" : ""}`}
                    style={{
                      ...styles.atkCard,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: atk.accent, marginTop: 6, flexShrink: 0,
                      boxShadow: isActive ? `0 0 0 4px ${atk.accent}22` : "none",
                    }} />
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ ...styles.atkLabel, color: isActive ? atk.accent : "#0f172a" }}>
                        {atk.label}
                      </div>
                      <div style={styles.atkDesc}>{atk.desc}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 7 }}>
                        <span style={styles.atkChip} className="mono">req/s · {atk.req_s}</span>
                        <span style={styles.atkChip} className="mono">pkt · {atk.pkt}</span>
                      </div>
                    </div>
                    {isActive && <ChevronRight size={14} color={atk.accent} />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={runDemo}
            disabled={loading}
            className="demo-btn"
            style={styles.runBtn}
          >
            {loading ? (
              <>
                <FlaskConical size={15} style={{ animation: "spin 1s linear infinite" }} />
                Tahlil etilmekte…
              </>
            ) : (
              <>
                <Play size={15} fill="#ffffff" />
                Pipeline baslaw
              </>
            )}
          </button>

          {error && (
            <div style={styles.errorBox}>
              <span style={styles.errorDot} />
              {error}
            </div>
          )}

          <div style={styles.helpBox}>
            <div style={styles.helpTitle}>Qalay isleydi?</div>
            <div style={styles.helpText}>
              Saylanǵan trafik túrin server <code style={styles.helpCode}>Rule Engine</code> hám{" "}
              <code style={styles.helpCode}>XGBoost ML</code> arqalı tahlil etedi.
              Aqırǵı qarar <code style={styles.helpCode}>Rule×0.55 + ML×0.45</code> formulası boyınsha esaplanadı.
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Results ─── */}
        <div>
          {!result && !loading && (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                <FlaskConical size={20} color="#94a3b8" />
              </div>
              <div style={{ fontSize: 14, color: "#475569", fontWeight: 600 }}>
                Nátiyjeler bul jerde kórinedi
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Trafik túrin saylań hám pipeline baslań
              </div>
            </div>
          )}

          {loading && (
            <div style={styles.empty}>
              <div style={{ ...styles.emptyIcon, background: "#eff6ff", borderColor: "#bfdbfe" }}>
                <FlaskConical size={20} color="#2563eb" style={{ animation: "spin 1.4s linear infinite" }} />
              </div>
              <div style={{ fontSize: 14, color: "#1d4ed8", fontWeight: 600 }}>
                Pipeline tahlili dawam etmekte…
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Rule Engine · XGBoost · scoring
              </div>
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Main verdict */}
              <div style={{
                background: "#ffffff",
                border: `1px solid ${isAttack ? "#fecaca" : "#a7f3d0"}`,
                borderLeft: `3px solid ${isAttack ? "#dc2626" : "#10b981"}`,
                borderRadius: 12,
                padding: 20,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isAttack ? "#fef2f2" : "#ecfdf5",
                    border: `1px solid ${isAttack ? "#fecaca" : "#a7f3d0"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isAttack
                      ? <ShieldAlert size={22} color="#dc2626" strokeWidth={2.2} />
                      : <ShieldCheck size={22} color="#10b981" strokeWidth={2.2} />}
                  </div>
                  <div>
                    <div style={{
                      fontSize: 18, fontWeight: 700,
                      color: isAttack ? "#b91c1c" : "#047857",
                      letterSpacing: "-0.01em",
                    }}>
                      {isAttack ? "HÚJIM ANIQLANDI" : "NORMAL TRAFIK"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      Qarar deregi · <span style={{ fontWeight: 600, color: "#0f172a" }}>{result.det_mode}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Hújim túri",   value: result.attack_type,      color: c?.text || "#0f172a", border: c?.border || "#e5e9f0", bg: c?.bg || "#f8fafc" },
                    { label: "Isenim",      value: `${result.confidence}%`, color: isAttack ? "#dc2626" : "#10b981", border: isAttack ? "#fecaca" : "#a7f3d0", bg: isAttack ? "#fef2f2" : "#ecfdf5" },
                    { label: "Kombinatsiyalanǵan", value: `${result.combined}%`,   color: "#2563eb", border: "#bfdbfe", bg: "#eff6ff" },
                  ].map(({ label, value, color, border, bg }) => (
                    <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={styles.miniLabel}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source */}
              {result.sample_source && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  background: result.sample_source === "real" ? "#ecfdf5" : "#eff6ff",
                  border: `1px solid ${result.sample_source === "real" ? "#a7f3d0" : "#bfdbfe"}`,
                  borderRadius: 10,
                }}>
                  {result.sample_source === "real"
                    ? <Database size={14} color="#047857" />
                    : <Zap size={14} color="#2563eb" />}
                  <span style={{
                    fontSize: 11.5,
                    color: result.sample_source === "real" ? "#047857" : "#1d4ed8",
                    fontWeight: 500,
                  }}>
                    {result.sample_source === "real"
                      ? "CICIDS2017 haqıyqıy dataset úlgisi paydalanıldı"
                      : "Sintetik maǵlıwmat (demo_samples.pkl tabılmadı — dáslep model_train.py baslań)"}
                  </span>
                </div>
              )}

              {/* Rule vs ML */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <DetectorCard
                  icon={BarChart2}
                  title="Rule Engine"
                  weight="55%"
                  status={result.rule.status}
                  type={result.rule.type}
                  conf={result.rule.confidence}
                />
                <DetectorCard
                  icon={Cpu}
                  title="XGBoost ML"
                  weight="45%"
                  status={result.ml.status}
                  type={result.ml.type}
                  conf={result.ml.confidence}
                />
              </div>

              {/* ML class probabilities */}
              {result.ml.proba && Object.keys(result.ml.proba).length > 0 && (
                <div style={styles.panel}>
                  <div style={styles.panelHeader}>
                    <span style={styles.panelTitle}>ML klası itimallıqları</span>
                    <span style={styles.panelMeta}>predict_proba</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(() => {
                      const entries = Object.entries(result.ml.proba).sort((a, b) => b[1] - a[1]);
                      const topCls  = entries[0]?.[0];
                      return entries.map(([cls, pct]) => {
                        const isTop       = cls === topCls;
                        const isAttackCls = cls !== "BENIGN";
                        const cc          = getAttackColor(cls);
                        const barColor    = isTop ? cc.dot : "#cbd5e1";
                        const textColor   = isTop ? cc.text : "#94a3b8";
                        return (
                          <div key={cls} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{
                              fontSize: 11.5, minWidth: 96,
                              color: textColor, fontWeight: isTop ? 700 : 500,
                            }}>
                              {cls}
                              {isTop && <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.7 }}>▲</span>}
                            </span>
                            <div style={{ flex: 1, height: 7, background: "#f1f5f9", borderRadius: 3.5, overflow: "hidden" }}>
                              <div style={{
                                width: `${Math.min(pct, 100)}%`, height: "100%",
                                background: barColor, borderRadius: 3.5,
                                transition: "width .6s ease",
                                opacity: isTop ? 1 : 0.45,
                              }} />
                            </div>
                            <span className="mono" style={{
                              fontSize: 11, minWidth: 44, textAlign: "right",
                              color: textColor, fontWeight: isTop ? 700 : 500,
                            }}>
                              {pct}%
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8" }}>
                    ▲ ML modeliniń tiykarǵı boljawı. Aqırǵı qarar Rule + ML kombinatsiyasında belgilenedi.
                  </div>
                </div>
              )}

              {/* Features */}
              {result.features && (
                <div style={styles.panel}>
                  <div style={styles.panelHeader}>
                    <span style={styles.panelTitle}>CICIDS2017 feature vektori</span>
                    <span style={styles.panelMeta}>10 qásiyet</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {Object.entries(result.features).map(([key, val]) => (
                      <div key={key} style={styles.featureRow}>
                        <span style={{ fontSize: 11.5, color: "#475569" }}>
                          {FEATURES_UZ[key] || key}
                        </span>
                        <span className="mono" style={{ fontSize: 11.5, color: "#2563eb", fontWeight: 600 }}>
                          {val > 1000 ? (val / 1000).toFixed(1) + "K" : val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetectorCard({ icon: Icon, title, weight, status, type, conf }) {
  const isAttack = status === "ATTACK";
  const isNormal = status === "NORMAL";
  return (
    <div style={styles.panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "#eff6ff", color: "#2563eb",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={14} />
          </div>
          <span style={styles.panelTitle}>{title}</span>
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: "#94a3b8",
          background: "#f1f5f9", padding: "3px 8px", borderRadius: 4,
          letterSpacing: "0.05em",
        }}>
          {weight}
        </span>
      </div>
      <div style={{
        fontSize: 15, fontWeight: 700,
        color: isAttack ? "#dc2626" : (isNormal ? "#10b981" : "#94a3b8"),
        marginBottom: 10, letterSpacing: "-0.01em",
      }}>
        {status}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11.5, color: "#64748b" }}>Túr</span>
          <span style={{ fontSize: 11.5, color: "#0f172a", fontWeight: 600 }}>{type}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11.5, color: "#64748b" }}>Ball</span>
          <span className="mono" style={{ fontSize: 11.5, color: "#0f172a", fontWeight: 600 }}>{conf}%</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  h1: { fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: 5 },
  subtitle: { fontSize: 13, color: "#64748b" },
  pill: {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "5px 11px", borderRadius: 999,
    background: "#eff6ff", border: "1px solid #bfdbfe",
    fontSize: 11, color: "#1d4ed8", fontWeight: 600,
  },

  panel: {
    background: "#ffffff",
    border: "1px solid #e5e9f0",
    borderRadius: 12,
    padding: 18,
    boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
  },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  panelTitle: { fontSize: 13, color: "#0f172a", fontWeight: 600 },
  panelMeta: {
    fontSize: 10.5, color: "#94a3b8", letterSpacing: "0.08em",
    fontWeight: 600, textTransform: "uppercase",
  },

  sectionLabel: {
    fontSize: 10.5, color: "#94a3b8",
    letterSpacing: "0.12em", fontWeight: 700,
  },

  atkCard: {
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "13px 14px", borderRadius: 10, textAlign: "left",
    background: "#ffffff",
    border: "1px solid #e5e9f0",
    transition: "all .15s",
  },
  atkLabel: { fontSize: 13, fontWeight: 600, marginBottom: 3, letterSpacing: "-0.01em" },
  atkDesc:  { fontSize: 11.5, color: "#64748b", lineHeight: 1.5 },
  atkChip: {
    fontSize: 10.5, color: "#64748b",
    background: "#f8fafc", border: "1px solid #e5e9f0",
    padding: "1px 7px", borderRadius: 4,
  },

  runBtn: {
    width: "100%",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
    background: "#2563eb",
    border: "none", borderRadius: 10,
    padding: "14px",
    color: "#ffffff", fontSize: 13.5, fontWeight: 700,
    fontFamily: "inherit",
    letterSpacing: "0.01em",
    marginTop: 12,
    transition: "background .15s",
    boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
  },

  errorBox: {
    marginTop: 10, padding: "10px 14px",
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 8, color: "#b91c1c", fontSize: 12,
    display: "flex", alignItems: "center", gap: 8,
  },
  errorDot: { width: 6, height: 6, borderRadius: "50%", background: "#dc2626" },

  helpBox: {
    marginTop: 12, padding: "12px 14px",
    background: "#f8fafc", border: "1px solid #e5e9f0",
    borderRadius: 10,
  },
  helpTitle: { fontSize: 11, color: "#94a3b8", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 },
  helpText:  { fontSize: 12, color: "#475569", lineHeight: 1.6 },
  helpCode: {
    background: "#ffffff", border: "1px solid #e2e8f0",
    borderRadius: 3, padding: "1px 5px",
    fontFamily: "JetBrains Mono, monospace", fontSize: 10.5,
    color: "#2563eb",
  },

  empty: {
    background: "#ffffff",
    border: "1px dashed #cbd5e1",
    borderRadius: 12,
    padding: "70px 24px",
    textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  emptyIcon: {
    width: 48, height: 48, borderRadius: 12,
    background: "#f8fafc", border: "1px solid #e2e8f0",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },

  miniLabel: {
    fontSize: 10, color: "#94a3b8",
    letterSpacing: "0.1em", fontWeight: 700,
  },

  featureRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 12px", borderRadius: 6,
    background: "#f8fafc",
    border: "1px solid #f1f5f9",
  },
};
