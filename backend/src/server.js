require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const config       = require("./config");
const sequelize    = require("./db");
const User         = require("./models/User");
const NetworkLog   = require("./models/NetworkLog");
const mlBridge     = require("./services/mlBridge");
const { cleanupOldIps } = require("./services/slidingWindow");
const { app, server } = require("./app");

async function createAdminUser() {
  try {
    const admin = await User.findOne({ where: { username: config.ADMIN_USERNAME } });
    if (!admin) {
      const newAdmin = User.build({
        username:   config.ADMIN_USERNAME,
        email:      config.ADMIN_EMAIL,
        is_admin:   true,
        created_at: new Date(),
      });
      newAdmin.setPassword(config.ADMIN_PASSWORD);
      await newAdmin.save();
      console.log("[DB] Admin paydalanıwshısı jaratıldı:", config.ADMIN_USERNAME);
    } else {
      let updated = false;
      if (!admin.password.startsWith("$2")) {
        admin.setPassword(config.ADMIN_PASSWORD);
        updated = true;
        console.log("[DB] Admin paroli bcrypt formatına ózgertildi");
      } else if (!admin.checkPassword(config.ADMIN_PASSWORD)) {
        admin.setPassword(config.ADMIN_PASSWORD);
        updated = true;
        console.log("[DB] Admin paroli ADMIN_PASSWORD muhit o'zgaruvchisi bilan sinxronlashtirildi");
      }

      if (updated) {
        await admin.save();
      }
    }
  } catch (err) {
    console.error("[DB] Admin jaratıwda qátelik:", err.message);
  }
}

async function start() {
  // 1. DB baylanısı hám kestelerdi jaratıw
  try {
    await sequelize.authenticate();
    console.log("[DB] Baylanıs tabıslı:", config.IS_POSTGRES ? "PostgreSQL" : "SQLite");
    await sequelize.sync({ alter: false });
    console.log("[DB] Kesteler tayar");
    await createAdminUser();
  } catch (err) {
    console.error("[DB] Qátelik:", err.message);
    process.exit(1);
  }

  // 2. ML Bridge (Python subprocess) baslaw
  console.log("[ML] ML bridge júklenbekte...");
  try {
    await mlBridge.start();
  } catch (err) {
    console.warn("[ML] ML bridge júklenbedi:", err.message);
    console.warn("[ML] Dáslep 'python model_train.py' baslań (backend/ papkasında)");
    console.warn("[ML] Server ML-siz islewdi dawam etedi — tek rule-based anıqlaw belsendi");
  }

  // 3. Periodic cleanup (hár 60 sekundta)
  setInterval(() => {
    const removed = cleanupOldIps();
    if (removed > 0) console.log(`[Cleanup] ${removed} eski IP tracker tazalandı`);
  }, 60 * 1000);

  // 4. HTTP server baslaw
  server.listen(config.PORT, "0.0.0.0", () => {
    console.log("=".repeat(62));
    console.log("IDS/IPS Pro (Node.js) jumısqa tústi");
    console.log(`  Port     : ${config.PORT}`);
    console.log(`  DB       : ${config.IS_POSTGRES ? "PostgreSQL" : "SQLite"}`);
    console.log(`  ML       : ${mlBridge.ready ? "XGBoost (" + mlBridge.classes.join(", ") + ")" : "júklenbegen"}`);
    console.log(`  Capture  : HTTP (synthetic features)`);
    console.log("=".repeat(62));
  });
}

// Graceful shutdown
process.on("SIGINT",  () => { console.log("\n[Server] Toqtatılmaqta..."); process.exit(0); });
process.on("SIGTERM", () => { console.log("\n[Server] Toqtatılmaqta..."); process.exit(0); });

start();
