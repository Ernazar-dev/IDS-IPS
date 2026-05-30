const config = require("../config");

// IP → timestamps [] (monotonic ms)
const ipTimestamps = new Map();

function getReqPerSec(ip) {
  const now    = Date.now();
  const cutoff = now - config.ANALYSIS_WINDOW_SEC * 1000;

  let dq = ipTimestamps.get(ip);
  if (!dq) {
    dq = [];
    ipTimestamps.set(ip, dq);
  }

  dq.push(now);

  // Eski so'rovlarni o'chirish
  let start = 0;
  while (start < dq.length && dq[start] < cutoff) start++;
  if (start > 0) dq.splice(0, start);

  const count = dq.length;
  if (count < config.MIN_REQUESTS) return null;

  const windowMs = now - dq[0];
  if (windowMs < 50) return null;

  return ((count - 1) / windowMs) * 1000; // req/s
}

function cleanupOldIps() {
  if (ipTimestamps.size <= config.MAX_IP_TRACKER) return 0;

  const overflow = ipTimestamps.size - config.MAX_IP_TRACKER;
  // Eng eski so'rovli IP larni o'chirish
  const sorted = [...ipTimestamps.entries()]
    .sort((a, b) => (b[1].at(-1) || 0) - (a[1].at(-1) || 0));

  let removed = 0;
  for (let i = sorted.length - 1; i >= sorted.length - overflow; i--) {
    ipTimestamps.delete(sorted[i][0]);
    removed++;
  }
  return removed;
}

module.exports = { getReqPerSec, cleanupOldIps, ipTimestamps };
