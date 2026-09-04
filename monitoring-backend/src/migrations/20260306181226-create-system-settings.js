'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('system_settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      monitoring: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: JSON.stringify({
          interval: 30,
          timeout: 5,
          retries: 3,
          autoRestart: true
        })
      },
      notifications: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: JSON.stringify({
          emailAlerts: true,
          criticalOnly: false,
          pushNotifications: false,
          alertSound: true,
          quietHours: false,
          quietStart: '22:00',
          quietEnd: '08:00'
        })
      },
      dashboard: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: JSON.stringify({
          theme: 'dark',
          refreshRate: 10,
          showCharts: true,
          compactMode: false,
          animationsEnabled: true
        })
      },
      security: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: JSON.stringify({
          sessionTimeout: 60,
          requireStrongPassword: true,
          twoFactorAuth: false,
          loginNotifications: true
        })
      },
      dataRetention: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: JSON.stringify({
          keepLogs: 30,
          keepAlerts: 90,
          keepMetrics: 365,
          autoCleanup: true
        })
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('system_settings', ['userId'], {
      unique: true,
      name: 'system_settings_userId_unique'
    });

    console.log('Table system_settings created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('system_settings');
    console.log('Table system_settings dropped successfully');
  }
};