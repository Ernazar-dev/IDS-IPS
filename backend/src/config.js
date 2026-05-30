const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// backend-node/ papkasining o'zi (models shu yerda)
const NODE_DIR = path.resolve(__dirname, "..");

// Model yo'llari: nisbiy bo'lsa backend-node/ papkasidan hisoblab topiladi
function resolveModel(envKey, defaultRel) {
  const val = process.env[envKey] || defaultRel;
  return path.isAbsolute(val) ? val : path.join(NODE_DIR, val);
}

const USE_SQLITE   = process.env.USE_SQLITE === "true";
const PG_HOST      = process.env.DB_HOST     || "localhost";
const PG_PORT      = process.env.DB_PORT     || "5432";
const PG_DB        = process.env.DB_NAME     || "ids_ips_db";
const PG_USER      = process.env.DB_USER     || "postgres";
const PG_PASS      = process.env.DB_PASSWORD || "";
const DATABASE_URI = USE_SQLITE
  ? `sqlite:${path.join(NODE_DIR, "ids_database.db")}`
  : (process.env.DATABASE_URL || `postgres://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}`);

module.exports = {
  SECRET_KEY:   process.env.SECRET_KEY   || "dev-secret",
  PORT:         parseInt(process.env.PORT || "5000"),
  DEBUG:        process.env.DEBUG === "true",

  JWT_SECRET_KEY:         process.env.JWT_SECRET_KEY          || "dev-jwt-secret",
  JWT_ACCESS_TOKEN_HOURS: parseInt(process.env.JWT_ACCESS_TOKEN_HOURS || "8"),

  DATABASE_URI,
  IS_POSTGRES: !USE_SQLITE,
  DB_SSL: process.env.DB_SSL === "true" || (!!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost") && !process.env.DATABASE_URL.includes("127.0.0.1")),

  ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "ChangeMe123!",
  ADMIN_EMAIL:    process.env.ADMIN_EMAIL    || "admin@ids-ips.local",

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000").split(","),

  // Model fayllar backend-node/models/ papkasida
  MODEL_PATH:   resolveModel("MODEL_PATH",   "models/network_model.pkl"),
  SCALER_PATH:  resolveModel("SCALER_PATH",  "models/scaler.pkl"),
  ENCODER_PATH: resolveModel("ENCODER_PATH", "models/label_encoder.pkl"),

  PYTHON_PATH: process.env.PYTHON_PATH || "python",

  FEATURES: [
    "flow_duration", "tot_fwd_pkts", "tot_bwd_pkts",
    "fwd_pkt_len_mean", "bwd_pkt_len_mean",
    "flow_byts_s", "flow_pkts_s", "pkt_len_mean",
    "fwd_iat_mean", "fin_flag_cnt",
  ],

  ANALYSIS_WINDOW_SEC: parseFloat(process.env.ANALYSIS_WINDOW_SEC || "2"),
  MIN_REQUESTS:        parseInt(process.env.MIN_REQUESTS           || "3"),
  MIN_RPS_THRESHOLD:   parseFloat(process.env.MIN_RPS_THRESHOLD    || "5.0"),
  MAX_IP_TRACKER:      parseInt(process.env.MAX_IP_TRACKER         || "5000"),

  EXCLUDED_PATHS: [
    "/api/auth/login", "/api/auth/refresh",
    "/", "/api/health", "/api/test",
  ],
};
