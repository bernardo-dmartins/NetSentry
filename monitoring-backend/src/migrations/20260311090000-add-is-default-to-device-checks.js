"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("device_checks", "isDefault", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addIndex("device_checks", ["isDefault"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("device_checks", ["isDefault"]);
    await queryInterface.removeColumn("device_checks", "isDefault");
  },
};
