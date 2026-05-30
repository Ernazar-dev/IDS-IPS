const express      = require("express");
const cors         = require("cors");
const { Server }   = require("socket.io");
const http         = require("http");
const config       = require("./config");
const { idsMiddleware, setIo: idsSetIo } = require("./middleware/ids");
const authRoutes   = require("./routes/auth");
const logsRoutes   = require("./routes/logs");
const statsRoutes  = require("./routes/stats");
const { router: demoRouter, setIo: demoSetIo } = require("./routes/demo");

const app    = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: { origin: config.ALLOWED_ORIGINS, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("[WS] Yangi ulanish:", socket.id);
  socket.on("disconnect", () => console.log("[WS] Ulanish uzildi:", socket.id));
});

// Socket instance ni middleware va route larga uzatish
idsSetIo(io);
demoSetIo(io);

// Core middleware
app.set("trust proxy", true);
app.use(cors({ origin: config.ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// IDS middleware (non-blocking, barcha so'rovlarda ishlaydi)
app.use(idsMiddleware);

// --- Root va umumiy yo'llar ---
app.get("/", (req, res) => res.json({
  message:      "IDS/IPS Pro islemekte",
  status:       "ok",
  version:      "pro-node",
  capture_mode: "http",
}));

app.get("/api/test",  (req, res) => res.json({ status: "ok", message: "Test sorawı qabıllandı" }));
app.post("/api/test", (req, res) => res.json({ status: "ok", message: "Test sorawı qabıllandı" }));

// --- API Routes ---
//  /api/auth/login, /api/auth/refresh, /api/auth/me, /api/auth/change-password
app.use("/api/auth", authRoutes);

//  /api/demo (POST)
app.use("/api/demo", demoRouter);

//  /api/logs (GET)
app.use("/api/logs", logsRoutes);

//  /api/health, /api/stats, /api/timeline
app.use("/api", statsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "Tabılmadı" }));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[Express] Xato:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Server qáteligi" });
});

module.exports = { app, server, io };
