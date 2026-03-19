const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CheckResult = sequelize.define(
  "CheckResult",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deviceCheckId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "device_checks",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("online", "offline", "warning", "unknown"),
      allowNull: false,
      defaultValue: "unknown",
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    packetLoss: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    resolvedValue: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    checkedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "check_results",
    timestamps: true,
    indexes: [
      { fields: ["deviceCheckId"] },
      { fields: ["status"] },
      { fields: ["checkedAt"] },
    ],
  }
);

module.exports = CheckResult;
