require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const sequelize = require("./src/db");
const User = require("./src/models/User");
const NetworkLog = require("./src/models/NetworkLog");
const config = require("./src/config");

async function run() {
  try {
    console.log("[DB] Ma'lumotlar bazasın tazalaw baslandı...");
    await sequelize.authenticate();
    
    // Barcha jadvallarni o'chirib qaytadan yaratish (force: true)
    await sequelize.sync({ force: true });
    console.log("[DB] Kesteler tazalanıp qaytadan jaratıldı!");

    // Default admin foydalanuvchini yaratish
    const newAdmin = User.build({
      username:   config.ADMIN_USERNAME,
      email:      config.ADMIN_EMAIL,
      is_admin:   true,
      created_at: new Date(),
    });
    newAdmin.setPassword(config.ADMIN_PASSWORD);
    await newAdmin.save();
    console.log("[DB] Default admin jaratıldı:", config.ADMIN_USERNAME);
    
    console.log("[DB] Tabıslı juwmaqlandı!");
    process.exit(0);
  } catch (err) {
    console.error("[DB] Tazalawda qátelik júz berdi:", err.message);
    process.exit(1);
  }
}

run();
