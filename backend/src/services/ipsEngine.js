/**
 * ipsEngine.js — IPS (Intrusion Prevention System) Bloklash Tizimi
 */

const blockedIps = new Map(); // IP -> blockEndTimestamp

/**
 * IP manzilni bloklash
 * @param {string} ip - IP manzil
 * @param {number} durationMs - Bloklash muddati (millisoniya)
 */
function blockIp(ip, durationMs = 5 * 60 * 1000) {
  if (
    ip === "demo.local" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip === "unknown"
  ) {
    return false;
  }
  blockedIps.set(ip, Date.now() + durationMs);
  return true;
}

/**
 * IP bloklanganligini tekshirish
 * @param {string} ip - IP manzil
 * @returns {boolean}
 */
function isIpBlocked(ip) {
  const blockEnd = blockedIps.get(ip);
  if (!blockEnd) return false;
  if (Date.now() > blockEnd) {
    blockedIps.delete(ip);
    return false;
  }
  return true;
}

/**
 * IP manzilni blokdan chiqarish
 * @param {string} ip - IP manzil
 */
function unblockIp(ip) {
  return blockedIps.delete(ip);
}

/**
 * Hozirgi bloklangan barcha IP manzillar ro'yxatini olish
 * @returns {Array<{ip: string, expires_in: number}>}
 */
function getBlockedIps() {
  const now = Date.now();
  const list = [];
  for (const [ip, end] of blockedIps.entries()) {
    if (now > end) {
      blockedIps.delete(ip);
    } else {
      list.push({
        ip,
        expires_in: Math.round((end - now) / 1000), // soniyada
      });
    }
  }
  return list;
}

module.exports = {
  blockIp,
  isIpBlocked,
  unblockIp,
  getBlockedIps,
};
