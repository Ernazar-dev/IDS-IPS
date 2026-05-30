const { Sequelize } = require("sequelize");
const config = require("./config");

const opts = {
  dialect: config.IS_POSTGRES ? "postgres" : "sqlite",
  logging: false,
  pool:    { max: 10, min: 0, acquire: 30000, idle: 10000 },
};

if (!config.IS_POSTGRES) {
  opts.storage = config.DATABASE_URI.replace("sqlite:", "");
  delete opts.pool;
} else if (config.DB_SSL) {
  opts.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
}

const sequelize = new Sequelize(config.DATABASE_URI, opts);

module.exports = sequelize;
