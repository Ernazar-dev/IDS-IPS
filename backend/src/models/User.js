const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../db");

const User = sequelize.define("User", {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username:   { type: DataTypes.STRING(64),  unique: true, allowNull: false },
  email:      { type: DataTypes.STRING(128), unique: true, allowNull: false },
  password:   { type: DataTypes.STRING(256), allowNull: false },
  is_admin:   { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  is_active:  { type: DataTypes.BOOLEAN, defaultValue: true,  allowNull: false },
  last_login: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName:  "users",
  timestamps: false,
});

User.prototype.setPassword = function (plain) {
  this.password = bcrypt.hashSync(plain, 10);
};

User.prototype.checkPassword = function (plain) {
  return bcrypt.compareSync(plain, this.password);
};

User.prototype.toDict = function () {
  return {
    id:         this.id,
    username:   this.username,
    email:      this.email,
    is_admin:   this.is_admin,
    last_login: this.last_login ? this.last_login.toISOString() : null,
    created_at: this.created_at ? new Date(this.created_at).toISOString() : null,
  };
};

module.exports = User;
