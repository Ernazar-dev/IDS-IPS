const { spawn } = require("child_process");
const path      = require("path");
const config    = require("../config");

class MLBridge {
  constructor() {
    this.proc      = null;
    this.ready     = false;
    this.classes   = [];
    this.pending   = new Map(); // id → { resolve, reject, timer }
    this.nextId    = 0;
    this.buffer    = "";
  }

  start() {
    return new Promise((resolve, reject) => {
      let startTimer = null;
      const scriptPath = path.join(__dirname, "../../ml_infer.py");
      const env = {
        ...process.env,
        MODEL_PATH:   config.MODEL_PATH,
        SCALER_PATH:  config.SCALER_PATH,
        ENCODER_PATH: config.ENCODER_PATH,
        PYTHONUNBUFFERED: "1",
      };

      this.proc = spawn(config.PYTHON_PATH, [scriptPath], { env });

      this.proc.stdout.on("data", (chunk) => {
        this.buffer += chunk.toString();
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop(); // Noto'liq satrni saqlab qolish
        for (const line of lines) this._handleLine(line.trim());
      });

      this.proc.stderr.on("data", (d) => {
        const txt = d.toString().trim();
        if (txt) console.error("[ML]", txt);
      });

      this.proc.on("close", (code) => {
        console.error("[ML] Process yopildi, kod:", code);
        const wasReady = this.ready;
        this.ready = false;
        for (const { reject: rej } of this.pending.values()) {
          rej(new Error("ML process yopildi"));
        }
        this.pending.clear();
        if (!wasReady) {
          if (startTimer) clearTimeout(startTimer);
          reject(new Error(`ML bridge yuklana olmadi (process close code: ${code})`));
        }
      });

      this.proc.on("error", (err) => {
        console.error("[ML] Spawn xatosi:", err.message);
        if (!this.ready) reject(err);
      });

      // Tayyor bo'lishini kutish (max 60 soniya)
      startTimer = setTimeout(() => {
        if (!this.ready) reject(new Error("ML bridge 60s da yuklanmadi"));
      }, 60000);

      this._onReady = (info) => {
        if (startTimer) clearTimeout(startTimer);
        this.ready   = true;
        this.classes = info.classes || [];
        console.log("[ML] Tayyor. Sinflar:", this.classes.join(", "));
        console.log("[ML] Demo:", info.demo || "");
        resolve();
      };
    });
  }

  _handleLine(line) {
    if (!line) return;
    let msg;
    try { msg = JSON.parse(line); }
    catch { return; }

    if (msg.error && !msg._id) {
      console.error("[ML] Xato:", msg.error);
      return;
    }

    if (msg.ready) {
      if (this._onReady) { this._onReady(msg); this._onReady = null; }
      return;
    }

    const id = msg._id;
    const cb = this.pending.get(id);
    if (!cb) return;
    clearTimeout(cb.timer);
    this.pending.delete(id);

    if (msg.error) cb.reject(new Error(msg.error));
    else cb.resolve(msg);
  }

  _send(data) {
    return new Promise((resolve, reject) => {
      if (!this.ready || !this.proc) {
        return reject(new Error("ML bridge tayyor emas"));
      }
      const id    = ++this.nextId;
      data._id    = id;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("ML so'rov muddati o'tdi (10s)"));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      this.proc.stdin.write(JSON.stringify(data) + "\n");
    });
  }

  analyze(features) {
    return this._send({ type: "analyze", features });
  }

  demo(label, fallbackFeatures) {
    return this._send({ type: "demo", label, fallback_features: fallbackFeatures || new Array(10).fill(0) });
  }
}

module.exports = new MLBridge();
