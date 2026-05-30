const express     = require("express");
const { Op, fn, col, literal } = require("sequelize");
const sequelize   = require("../db");
const requireAuth = require("../middleware/auth");
const NetworkLog  = require("../models/NetworkLog");
const config      = require("../config");
const mlBridge    = require("../services/mlBridge");

const router = express.Router();

// GET /api/health
router.get("/health", async (req, res) => {
  const { ipTimestamps } = require("../services/slidingWindow");
  return res.json({
    status:       "ok",
    model_loaded: mlBridge.ready,
    tracked_ips:  ipTimestamps.size,
    version:      "pro-node",
    capture_mode: "http",
    db_type:      config.IS_POSTGRES ? "postgresql" : "sqlite",
  });
});

// GET /api/stats
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const total   = await NetworkLog.count();
    const attacks = await NetworkLog.count({ where: { status: "ATTACK" } });

    const byTypeRows = await NetworkLog.findAll({
      attributes: ["attack_type", [fn("COUNT", col("id")), "cnt"]],
      where:      { status: "ATTACK" },
      group:      ["attack_type"],
      raw:        true,
    });
    const byType = {};
    for (const row of byTypeRows) byType[row.attack_type] = parseInt(row.cnt);

    const avgRow = await NetworkLog.findOne({
      attributes: [[fn("AVG", col("confidence")), "avg"]],
      raw: true,
    });
    const avgConf = parseFloat(avgRow?.avg || 0);

    const oneHourAgo   = new Date(Date.now() - 3600 * 1000);
    const recentAttacks = await NetworkLog.count({
      where: { status: "ATTACK", timestamp: { [Op.gte]: oneHourAgo } },
    });

    const { getBlockedIps } = require("../services/ipsEngine");
    const blockedIpsList = getBlockedIps();
    const activeBlacklist = blockedIpsList.length;

    return res.json({
      total,
      attacks,
      normal:              total - attacks,
      attack_rate:         total ? Math.round((attacks / total) * 1000) / 10 : 0,
      by_type:             byType,
      avg_confidence:      Math.round(avgConf * 1000) / 10,
      tracked_attackers:   require("../services/slidingWindow").ipTimestamps.size,
      recent_attacks_1h:   recentAttacks,
      active_blacklist:    activeBlacklist,
    });
  } catch (err) {
    console.error("[Stats] Xato:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/timeline
router.get("/timeline", requireAuth, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000);

    let hourExpr;
    if (config.IS_POSTGRES) {
      hourExpr = literal(`date_trunc('hour', "timestamp")`);
    } else {
      hourExpr = fn("strftime", "%Y-%m-%d %H:00:00", col("timestamp"));
    }

    const rows = await NetworkLog.findAll({
      attributes: [
        [hourExpr, "hour"],
        "status",
        [fn("COUNT", col("id")), "count"],
      ],
      where:   { timestamp: { [Op.gte]: since } },
      group:   [literal(config.IS_POSTGRES ? `date_trunc('hour', "timestamp"), "status"` : `strftime('%Y-%m-%d %H:00:00', "timestamp"), "status"`)],
      order:   [[literal(config.IS_POSTGRES ? `date_trunc('hour', "timestamp")` : `strftime('%Y-%m-%d %H:00:00', "timestamp")`), "ASC"]],
      raw:     true,
    });

    const timeline = {};
    for (const row of rows) {
      if (!row.hour) continue;
      const h = typeof row.hour === "string"
        ? row.hour.slice(11, 16)
        : new Date(row.hour).toISOString().slice(11, 16);

      if (!timeline[h]) timeline[h] = { hour: h, ATTACK: 0, NORMAL: 0 };
      timeline[h][row.status] = parseInt(row.count);
    }

    return res.json(Object.values(timeline));
  } catch (err) {
    console.error("[Timeline] Xato:", err.message);
    return res.json([]);
  }
});

// GET /api/ips/blocked — bloklangan IP-lar ro'yxatini olish
router.get("/ips/blocked", requireAuth, (req, res) => {
  const { getBlockedIps } = require("../services/ipsEngine");
  return res.json(getBlockedIps());
});

// POST /api/ips/block — IP-ni qo'lda bloklash
router.post("/ips/block", requireAuth, (req, res) => {
  if (!req.jwtUser?.is_admin) {
    return res.status(403).json({ error: "Ruxsat berilmegen (admin huqıqı talap etiledi)" });
  }
  const { ip, duration } = req.body || {};
  if (!ip || !ip.trim()) {
    return res.status(400).json({ error: "IP adres talap etiledi" });
  }

  const { blockIp } = require("../services/ipsEngine");
  const durationMs = parseInt(duration || "5") * 60 * 1000; // minutdan ms ga

  const ok = blockIp(ip.trim(), durationMs);
  if (!ok) {
    return res.status(400).json({ error: "Localhost yamasa arnawlı IP-lerdi bloklaw múmkin emes" });
  }

  console.log(`[IPS] IP qo'lda bloklandi: ${ip} (${duration} daqiqaga)`);
  return res.json({ message: `IP adres ${duration} minutqa tabıslı bloklandı` });
});

// POST /api/ips/unblock — IP-ni qo'ldan blokdan chiqarish
router.post("/ips/unblock", requireAuth, (req, res) => {
  if (!req.jwtUser?.is_admin) {
    return res.status(403).json({ error: "Ruxsat berilmegen (admin huqıqı talap etiledi)" });
  }
  const { ip } = req.body || {};
  if (!ip || !ip.trim()) {
    return res.status(400).json({ error: "IP adres talap etiledi" });
  }

  const { unblockIp } = require("../services/ipsEngine");
  const deleted = unblockIp(ip.trim());
  if (!deleted) {
    return res.status(404).json({ error: "IP adres bloklanǵanlar diziminde tabılmadı" });
  }

  console.log(`[IPS] IP blokdan chiqarildi: ${ip}`);
  return res.json({ message: "IP adres tabıslı bloktan shıǵarıldı" });
});

module.exports = router;
