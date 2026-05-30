/**
 * config.js — Frontend sozlamalari (markazlashtirilgan)
 */

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
export const API_URL    = `${SERVER_URL}/api`;
export const SOCKET_URL = SERVER_URL;

// LocalStorage kalitlar
export const TOKEN_KEY   = "ids_access_token";
export const REFRESH_KEY = "ids_refresh_token";
export const USER_KEY    = "ids_user";

/**
 * Hujum turlari uchun ranglar — minimal, oq-ko'k palitra.
 * Hujum turlari ko'k tonlardan, faqat status (ATTACK/NORMAL) qizil/yashil.
 */
export const ATTACK_COLORS = {
  BENIGN:      { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857", dot: "#10b981" },

  // Tarmoq hujumlari — ko'k tonlar
  SYN:         { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", dot: "#dc2626" },
  UDP:         { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#ea580c" },
  DNS:         { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#2563eb" },
  NTP:         { bg: "#eef2ff", border: "#c7d2fe", text: "#4338ca", dot: "#4f46e5" },
  LDAP:        { bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9", dot: "#7c3aed" },

  // Skanerlash / brute-force
  PORTSCAN:    { bg: "#fffbeb", border: "#fde68a", text: "#a16207", dot: "#ca8a04" },
  BRUTEFORCE:  { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d", dot: "#db2777" },
  BOTNET:      { bg: "#faf5ff", border: "#e9d5ff", text: "#7e22ce", dot: "#9333ea" },

  // Web hujumlar
  XSS:         { bg: "#fffbeb", border: "#fde68a", text: "#a16207", dot: "#d97706" },
  SQLINJ:      { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", dot: "#dc2626" },

  BLACKLISTED: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", dot: "#b91c1c" },
};

export const getAttackColor = (type) =>
  ATTACK_COLORS[type] || { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569", dot: "#64748b" };

export const DEFAULT_LOG_LIMIT = 100;
export const MAX_LOG_LIMIT     = 500;

export const SOCKET_CONFIG = {
  transports:           ["websocket"],
  reconnection:         true,
  reconnectionDelay:    1000,
  reconnectionAttempts: 10,
};
