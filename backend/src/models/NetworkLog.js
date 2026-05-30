const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const NetworkLog = sequelize.define("NetworkLog", {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ip_address:   { type: DataTypes.STRING(50), allowNull: false },
  attack_type:  { type: DataTypes.STRING(30), allowNull: false },
  req_per_sec:  { type: DataTypes.FLOAT, allowNull: false },
  flow_byts_s:  { type: DataTypes.FLOAT, allowNull: false },
  status:       { type: DataTypes.STRING(20), allowNull: false },
  confidence:   { type: DataTypes.FLOAT, defaultValue: 0.0 },
  pattern:      { type: DataTypes.STRING(30) },
  capture_mode: { type: DataTypes.STRING(20), defaultValue: "http" },
  timestamp:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName:  "network_logs",
  timestamps: false,
  indexes: [
    { fields: ["timestamp"] },
    { fields: ["ip_address", "status"] },
    { fields: ["attack_type"] },
  ],
});

NetworkLog.prototype.toDict = function () {
  const ts = this.timestamp ? new Date(this.timestamp) : new Date();
  return {
    id:           this.id,
    ip:           this.ip_address,
    attack_type:  this.attack_type,
    status:       this.status,
    req:          Math.round(this.req_per_sec * 100) / 100,
    bytes_s:      Math.round(this.flow_byts_s),
    confidence:   Math.round(this.confidence * 1000) / 10,
    pattern:      this.pattern,
    capture_mode: this.capture_mode,
    time:         ts.toTimeString().slice(0, 8),
    timestamp:    ts.toISOString(),
  };
};

module.exports = NetworkLog;
