import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity, FlaskConical, ScrollText, Shield, Settings,
  LogOut, Wifi, WifiOff, ChevronRight, AlertTriangle,
} from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../hooks/useAuth";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard",      icon: Activity     },
  { to: "/demo",      label: "Tizim sınaǵı",   icon: FlaskConical },
  { to: "/history",   label: "Log tariyxı",     icon: ScrollText   },
  { to: "/settings",  label: "Sazlawlar",     icon: Settings     },
];

export default function Layout() {
  const { connected, lastAlert } = useSocket();
  const { user, logout }         = useAuth();
  const navigate                 = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes slideIn{ from{transform:translateX(-6px);opacity:0} to{transform:none;opacity:1} }
        .nav-link        { position:relative; }
        .nav-link:hover  { background:#f8fafc; color:#0f172a; }
        .nav-link.active { background:#eff6ff; color:#1d4ed8; }
        .nav-link.active::before {
          content:""; position:absolute; left:-12px; top:8px; bottom:8px; width:3px;
          background:#2563eb; border-radius:0 3px 3px 0;
        }
        .logout-btn:hover { background:#fef2f2; color:#dc2626; }
      `}</style>

      <div style={S.shell}>
        {/* Sidebar */}
        <aside style={S.sidebar}>
          {/* Logo */}
          <div style={S.logoBlock}>
            <div style={S.logoIcon}>
              <Shield size={17} color="#ffffff" strokeWidth={2.2} />
            </div>
            <div>
              <div style={S.logoTitle}>IDS/IPS Pro</div>
              <div style={S.logoSub}>Network Security</div>
            </div>
          </div>

          {/* Section label */}
          <div style={S.sectionLabel}>NAVIGATSIYA</div>

          {/* Nav links */}
          <nav style={S.nav}>
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
                style={S.navLink}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
                    <span>{label}</span>
                    {isActive && (
                      <ChevronRight size={13} style={{ marginLeft: "auto", opacity: 0.6 }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom: connection + user */}
          <div style={S.sidebarBottom}>
            <div style={S.connBox}>
              {connected
                ? <Wifi size={13} color="#10b981" />
                : <WifiOff size={13} color="#dc2626" />}
              <span style={{ fontSize: 11.5, fontWeight: 600, color: connected ? "#047857" : "#b91c1c" }}>
                {connected ? "Baylanısqan" : "Úzilgen"}
              </span>
              {connected && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#10b981", marginLeft: "auto",
                  animation: "pulse 2s infinite",
                }} />
              )}
            </div>

            <div style={S.userBox}>
              <div style={S.avatar}>
                {user?.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.userName}>{user?.username || "—"}</div>
                <div style={S.userRole}>{user?.is_admin ? "Administrator" : "Paydalanıwshı"}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Shıǵıw"
                className="logout-btn"
                style={S.logoutBtn}
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={S.main}>
          {lastAlert && (
            <div style={S.alertBanner}>
              <div style={S.alertIcon}>
                <AlertTriangle size={15} color="#dc2626" strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.alertTitle}>
                  Jańa hújim anıqlandı · <span className="mono" style={{ color: "#0f172a" }}>{lastAlert.ip}</span>
                </div>
                <div style={S.alertMeta}>
                  {lastAlert.attack_type} · {lastAlert.confidence}% isenim · {lastAlert.time}
                </div>
              </div>
              <span style={S.alertDot} />
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </>
  );
}

const S = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "Manrope, system-ui, sans-serif",
  },

  sidebar: {
    width: 240,
    background: "#ffffff",
    borderRight: "1px solid #e5e9f0",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: 0, left: 0, bottom: 0,
    zIndex: 50,
  },

  logoBlock: {
    padding: "20px 20px 18px",
    display: "flex",
    alignItems: "center",
    gap: 11,
    borderBottom: "1px solid #f1f5f9",
  },
  logoIcon: {
    width: 36, height: 36,
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    borderRadius: 9,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
    flexShrink: 0,
  },
  logoTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" },
  logoSub:   { fontSize: 10, color: "#94a3b8", letterSpacing: "0.08em", marginTop: 2, textTransform: "uppercase" },

  sectionLabel: {
    fontSize: 10, color: "#94a3b8", letterSpacing: "0.12em",
    fontWeight: 700, padding: "18px 20px 10px",
  },

  nav: { padding: "0 12px", flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  navLink: {
    display: "flex", alignItems: "center", gap: 11,
    padding: "10px 12px", borderRadius: 8,
    color: "#475569", fontSize: 13, fontWeight: 500,
    transition: "all .15s",
  },

  sidebarBottom: { padding: "14px 12px 14px", borderTop: "1px solid #f1f5f9" },

  connBox: {
    display: "flex", alignItems: "center", gap: 9,
    padding: "9px 12px", borderRadius: 8,
    background: "#f8fafc",
    marginBottom: 10,
  },

  userBox: {
    padding: "10px 12px", borderRadius: 8,
    background: "#f8fafc",
    display: "flex", alignItems: "center", gap: 10,
  },
  avatar: {
    width: 30, height: 30, borderRadius: 8,
    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
  },
  userName: {
    fontSize: 12.5, fontWeight: 600, color: "#0f172a",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  userRole: { fontSize: 10.5, color: "#94a3b8", marginTop: 1 },
  logoutBtn: {
    background: "transparent", border: "none",
    color: "#94a3b8",
    display: "flex", padding: 6, borderRadius: 6,
    transition: "all .15s",
  },

  main: {
    marginLeft: 240,
    flex: 1,
    padding: "26px 32px",
    minHeight: "100vh",
    overflow: "auto",
  },

  alertBanner: {
    background: "#ffffff",
    border: "1px solid #fecaca",
    borderLeft: "3px solid #dc2626",
    borderRadius: 10,
    padding: "12px 14px",
    display: "flex", alignItems: "center", gap: 12,
    marginBottom: 22,
    animation: "slideIn .25s ease",
    boxShadow: "0 4px 12px rgba(220,38,38,0.06)",
  },
  alertIcon: {
    width: 30, height: 30, borderRadius: 8,
    background: "#fef2f2", border: "1px solid #fecaca",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  alertTitle: { fontSize: 13, color: "#b91c1c", fontWeight: 600 },
  alertMeta:  { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  alertDot: {
    width: 8, height: 8, borderRadius: "50%",
    background: "#dc2626", boxShadow: "0 0 0 4px #fee2e2",
    animation: "pulse 1.2s infinite",
    flexShrink: 0,
  },
};
