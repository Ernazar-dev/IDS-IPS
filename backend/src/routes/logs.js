const express     = require("express");
const { Op }      = require("sequelize");
const requireAuth = require("../middleware/auth");
const NetworkLog  = require("../models/NetworkLog");

const router = express.Router();

// GET /api/logs
router.get("/", requireAuth, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || "50"), 500);
    const offset = parseInt(req.query.offset || "0");
    const status = req.query.status;
    const atype  = req.query.attack_type;

    const where = {};
    if (status) where.status      = status;
    if (atype)  where.attack_type = atype;

    const { count: total, rows: logs } = await NetworkLog.findAndCountAll({
      where,
      order:  [["timestamp", "DESC"]],
      limit,
      offset,
    });

    return res.json({
      logs:   logs.map((l) => l.toDict()),
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("[Logs] Xato:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
