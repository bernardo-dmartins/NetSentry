"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("check_results", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      deviceCheckId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "device_checks",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM("online", "offline", "warning", "unknown"),
        allowNull: false,
        defaultValue: "unknown",
      },
      responseTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      statusCode: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      packetLoss: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      resolvedValue: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      checkedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
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

    await queryInterface.addIndex("check_results", ["deviceCheckId"]);
    await queryInterface.addIndex("check_results", ["status"]);
    await queryInterface.addIndex("check_results", ["checkedAt"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("check_results");
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_check_results_status;"
    ).catch(() => {});
  },
};
