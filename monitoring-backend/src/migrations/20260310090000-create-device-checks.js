"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("device_checks", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      deviceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "devices",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM(
          "ping",
          "tcp_port",
          "http",
          "ssl_certificate",
          "dns",
          "keyword_match"
        ),
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      intervalSeconds: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      timeoutMs: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5000,
      },
      config: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      expected: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      warningThreshold: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      criticalThreshold: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lastStatus: {
        type: Sequelize.ENUM("online", "offline", "warning", "unknown"),
        allowNull: false,
        defaultValue: "unknown",
      },
      lastError: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      lastResponseTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lastCheckedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("device_checks", ["deviceId"]);
    await queryInterface.addIndex("device_checks", ["type"]);
    await queryInterface.addIndex("device_checks", ["isActive"]);
    await queryInterface.addIndex("device_checks", ["lastStatus"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("device_checks");
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_device_checks_type;"
    ).catch(() => {});
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_device_checks_lastStatus;"
    ).catch(() => {});
  },
};
