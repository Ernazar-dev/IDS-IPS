import { useCallback, useEffect, useState } from "react";
import {
  RefreshCcw, ShieldAlert, ShieldCheck, Search, Download, Filter,
} from "lucide-react";
import { api } from "../hooks/useAuth";
import { getAttackColor } from "../config";

export default function History() {
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStat, setFilterStat] = useState("ALL");
  const [limit,      setLimit]      = useState(100);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit };
      if (filterStat !== "ALL") params.status      = filterStat;
      if (filterType !== "ALL") params.attack_type = filterType;
      const res = await api.get("/logs", { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || "Serverge ulanıp bolmadı");
    } finally {
      setLoading(false);
    }
  }, [limit, filterStat, filterType]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const allTypes = ["ALL", ...new Set(logs.map((l) => l.attack_type))];

  const filtered = logs.filter((l) => {
    const q = search.trim().toLowerCase();
    return (!q || l.ip.toLowerCase().includes(q) || l.attack_type.toLowerCase().includes(q));
  });

  const exportCSV = () => {
    const header = "ID,IP,Hújim túri,Req/s,Bytes/s,Confidence,Holat,Mode,Waqıt";
    const rows   = filtered.map((l) =>
      `${l.id},"${l.ip}",${l.attack_type},${l.req},${l.bytes_s},${l.confidence},${l.status},${l.capture_mode || "http"},${l.timestamp}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ids_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const attacks = filtered.filter((l) => l.status === "ATTACK").length;

  return (
    <div>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .h-input:focus    { border-color:#2563eb; box-shadow:0 0 0 3px #eff6ff; outline:none; }
        .h-btn:hover      { background:#f8fafc; border-color:#cbd5e1; }
        .h-btn-pri:hover  { background:#1d4ed8; }
        .h-row:hover      { background:#f8fafc; }
        select.h-input    { appearance:none; -webkit-appearance:none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat:no-repeat; background-position:right 10px center; background-size:14px; padding-right:30px; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Log tariyxı</h1>
          <p style={styles.subtitle}>
            Jámi <span style={{ fontWeight: 600, color: "#0f172a" }}>{total.toLocaleString()}</span> jazba ·
            tahlil nátijeleri arxivi
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchLogs} className="h-btn" style={styles.btnSecondary}>
            <RefreshCcw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Jańalaw
          </button>
          <button onClick={exportCSV} className="h-btn-pri" style={styles.btnPrimary}>
            <Download size={13} />
            CSV eksport
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        <SummaryCard label="SÚZILGEN"  value={filtered.length}           accent="#2563eb" />
        <SummaryCard label="HÚJIMLER"     value={attacks}                   accent="#dc2626" />
        <SummaryCard label="NORMAL"       value={filtered.length - attacks} accent="#10b981" />
      </div>

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="IP yamasa hújim túri boyınsha izlew…"
            className="h-input"
            style={{ ...styles.input, paddingLeft: 36, width: "100%" }}
          />
        </div>

        <div style={styles.filterGroup}>
          <Filter size={13} color="#94a3b8" />
          <span style={styles.filterLabel}>Túr</span>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-input" style={styles.select}>
            {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Jaǵdayı</span>
          <select value={filterStat} onChange={(e) => setFilterStat(e.target.value)} className="h-input" style={styles.select}>
            <option value="ALL">Barlıǵı</option>
            <option value="ATTACK">ATTACK</option>
            <option value="NORMAL">NORMAL</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Limit</span>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="h-input" style={styles.select}>
            {[50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.error}>
          <span style={styles.errorDot} />
          {error}
        </div>
      )}

      {/* Table */}
      <div style={styles.tableWrap}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["#", "IP adres", "Hújim túri", "Req/s", "Bytes/s", "Isenim", "Jaǵdayı", "Mode", "Waqıt"].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const c       = getAttackColor(log.attack_type);
                const attack  = log.status === "ATTACK";
                return (
                  <tr key={log.id} className="h-row" style={styles.tr}>
                    <td className="mono" style={{ ...styles.td, color: "#94a3b8", fontSize: 11 }}>{log.id}</td>
                    <td className="mono" style={{ ...styles.td, color: "#0f172a", fontWeight: 500 }}>{log.ip}</td>
                    <td style={styles.td}>
                      <span style={{
                        background: c.bg, border: `1px solid ${c.border}`,
                        color: c.text, borderRadius: 6,
                        padding: "3px 9px", fontSize: 11, fontWeight: 600,
                        display: "inline-flex", alignItems: "center", gap: 6,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />
                        {log.attack_type}
                      </span>
                    </td>
                    <td className="mono" style={{ ...styles.td, color: "#475569" }}>{log.req}</td>
                    <td className="mono" style={{ ...styles.td, color: "#475569" }}>
                      {(log.bytes_s / 1000).toFixed(1)}K
                    </td>
                    <td className="mono" style={{ ...styles.td, color: c.text, fontWeight: 600 }}>{log.confidence}%</td>
                    <td style={styles.td}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        color: attack ? "#b91c1c" : "#047857",
                        background: attack ? "#fef2f2" : "#ecfdf5",
                        border: `1px solid ${attack ? "#fecaca" : "#a7f3d0"}`,
                        borderRadius: 6, padding: "3px 9px",
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {attack ? <ShieldAlert size={11} /> : <ShieldCheck size={11} />}
                        {log.status}
                      </span>
                    </td>
                    <td className="mono" style={{ ...styles.td, color: "#94a3b8", fontSize: 11 }}>
                      {log.capture_mode || "http"}
                    </td>
                    <td className="mono" style={{ ...styles.td, color: "#64748b", whiteSpace: "nowrap", fontSize: 11.5 }}>
                      {log.time}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "50px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "#f8fafc", border: "1px solid #e5e9f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 10px",
                    }}>
                      <Search size={15} color="#cbd5e1" />
                    </div>
                    Jazba tabılmadı
                    <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>
                      Súzgişlerdi ózgertip qaytadan urınıp kóriń
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && (
          <div style={{ padding: "22px 0", textAlign: "center", color: "#94a3b8", fontSize: 12.5 }}>
            Júklenbekte…
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e5e9f0",
      borderRadius: 12, padding: "14px 18px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: 10.5, color: "#94a3b8", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: accent, letterSpacing: "-0.02em", lineHeight: 1 }}>
          {value.toLocaleString()}
        </div>
      </div>
      <div style={{
        width: 6, height: 36, borderRadius: 3,
        background: accent, opacity: 0.85,
      }} />
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  h1: { fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: 5 },
  subtitle: { fontSize: 13, color: "#64748b" },

  btnSecondary: {
    display: "flex", alignItems: "center", gap: 7,
    background: "#ffffff", border: "1px solid #e2e8f0",
    borderRadius: 8, padding: "8px 14px",
    color: "#475569", fontSize: 12.5, fontWeight: 600,
    fontFamily: "inherit",
    transition: "all .15s",
  },
  btnPrimary: {
    display: "flex", alignItems: "center", gap: 7,
    background: "#2563eb", border: "1px solid #2563eb",
    borderRadius: 8, padding: "8px 14px",
    color: "#ffffff", fontSize: 12.5, fontWeight: 600,
    fontFamily: "inherit",
    transition: "all .15s",
  },

  filterBar: {
    display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap",
    background: "#ffffff",
    border: "1px solid #e5e9f0",
    borderRadius: 10, padding: 12,
  },
  filterGroup: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "0 2px",
  },
  filterLabel: {
    fontSize: 11, color: "#94a3b8",
    letterSpacing: "0.08em", fontWeight: 600,
  },
  input: {
    background: "#ffffff", border: "1px solid #e2e8f0",
    borderRadius: 8, padding: "9px 12px",
    color: "#0f172a", fontSize: 12.5,
    fontFamily: "inherit",
    outline: "none",
    transition: "all .15s",
  },
  select: {
    background: "#ffffff", border: "1px solid #e2e8f0",
    borderRadius: 8, padding: "8px 30px 8px 12px",
    color: "#0f172a", fontSize: 12.5,
    fontFamily: "inherit",
    outline: "none",
    minWidth: 110,
    cursor: "pointer",
  },

  error: {
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 8, padding: "10px 14px",
    color: "#b91c1c", fontSize: 12.5,
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 14,
  },
  errorDot: { width: 6, height: 6, borderRadius: "50%", background: "#dc2626" },

  tableWrap: {
    background: "#ffffff",
    border: "1px solid #e5e9f0",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
  },
  th: {
    padding: "11px 14px", textAlign: "left",
    borderBottom: "1px solid #e5e9f0",
    color: "#94a3b8", fontSize: 10.5, letterSpacing: "0.1em",
    fontWeight: 700, textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f1f5f9", transition: "background .12s" },
  td: { padding: "10px 14px", verticalAlign: "middle" },
};
