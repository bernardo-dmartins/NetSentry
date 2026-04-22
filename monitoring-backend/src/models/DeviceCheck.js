const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const DeviceCheck = sequelize.define(
  "DeviceCheck",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "devices",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 100],
      },
      comment: "Check name",
    },
    type: {
      type: DataTypes.ENUM(
        "ping",
        "packet_loss",
        "tcp_port",
        "http",
        "ssl_certificate",
        "dns",
        "keyword_match"
      ),
      allowNull: false,
      comment: "Check type",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    intervalSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      validate: {
        min: 10,
        max: 86400,
      },
    },
    timeoutMs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5000,
      validate: {
        min: 1000,
        max: 120000,
      },
    },
    config: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      comment: "Check-specific configuration",
    },
    expected: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      comment: "Expected values for validation",
    },
    warningThreshold: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    criticalThreshold: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lastStatus: {
      type: DataTypes.ENUM("online", "offline", "warning", "unknown"),
      allowNull: false,
      defaultValue: "unknown",
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastResponseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lastCheckedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    consecutiveFailures: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalRuns: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    successfulRuns: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "device_checks",
    timestamps: true,
    indexes: [
      { fields: ["deviceId"] },
      { fields: ["type"] },
      { fields: ["isActive"] },
      { fields: ["isDefault"] },
      { fields: ["lastStatus"] },
      { fields: ["isActive", "nextRunAt"] },
    ],
  }
);

DeviceCheck.prototype.updateLastResult = async function updateLastResult(result) {
  const updates = {
    lastStatus: result.status || "unknown",
    lastError: result.error || null,
    lastResponseTime: result.responseTime ?? null,
    lastCheckedAt: result.checkedAt || new Date(),
    totalRuns: this.totalRuns + 1,
  };

  if (result.status === "online") {
    updates.successfulRuns = this.successfulRuns + 1;
    updates.consecutiveFailures = 0;
  } else if (result.status === "offline") {
    updates.consecutiveFailures = this.consecutiveFailures + 1;
  }

  if (this.isActive) {
    updates.nextRunAt = new Date(Date.now() + this.intervalSeconds * 1000);
  }

  await this.update(updates);
  return this;
};

module.exports = DeviceCheck;
