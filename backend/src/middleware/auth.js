const jwt    = require("jsonwebtoken");
const config = require("../config");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token talab etiladi" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET_KEY);
    if (payload.type !== "access") {
      return res.status(422).json({ error: "Token noto'g'ri (access token kerak)" });
    }
    req.jwtUser = payload;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token muddati o'tgan" });
    }
    return res.status(422).json({ error: "Token noto'g'ri" });
  }
}

module.exports = requireAuth;
