const { Sequelize } = require("sequelize");
const config = require("./config");

// Helper function to safely escape URL components in database connection string (URI)
function safeDatabaseUri(uri) {
  if (!uri || typeof uri !== "string" || !uri.startsWith("postgres")) return uri;
  try {
    const protoIndex = uri.indexOf("://");
    if (protoIndex === -1) return uri;
    const protocol = uri.substring(0, protoIndex + 3);
    const remainder = uri.substring(protoIndex + 3);

    const lastAt = remainder.lastIndexOf("@");
    if (lastAt === -1) return uri;
    const creds = remainder.substring(0, lastAt);
    const hostDb = remainder.substring(lastAt);

    const colonIndex = creds.indexOf(":");
    if (colonIndex === -1) return uri;
    
    const username = creds.substring(0, colonIndex);
    const password = creds.substring(colonIndex + 1);

    // URL-encode the password to escape special characters like slashes / or @
    const encodedPassword = encodeURIComponent(password);
    return `${protocol}${username}:${encodedPassword}${hostDb}`;
  } catch (e) {
    return uri;
  }
}

const dbUri = safeDatabaseUri(config.DATABASE_URI);

const opts = {
  dialect: config.IS_POSTGRES ? "postgres" : "sqlite",
  logging: false,
  pool:    { max: 10, min: 0, acquire: 30000, idle: 10000 },
};

if (!config.IS_POSTGRES) {
  opts.storage = dbUri.replace("sqlite:", "");
  delete opts.pool;
} else if (config.DB_SSL) {
  opts.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
}

const sequelize = new Sequelize(dbUri, opts);

module.exports = sequelize;
