import { useState, useEffect, useCallback } from "react";
import { Save, Server, Key, CheckCircle2, XCircle, User as UserIcon, ShieldAlert, Trash2, Zap } from "lucide-react";
import { api, useAuth } from "../hooks/useAuth";

export default function Settings() {
  const { user, isAdmin }      = useAuth();
  const [health,   setHealth]  = useState(null);
  const [loading,  setLoading] = useState(true);

  const [oldPass,  setOldPass] = useState("");
  const [newPass,  setNewPass] = useState("");
  const [confPass, setConf]    = useState("");
  const [passMsg,  setPassMsg] = useState({ text: "", type: "" });
  const [saving,   setSaving]  = useState(false);

  // IPS Bloklash stats
  const [blockedIps, setBlockedIps] = useState([]);
  const [blockIpInput, setBlockIpInput] = useState("");
  const [blockDuration, setBlockDuration] = useState("5");
  const [ipsLoading, setIpsLoading] = useState(false);
  const [ipsError, setIpsError] = useState("");
  const [ipsMsg, setIpsMsg] = useState("");

  const fetchBlockedIps = useCallback(async () => {
    try {
      const res = await api.get("/ips/blocked");
      setBlockedIps(res.data || []);
    } catch (err) {
      console.error("IPS fetch error:", err);
    }
  }, []);

  useEffect(() => {
    api.get("/health")
      .then((r) => setHealth(r.data))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));

    fetchBlockedIps();
    const interval = setInterval(fetchBlockedIps, 8000);
    return () => clearInterval(interval);
  }, [fetchBlockedIps]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPass !== confPass) {
      setPassMsg({ text: "Jańa paroller sáykes kelmeytir", type: "error" });
      return;
    }
    if (newPass.length < 8) {
      setPassMsg({ text: "Parol keminde 8 belgiden ibarat bolıwı kerek", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        old_password: oldPass,
        new_password: newPass,
      });
      setPassMsg({ text: "Parol tabıslı ózgertildi", type: "success" });
      setOldPass(""); setNewPass(""); setConf("");
    } catch (err) {
      setPassMsg({ text: err.response?.data?.error || "Qátelik júz berdi", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setPassMsg({ text: "", type: "" }), 4500);
    }
  };

  const handleManualBlock = async (e) => {
    e.preventDefault();
    if (!blockIpInput.trim()) return;
    setIpsLoading(true);
    setIpsError("");
    setIpsMsg("");
    try {
      const res = await api.post("/ips/block", {
        ip: blockIpInput.trim(),
        duration: blockDuration,
      });
      setIpsMsg(res.data?.message || "IP tabıslı bloklandı");
      setBlockIpInput("");
      fetchBlockedIps();
    } catch (err) {
      setIpsError(err.response?.data?.error || "Bloklawda qátelik júz berdi");
    } finally {
      setIpsLoading(false);
      setTimeout(() => { setIpsError(""); setIpsMsg(""); }, 4000);
    }
  };

  const handleUnblock = async (ip) => {
    try {
      const res = await api.post("/ips/unblock", { ip });
      setIpsMsg(res.data?.message || "IP bloktan shıǵarıldı");
      fetchBlockedIps();
      setTimeout(() => setIpsMsg(""), 4000);
    } catch (err) {
      setIpsError(err.response?.data?.error || "Bloktan shıǵarıwda qátelik júz berdi");
      setTimeout(() => setIpsError(""), 4000);
    }
  };

  return (
    <div>
      <style>{`
        .s-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px #eff6ff; outline:none; }
        .s-btn:hover:not(:disabled) { background:#1d4ed8; }
        .s-btn:disabled { background:#cbd5e1; cursor:not-allowed; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Sazlawlar</h1>
          <p style={styles.subtitle}>Sistema konfiguratsiyası hám paydalanıwshı qáwipsizligi</p>
        </div>
      </div>

      {/* Server status */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.iconBox}>
              <Server size={14} color="#2563eb" />
            </div>
            <div>
              <div style={styles.panelTitle}>Server jaǵdayı</div>
              <div style={styles.panelHint}>Backend hám ML model</div>
            </div>
          </div>
          {!loading && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11, fontWeight: 600,
              padding: "4px 10px", borderRadius: 999,
              background: health ? "#ecfdf5" : "#fef2f2",
              border: `1px solid ${health ? "#a7f3d0" : "#fecaca"}`,
              color: health ? "#047857" : "#b91c1c",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: health ? "#10b981" : "#dc2626",
              }} />
              {health ? "Belsendi" : "Úzilgen"}
            </span>
          )}
        </div>

        {loading ? (
          <div style={styles.loadingBox}>Júklenbekte…</div>
        ) : health ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label: "ML Model",   value: health.model_loaded ? "Júklengen" : "Júklenbegen", ok: health.model_loaded },
              { label: "DB turi",    value: health.db_type,      ok: true },
              { label: "Capture",    value: health.capture_mode, ok: true },
              { label: "Tracked IP", value: health.tracked_ips,  ok: true },
              { label: "Algoritm",   value: "XGBoost",           ok: true },
              { label: "Versiya",    value: health.version,      ok: true },
            ].map(({ label, value, ok }) => (
              <div key={label} style={styles.statBox}>
                <div style={styles.statLabel}>{label}</div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7,
                  fontSize: 13, fontWeight: 600,
                  color: ok ? "#0f172a" : "#dc2626",
                  marginTop: 6,
                }}>
                  {ok
                    ? <CheckCircle2 size={13} color="#10b981" />
                    : <XCircle size={13} color="#dc2626" />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {String(value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.errorInline}>Server menen baylanısıw múmkin bolmadı</div>
        )}
      </div>

      {/* Current user */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.iconBox}>
              <UserIcon size={14} color="#2563eb" />
            </div>
            <div>
              <div style={styles.panelTitle}>Házirgi paydalanıwshı</div>
              <div style={styles.panelHint}>Akkaunt maǵlıwmatları</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
          {[
            { label: "Username",       value: user?.username || "—" },
            { label: "Email",          value: user?.email || "—" },
            { label: "Rol",            value: user?.is_admin ? "Administrator" : "Paydalanıwshı" },
            { label: "Aqırǵı kiriw",  value: user?.last_login
                ? new Date(user.last_login).toLocaleString("uz-UZ")
                : "—" },
          ].map(({ label, value }) => (
            <div key={label} style={styles.statBox}>
              <div style={styles.statLabel}>{label}</div>
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, marginTop: 5 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IPS Blacklist Panel */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.iconBox}>
              <Zap size={14} color="#dc2626" />
            </div>
            <div>
              <div style={styles.panelTitle}>IPS Bloklaw Dizimi (IPS Prevention)</div>
              <div style={styles.panelHint}>Belsendi hújim etken yamasa qolda bloklanǵan IP adresler</div>
            </div>
          </div>
        </div>

        {ipsError && (
          <div style={{ ...styles.errorInline, marginBottom: 12 }}>{ipsError}</div>
        )}
        {ipsMsg && (
          <div style={{ ...styles.msg, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", marginBottom: 12 }}>
            <CheckCircle2 size={13} /> {ipsMsg}
          </div>
        )}

        {/* Block form (Only for admins) */}
        {isAdmin && (
          <form onSubmit={handleManualBlock} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 18, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.formLabel}>IP Adresti Bloklaw</label>
              <input
                type="text"
                value={blockIpInput}
                onChange={(e) => setBlockIpInput(e.target.value)}
                placeholder="mısalı: 192.168.1.100"
                required
                className="s-input"
                style={styles.input}
              />
            </div>
            <div style={{ width: 120 }}>
              <label style={styles.formLabel}>Múddeti</label>
              <select
                value={blockDuration}
                onChange={(e) => setBlockDuration(e.target.value)}
                className="s-input"
                style={{ ...styles.input, appearance: "none", backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px", paddingRight: 30 }}
              >
                <option value="1">1 minut</option>
                <option value="5">5 minut</option>
                <option value="15">15 minut</option>
                <option value="60">1 saat</option>
              </select>
            </div>
            <button type="submit" disabled={ipsLoading} className="s-btn" style={{ ...styles.saveBtn, background: "#dc2626", borderColor: "#dc2626", height: 38, padding: "0 18px" }}>
              Bloklaw
            </button>
          </form>
        )}

        {/* Blocked list */}
        <div>
          {blockedIps.length === 0 ? (
            <div style={{ ...styles.loadingBox, padding: "10px 0" }}>Bloklanǵan IP adresler joq.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {blockedIps.map((b) => (
                <div key={b.ip} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fdf2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ShieldAlert size={14} color="#dc2626" />
                    <span className="mono" style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>{b.ip}</span>
                    <span style={{ fontSize: 11, color: "#b91c1c" }}>
                      ({b.expires_in > 60 ? `${Math.ceil(b.expires_in / 60)} minut` : `${b.expires_in} sekund`} qaldı)
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleUnblock(b.ip)}
                      title="Bloktan shıǵarıw"
                      className="s-btn-unblock"
                      style={{ background: "transparent", border: "none", color: "#94a3b8", display: "flex", padding: 6, borderRadius: 6, cursor: "pointer", transition: "color 0.15s" }}
                      onMouseEnter={(e) => e.target.style.color = "#dc2626"}
                      onMouseLeave={(e) => e.target.style.color = "#94a3b8"}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password change */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.iconBox}>
              <Key size={14} color="#2563eb" />
            </div>
            <div>
              <div style={styles.panelTitle}>Paroldi ózgertiw</div>
              <div style={styles.panelHint}>Akkaunt qáwipsizligi</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePassword}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            {[
              { label: "Házirgi parol",  value: oldPass,  set: setOldPass },
              { label: "Jańa parol",  value: newPass,  set: setNewPass },
              { label: "Tastıyıqlaw",   value: confPass, set: setConf },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label style={styles.formLabel}>{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="s-input"
                  style={styles.input}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" disabled={saving} className="s-btn" style={styles.saveBtn}>
              <Save size={13} />
              {saving ? "Saqlanbaqta…" : "Paroldi saqlaw"}
            </button>
            <div style={styles.requirements}>
              <span style={styles.reqDot} /> Keminde 8 belgi
            </div>
          </div>

          {passMsg.text && (
            <div style={{
              ...styles.msg,
              background: passMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
              border:     `1px solid ${passMsg.type === "success" ? "#a7f3d0" : "#fecaca"}`,
              color:      passMsg.type === "success" ? "#047857" : "#b91c1c",
            }}>
              {passMsg.type === "success"
                ? <CheckCircle2 size={13} />
                : <XCircle size={13} />}
              {passMsg.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const styles = {
  header: { marginBottom: 22 },
  h1: { fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: 5 },
  subtitle: { fontSize: 13, color: "#64748b" },

  panel: {
    background: "#ffffff",
    border: "1px solid #e5e9f0",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
  },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, paddingBottom: 14,
    borderBottom: "1px solid #f1f5f9",
  },
  panelTitle: { fontSize: 14, color: "#0f172a", fontWeight: 600, letterSpacing: "-0.01em" },
  panelHint:  { fontSize: 11.5, color: "#94a3b8", marginTop: 2 },
  iconBox: {
    width: 32, height: 32, borderRadius: 8,
    background: "#eff6ff", border: "1px solid #bfdbfe",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  statBox: {
    background: "#f8fafc",
    border: "1px solid #e5e9f0",
    borderRadius: 8,
    padding: "11px 14px",
  },
  statLabel: {
    fontSize: 10.5, color: "#94a3b8",
    letterSpacing: "0.1em", fontWeight: 700,
  },
  loadingBox: { fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "20px 0" },
  errorInline: {
    fontSize: 12.5, color: "#b91c1c",
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 8, padding: "10px 14px",
  },

  formLabel: {
    fontSize: 11.5, color: "#475569",
    fontWeight: 600, marginBottom: 6, display: "block",
  },
  input: {
    width: "100%", background: "#ffffff",
    border: "1px solid #e2e8f0", borderRadius: 8,
    padding: "10px 12px", color: "#0f172a",
    fontSize: 13, fontFamily: "inherit",
    outline: "none",
    transition: "all .15s",
  },
  saveBtn: {
    display: "inline-flex", alignItems: "center", gap: 7,
    background: "#2563eb", border: "1px solid #2563eb",
    borderRadius: 8, padding: "10px 18px",
    color: "#fff", fontSize: 13, fontWeight: 700,
    fontFamily: "inherit",
    transition: "background .15s",
  },
  requirements: {
    fontSize: 11.5, color: "#94a3b8",
    display: "flex", alignItems: "center", gap: 6,
  },
  reqDot: { width: 4, height: 4, borderRadius: "50%", background: "#cbd5e1" },

  msg: {
    marginTop: 12, padding: "10px 14px",
    borderRadius: 8, fontSize: 12.5, fontWeight: 500,
    display: "flex", alignItems: "center", gap: 8,
  },
};
