const config        = require("../config");
const { getReqPerSec } = require("../services/slidingWindow");
const { buildFeaturesFromHttp, ruleBasedDetect } = require("../services/ruleEngine");
const mlBridge      = require("../services/mlBridge");
const NetworkLog    = require("../models/NetworkLog");

// Socket.IO instance (app.js da to'ldiriladi)
let _io = null;
function setIo(io) { _io = io; }

async function saveLog(ip, attackType, reqS, flowBytsS, status, confidence, pattern, captureMode) {
  try {
    await NetworkLog.create({
      ip_address:   ip,
      attack_type:  attackType,
      req_per_sec:  reqS,
      flow_byts_s:  flowBytsS,
      status,
      confidence,
      pattern,
      capture_mode: captureMode,
    });
  } catch (err) {
    console.error("[IDS] DB yozish xatosi:", err.message);
  }
}

async function idsMiddleware(req, res, next) {
  if (config.EXCLUDED_PATHS.includes(req.path) || req.path.startsWith("/socket.io")) {
    return next();
  }
  if (req.method === "OPTIONS") return next();
  if (!req.path.startsWith("/api/")) return next();

  const ip = req.ip || req.connection.remoteAddress || "unknown";

  // IPS check: IP bloklanganba?
  const { isIpBlocked } = require("../services/ipsEngine");
  if (isIpBlocked(ip)) {
    return res.status(403).json({
      error: "Access Denied",
      message: "Qáwipsizlik sisteması (IPS) tárepinen IP adresińiz waqıtsha bloklanǵan.",
    });
  }

  next(); // So'rovni o'tkazib yuborish (non-blocking log to'plash uchun)

  // QADAM 1: Sliding window — req/s hisoblash
  const reqS = getReqPerSec(ip);
  if (reqS === null || reqS < config.MIN_RPS_THRESHOLD) return;

  // QADAM 2: Feature hisoblash (HTTP-based synthetic)
  const attackHint  = req.headers["x-attack-type"] || null;
  const pktSize     = Math.max(parseInt(req.headers["content-length"] || "0") || 200, 1);
  const [features, pattern] = buildFeaturesFromHttp(reqS, pktSize, attackHint);
  const flowBytsS   = features[5];

  // QADAM 3: Rule-based aniqlash
  const [ruleStatus, ruleAttack, ruleConf] = ruleBasedDetect(reqS, attackHint, pktSize);

  // QADAM 4: ML (XGBoost) tahlil
  let mlStatus = null, mlAttack = null, mlConf = null;
  if (mlBridge.ready) {
    try {
      const mlResult = await mlBridge.analyze(features);
      mlStatus = mlResult.status;
      mlAttack = mlResult.attack_type;
      mlConf   = mlResult.confidence;
    } catch (err) {
      console.warn("[IDS] ML xatosi:", err.message);
    }
  }

  // QADAM 5: Rule (55%) + ML (45%) weighted scoring
  const ruleAtk = ruleStatus === "ATTACK" ? ruleConf : 0.0;
  const mlAtk   = mlStatus   === "ATTACK" ? (mlConf || 0) : 0.0;
  const combined = ruleAtk * 0.55 + mlAtk * 0.45;

  let status, attackType, confidence, detMode;
  if (combined >= 0.28) {
    if (ruleStatus === "ATTACK" && mlStatus === "ATTACK") {
      detMode    = "RULE+ML";
      attackType = ruleAttack;
      confidence = Math.max(ruleConf, mlConf || 0);
    } else if (ruleStatus === "ATTACK") {
      [detMode, attackType, confidence] = ["RULE", ruleAttack, ruleConf];
    } else {
      [detMode, attackType, confidence] = ["ML", mlAttack, mlConf];
    }
    status = "ATTACK";
  } else {
    if (mlStatus === "NORMAL") {
      [detMode, attackType, confidence] = ["ML", mlAttack, mlConf];
    } else {
      [detMode, attackType, confidence] = ["RULE", ruleAttack, ruleConf];
    }
    status = "NORMAL";
  }

  console.log(
    `[IDS] IP: ${ip.padEnd(16)} | req/s: ${reqS.toFixed(1).padStart(5)}` +
    ` | [R] ${ruleAttack}→${ruleStatus} [ML] ${mlAttack || "N/A"}→${mlStatus || "N/A"}` +
    ` combined=${combined.toFixed(2)} | QAROR: ${status} ${attackType} (${(confidence * 100).toFixed(0)}%) [${detMode}]`
  );

  const logData = {
    ip,
    attack_type: attackType,
    status,
    req:         Math.round(reqS * 100) / 100,
    bytes_s:     Math.round(flowBytsS),
    time:        new Date().toTimeString().slice(0, 8),
    confidence:  Math.round(confidence * 1000) / 10,
    pattern,
  };

  // DB ga asinxron yozish
  saveLog(ip, attackType, reqS, flowBytsS, status, confidence, pattern, "http");

  // WebSocket orqali xabar yuborish
  if (_io) {
    try { _io.emit("new_alert", logData); }
    catch { /* ignore */ }
  }

  if (status === "ATTACK") {
    console.warn(`[IDS] HUJUM ANIQLANDI | IP: ${ip} | ${attackType} | ${(confidence * 100).toFixed(0)}%`);
    
    // IPS: IP manzilni vaqtincha bloklash (5 daqiqaga)
    const { blockIp } = require("../services/ipsEngine");
    if (blockIp(ip, 5 * 60 * 1000)) {
      console.log(`[IPS] IP vaqtincha bloklandi: ${ip} (5 daqiqa)`);
    }
  }
}

module.exports = { idsMiddleware, setIo };
