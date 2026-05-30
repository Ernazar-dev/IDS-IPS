import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [username, setUser] = useState("");
  const [password, setPass] = useState("");
  const [showPass, setShow] = useState(false);
  const [loading,  setLoad] = useState(false);
  const [error,    setErr]  = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setErr("");
    setLoad(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErr(err.response?.data?.error || "Serverge ulanıp bolmadı");
    } finally {
      setLoad(false);
    }
  };

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        .login-input:focus { border-color:#2563eb !important; box-shadow:0 0 0 4px #eff6ff; }
        .login-btn:hover:not(:disabled){ background:#1d4ed8; }
        .login-btn:disabled{ background:#94a3b8; cursor:not-allowed; }
      `}</style>

      {/* Soft grid background */}
      <div style={S.grid} />
      <div style={S.gradient} />

      <div style={S.card}>
        {/* Logo */}
        <div style={S.logoRow}>
          <div style={S.logoIcon}>
            <Shield size={22} color="#ffffff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={S.logoTitle}>IDS / IPS Pro</div>
            <div style={S.logoSub}>Tarmaq qáwipsizlik tizimi</div>
          </div>
        </div>

        <div style={S.divider} />

        <h1 style={S.title}>Tizimge kiriw</h1>
        <p style={S.subtitle}>Dawam etiw ushın akkaunt maǵlıwmatlarıńızdı kiritiń</p>

        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.fieldWrap}>
            <label style={S.label}>Paydalanıwshı atı</label>
            <div style={S.inputWrap}>
              <User size={15} color="#94a3b8" style={S.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUser(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
                className="login-input"
                style={S.input}
              />
            </div>
          </div>

          <div style={S.fieldWrap}>
            <label style={S.label}>Parol</label>
            <div style={S.inputWrap}>
              <Lock size={15} color="#94a3b8" style={S.inputIcon} />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="login-input"
                style={{ ...S.input, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShow(!showPass)}
                style={S.eyeBtn}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={S.error}>
              <span style={S.errorDot} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="login-btn"
            style={S.btn}
          >
            {loading ? "Tekserilmekte…" : (
              <>
                Kiriw
                <ArrowRight size={15} strokeWidth={2.4} />
              </>
            )}
          </button>
        </form>
      </div>

      <div style={S.badge}>
        <span style={S.badgeDot} />
        Server belsendi
      </div>

      <div style={S.footer}>IDS/IPS Pro · v3.0 · Network Intrusion Detection</div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Manrope, system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
    padding: 24,
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(#eff6ff 1px, transparent 1px)," +
      "linear-gradient(90deg, #eff6ff 1px, transparent 1px)",
    backgroundSize: "44px 44px",
    maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)",
    WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)",
    pointerEvents: "none",
  },
  gradient: {
    position: "absolute",
    top: "-30%",
    right: "-20%",
    width: 520,
    height: 520,
    borderRadius: "50%",
    background: "radial-gradient(circle, #dbeafe, transparent 65%)",
    filter: "blur(40px)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    background: "#ffffff",
    border: "1px solid #e5e9f0",
    borderRadius: 18,
    padding: "36px 36px 28px",
    width: "100%",
    maxWidth: 420,
    animation: "fadeIn .4s ease",
    boxShadow: "0 18px 48px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  logoIcon: {
    width: 42,
    height: 42,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 14px rgba(37,99,235,0.28)",
  },
  logoTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" },
  logoSub:   { fontSize: 11, color: "#94a3b8", marginTop: 2, letterSpacing: "0.02em" },

  divider: { height: 1, background: "#f1f5f9", margin: "0 0 24px" },

  title:    { fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#64748b", marginBottom: 26 },

  form: { display: "flex", flexDirection: "column", gap: 16 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#475569", fontWeight: 600 },

  inputWrap: { position: "relative" },
  inputIcon: { position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  input: {
    width: "100%",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "12px 14px 12px 38px",
    color: "#0f172a",
    fontSize: 13.5,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color .15s, box-shadow .15s",
  },
  eyeBtn: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", color: "#94a3b8",
    display: "flex", padding: 6, borderRadius: 6,
  },

  error: {
    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
    padding: "10px 12px", color: "#b91c1c", fontSize: 12.5,
    display: "flex", alignItems: "center", gap: 8,
  },
  errorDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0,
  },

  btn: {
    background: "#2563eb",
    border: "none",
    borderRadius: 10,
    padding: "13px",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "inherit",
    letterSpacing: "0.01em",
    marginTop: 4,
    transition: "background .15s",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  },

  badge: {
    position: "fixed",
    bottom: 22,
    right: 24,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 11.5,
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: 7,
    boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
  },
  badgeDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#10b981",
    boxShadow: "0 0 0 3px #d1fae5",
    animation: "pulse 2.2s ease-in-out infinite",
  },

  footer: {
    position: "fixed",
    bottom: 22,
    left: 24,
    fontSize: 11,
    color: "#94a3b8",
    letterSpacing: "0.02em",
  },
};
