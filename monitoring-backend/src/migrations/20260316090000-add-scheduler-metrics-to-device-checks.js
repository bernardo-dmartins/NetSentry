"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("device_checks", "nextRunAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("device_checks", "consecutiveFailures", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("device_checks", "totalRuns", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("device_checks", "successfulRuns", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addIndex("device_checks", ["isActive", "nextRunAt"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("device_checks", ["isActive", "nextRunAt"]);
    await queryInterface.removeColumn("device_checks", "successfulRuns");
    await queryInterface.removeColumn("device_checks", "totalRuns");
    await queryInterface.removeColumn("device_checks", "consecutiveFailures");
    await queryInterface.removeColumn("device_checks", "nextRunAt");
  },
};
