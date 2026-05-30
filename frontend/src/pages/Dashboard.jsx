import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert, ShieldCheck, Activity, Zap,
  BarChart2, Clock, TrendingUp, ArrowUpRight,
} from "lucide-react";
import { api } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { getAttackColor } from "../config";

/* ─────────────────────── Components ─────────────────────── */

function StatCard({ label, value, sub, icon: Icon, accent = "#2563eb", emphasis }) {
  return (
    <div style={styles.statCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <span style={styles.statLabel}>{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: emphasis ? accent : `${accent}14`,
          color: emphasis ? "#ffffff" : accent,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} strokeWidth={2.2} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ ...styles.statValue, color: emphasis ? accent : "#0f172a" }}>{value}</span>
      </div>
      {sub && <div style={styles.statSub}>{sub}</div>}
    </div>
  );
}

function Bar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color,
          borderRadius: 3, transition: "width .5s ease",
        }} />
      </div>
      <span style={{ fontSize: 12, color: "#0f172a", minWidth: 34, textAlign: "right", fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function LiveFeed({ events }) {
  if (!events.length) {
    return (
      <div style={styles.empty}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          <Activity size={16} color="#94a3b8" />
        </div>
        <div>Sorawlar kútilmekte</div>
        <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>Real-waqıt waqıyaları bul jerde kórinedi</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 360, overflowY: "auto" }}>
      {events.slice(0, 30).map((ev) => {
        const c = getAttackColor(ev.attack_type);
        const attack = ev.status === "ATTACK";
        return (
          <div key={ev._id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "9px 12px", borderRadius: 7,
            background: "#ffffff",
            border: `1px solid ${attack ? "#fecaca" : "#e5e9f0"}`,
            animation: "slideIn .2s ease",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: attack ? "#dc2626" : "#10b981",
              boxShadow: attack ? "0 0 0 3px #fee2e2" : "0 0 0 3px #d1fae5",
              flexShrink: 0,
            }} />
            <span className="mono" style={{ fontSize: 11, color: "#94a3b8", minWidth: 60 }}>{ev.time}</span>
            <span className="mono" style={{ fontSize: 12, color: "#0f172a", flex: 1 }}>{ev.ip}</span>
            <span style={{
              fontSize: 10.5, fontWeight: 600,
              padding: "2px 8px", borderRadius: 999,
              background: c.bg, color: c.text, border: `1px solid ${c.border}`,
              minWidth: 62, textAlign: "center",
            }}>
              {ev.attack_type}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "#64748b", minWidth: 54, textAlign: "right" }}>
              {ev.req} r/s
            </span>
            {ev.confidence != null && (
              <span className="mono" style={{ fontSize: 11, color: attack ? "#dc2626" : "#10b981", minWidth: 36, textAlign: "right", fontWeight: 600 }}>
                {ev.confidence}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────── Page ─────────────────────── */

export default function Dashboard() {
  const { liveEvents } = useSocket();
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [timeline, setTimeline] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, timelineRes] = await Promise.all([
        api.get("/stats"),
        api.get("/timeline"),
      ]);
      setStats(statsRes.data);
      setTimeline(timelineRes.data || []);
    } catch (err) {
      console.error("Dashboard fetch xato:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 15_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 60 }}>
        Júklenbekte…
      </div>
    );
  }

  const maxTypeCount = stats?.by_type ? Math.max(...Object.values(stats.by_type), 1) : 1;
  const maxTimeline  = timeline.length
    ? Math.max(...timeline.map((t) => (t.ATTACK || 0) + (t.NORMAL || 0)), 1)
    : 1;

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Monitoring Dashboard</h1>
          <p style={styles.subtitle}>
            Real-waqıt tarmaq trafigi tahlili — gibrid (Rule + ML XGBoost) anıqlaw tizimi
          </p>
        </div>
        <div style={styles.livePill}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#10b981", boxShadow: "0 0 0 3px #d1fae5",
            animation: "pulse 2s infinite",
          }} />
          Live · {new Date().toLocaleTimeString("uz-UZ").slice(0, 5)}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard
          label="JÁMI SORAWLAR"
          value={(stats?.total || 0).toLocaleString()}
          sub="Barlıq waqıt dawamında"
          icon={Activity}
          accent="#2563eb"
        />
        <StatCard
          label="HÚJIMLER"
          value={(stats?.attacks || 0).toLocaleString()}
          sub={`${stats?.attack_rate || 0}% attack rate`}
          icon={ShieldAlert}
          accent="#dc2626"
          emphasis
        />
        <StatCard
          label="NORMAL"
          value={(stats?.normal || 0).toLocaleString()}
          sub="Ruxsat etilgen trafik"
          icon={ShieldCheck}
          accent="#10b981"
        />
        <StatCard
          label="BELSENDI BLACKLIST"
          value={(stats?.active_blacklist || 0).toLocaleString()}
          sub={`${stats?.tracked_attackers || 0} IP baqlanıp atır`}
          icon={Zap}
          accent="#d97706"
        />
      </div>

      {/* Mid row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Attack types */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart2 size={14} color="#2563eb" />
              <span style={styles.panelTitle}>Hújim túrleri bóliniwi</span>
            </div>
            <span style={styles.panelMeta}>Top 8</span>
          </div>
          {stats?.by_type && Object.entries(stats.by_type).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(stats.by_type)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([type, count]) => {
                  const c = getAttackColor(type);
                  return (
                    <div key={type}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%", background: c.dot,
                        }} />
                        <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 600 }}>{type}</span>
                      </div>
                      <Bar value={count} max={maxTypeCount} color={c.dot} />
                    </div>
                  );
                })}
            </div>
          ) : (
            <div style={styles.emptyInline}>Hújim maǵlıwmatı joq</div>
          )}
        </div>

        {/* Timeline */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={14} color="#2563eb" />
              <span style={styles.panelTitle}>24 saatlıq waqıt sızıǵı</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={styles.legend}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#dc2626" }} />
                <span>Hújim</span>
              </div>
              <div style={styles.legend}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#10b981" }} />
                <span>Normal</span>
              </div>
            </div>
          </div>
          {timeline.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 200 }}>
              {timeline.slice(-24).map((t, i) => {
                const total  = (t.ATTACK || 0) + (t.NORMAL || 0);
                const hPct   = (total / maxTimeline) * 100;
                const atkPct = total > 0 ? (t.ATTACK / total) * 100 : 0;
                return (
                  <div key={i} title={`${t.hour}: ${t.ATTACK || 0} hujum / ${t.NORMAL || 0} normal`}
                    style={{ flex: 1, display: "flex", flexDirection: "column-reverse", alignItems: "stretch", height: "100%" }}>
                    <div style={{
                      height: `${Math.max(hPct, 2)}%`,
                      borderRadius: 3,
                      overflow: "hidden",
                      display: "flex", flexDirection: "column-reverse",
                      background: "#f1f5f9",
                      transition: "height .4s ease",
                    }}>
                      <div style={{ height: `${100 - atkPct}%`, background: "#10b981", opacity: 0.85 }} />
                      <div style={{ height: `${atkPct}%`, background: "#dc2626" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyInline}>Waqıt sızıǵı maǵlıwmatı joq</div>
          )}
          {timeline.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "#94a3b8" }} className="mono">
              <span>{timeline.slice(-24)[0]?.hour || ""}</span>
              <span>{timeline.slice(-24)[timeline.slice(-24).length - 1]?.hour || ""}</span>
            </div>
          )}
        </div>
      </div>

      {/* Live feed */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={14} color="#2563eb" />
            <span style={styles.panelTitle}>Real-waqıt waqıyaları</span>
          </div>
          <span style={styles.livePill}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#10b981", animation: "pulse 2s infinite",
            }} />
            LIVE · {liveEvents.length}
          </span>
        </div>
        <LiveFeed events={liveEvents} />
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 14 }}>
        <div style={styles.miniStat}>
          <div style={styles.miniHeader}>
            <span style={styles.miniLabel}>ORTASHA ISENIM</span>
            <TrendingUp size={13} color="#2563eb" />
          </div>
          <div style={{ ...styles.miniValue, color: "#2563eb" }}>{stats?.avg_confidence || 0}%</div>
          <div style={styles.miniSub}>ML + Rule kombinatsiyası</div>
        </div>
        <div style={styles.miniStat}>
          <div style={styles.miniHeader}>
            <span style={styles.miniLabel}>AQIRǴI 1 SAATTIǴI HÚJIMLER</span>
            <ArrowUpRight size={13} color="#dc2626" />
          </div>
          <div style={{ ...styles.miniValue, color: "#dc2626" }}>{stats?.recent_attacks_1h || 0}</div>
          <div style={styles.miniSub}>Aqırǵı 60 minut ishinde</div>
        </div>
        <div style={styles.miniStat}>
          <div style={styles.miniHeader}>
            <span style={styles.miniLabel}>BAQLANIWDAǴI IP</span>
            <Activity size={13} color="#d97706" />
          </div>
          <div style={{ ...styles.miniValue, color: "#d97706" }}>{stats?.tracked_attackers || 0}</div>
          <div style={styles.miniSub}>Este saqlanıp atır</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Styles ─────────────────────── */

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  h1: {
    fontSize: 22, fontWeight: 700, color: "#0f172a",
    letterSpacing: "-0.02em", marginBottom: 5,
  },
  subtitle: { fontSize: 13, color: "#64748b" },
  livePill: {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "5px 11px", borderRadius: 999,
    background: "#ecfdf5", border: "1px solid #a7f3d0",
    fontSize: 11, color: "#047857", fontWeight: 600,
    letterSpacing: "0.04em",
  },

  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e9f0",
    borderRadius: 12,
    padding: "16px 18px",
    boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
  },
  statLabel: {
    fontSize: 10.5, color: "#94a3b8",
    letterSpacing: "0.12em", fontWeight: 700,
  },
  statValue: { fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" },
  statSub:   { fontSize: 11.5, color: "#94a3b8", marginTop: 10 },

  panel: {
    background: "#ffffff",
    border: "1px solid #e5e9f0",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
  },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 18,
  },
  panelTitle: { fontSize: 13, color: "#0f172a", fontWeight: 600 },
  panelMeta:  { fontSize: 10.5, color: "#94a3b8", letterSpacing: "0.08em", fontWeight: 600 },

  legend: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 11, color: "#64748b",
  },

  empty: {
    textAlign: "center", color: "#94a3b8", fontSize: 12.5,
    padding: "44px 0",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  emptyInline: {
    fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "30px 0",
  },

  miniStat: {
    background: "#ffffff",
    border: "1px solid #e5e9f0",
    borderRadius: 12,
    padding: "16px 18px",
  },
  miniHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 10,
  },
  miniLabel: {
    fontSize: 10.5, color: "#94a3b8",
    letterSpacing: "0.12em", fontWeight: 700,
  },
  miniValue: { fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  miniSub:   { fontSize: 11, color: "#94a3b8", marginTop: 6 },
};
