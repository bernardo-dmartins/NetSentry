'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      deviceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Devices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      checkId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'device_checks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      type: {
        type: Sequelize.ENUM('alert', 'recovery', 'warning', 'info', 'system', 'test'),
        allowNull: false,
        defaultValue: 'info'
      },
      severity: {
        type: Sequelize.ENUM('critical', 'warning', 'info'),
        allowNull: false,
        defaultValue: 'info'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      deviceName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
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

    // Criar índices
    await queryInterface.addIndex('notifications', ['userId', 'read']);
    await queryInterface.addIndex('notifications', ['userId', 'createdAt']);
    await queryInterface.addIndex('notifications', ['deviceId']);
    await queryInterface.addIndex('notifications', ['type']);
    await queryInterface.addIndex('notifications', ['severity']);

    console.log('✅ Table notifications created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notifications');
    console.log('✅ Table notifications dropped successfully');
  }
};