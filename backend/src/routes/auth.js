const express   = require("express");
const jwt       = require("jsonwebtoken");
const config    = require("../config");
const User      = require("../models/User");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function makeTokens(user) {
  const claims = { sub: String(user.id), username: user.username, is_admin: user.is_admin };
  const access  = jwt.sign({ ...claims, type: "access",  fresh: true  }, config.JWT_SECRET_KEY, { expiresIn: `${config.JWT_ACCESS_TOKEN_HOURS}h` });
  const refresh = jwt.sign({ ...claims, type: "refresh", fresh: false }, config.JWT_SECRET_KEY, { expiresIn: "7d" });
  return { access, refresh };
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username = "", password = "" } = req.body || {};
  if (!username.trim() || !password) {
    return res.status(400).json({ error: "Username hám parol talap etiledi" });
  }

  try {
    const user = await User.findOne({ where: { username: username.trim(), is_active: true } });
    if (!user || !user.checkPassword(password)) {
      console.warn("[Auth] Login muvaffaqiyatsiz:", username);
      return res.status(401).json({ error: "Username yamasa parol qáte" });
    }

    user.last_login = new Date();
    await user.save();

    const { access, refresh } = makeTokens(user);
    console.log("[Auth] Login muvaffaqiyatli:", username);
    return res.json({ access_token: access, refresh_token: refresh, user: user.toDict() });
  } catch (err) {
    console.error("[Auth] Login xatosi:", err.message);
    return res.status(500).json({ error: "Server qáteligi" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Refresh token talap etiledi" });
  }
  try {
    const payload = jwt.verify(header.slice(7), config.JWT_SECRET_KEY);
    if (payload.type !== "refresh") {
      return res.status(422).json({ error: "Refresh token talap etiledi" });
    }
    const user = await User.findByPk(parseInt(payload.sub));
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Paydalanıwshı tabılmadı" });
    }
    const access = jwt.sign(
      { sub: String(user.id), username: user.username, is_admin: user.is_admin, type: "access", fresh: false },
      config.JWT_SECRET_KEY,
      { expiresIn: `${config.JWT_ACCESS_TOKEN_HOURS}h` },
    );
    return res.json({ access_token: access });
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ error: "Refresh token múddeti ótken" });
    return res.status(422).json({ error: "Token qáte" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(parseInt(req.jwtUser.sub));
    if (!user) return res.status(404).json({ error: "Tabılmadı" });
    return res.json(user.toDict());
  } catch (err) {
    return res.status(500).json({ error: "Server qáteligi" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(parseInt(req.jwtUser.sub));
    if (!user) return res.status(404).json({ error: "Tabılmadı" });

    const { old_password = "", new_password = "" } = req.body || {};
    if (!user.checkPassword(old_password)) {
      return res.status(401).json({ error: "Házirgi parol qáte" });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: "Jańa parol keminde 8 belgiden ibarat bolıwı kerek" });
    }
    user.setPassword(new_password);
    await user.save();
    return res.json({ message: "Parol tabıslı ózgertildi" });
  } catch (err) {
    return res.status(500).json({ error: "Server qáteligi" });
  }
});

module.exports = router;
