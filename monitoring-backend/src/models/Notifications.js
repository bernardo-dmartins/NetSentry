const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Devices',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  checkId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'device_checks',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  type: {
    type: DataTypes.ENUM('alert', 'recovery', 'warning', 'info', 'system', 'test'),
    allowNull: false,
    defaultValue: 'info'
  },
  severity: {
    type: DataTypes.ENUM('critical', 'warning', 'info'),
    allowNull: false,
    defaultValue: 'info'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cached device name for faster display'
  },
  read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional data (response time, error details, etc)',
    get() {
      const value = this.getDataValue('metadata');
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return null;
        }
      }
      return value;
    },
    set(value) {
      this.setDataValue('metadata', value ? JSON.stringify(value) : null);
    }
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'read']
    },
    {
      fields: ['userId', 'createdAt']
    },
    {
      fields: ['deviceId']
    },
    {
      fields: ['type']
    },
    {
      fields: ['severity']
    }
  ]
});

// Associações
Notification.associate = (models) => {
  Notification.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });

  Notification.belongsTo(models.Device, {
    foreignKey: 'deviceId',
    as: 'device'
  });

  if (models.DeviceCheck) {
    Notification.belongsTo(models.DeviceCheck, {
      foreignKey: 'checkId',
      as: 'check'
    });
  }
};

// Métodos estáticos

/**
 * Criar notificação para device offline
 */
Notification.createDeviceOffline = async function(device, userId) {
  return await Notification.create({
    userId,
    deviceId: device.id,
    type: 'alert',
    severity: 'critical',
    title: 'Device Offline',
    message: `${device.name} is offline`,
    deviceName: device.name
  });
};

/**
 * Criar notificação para device recovery
 */
Notification.createDeviceRecovery = async function(device, userId) {
  return await Notification.create({
    userId,
    deviceId: device.id,
    type: 'recovery',
    severity: 'info',
    title: 'Device Recovered',
    message: `${device.name} is back online`,
    deviceName: device.name
  });
};

/**
 * Criar notificação para high response time
 */
Notification.createHighResponseTime = async function(device, responseTime, userId) {
  return await Notification.create({
    userId,
    deviceId: device.id,
    type: 'warning',
    severity: 'warning',
    title: 'High Response Time',
    message: `${device.name} response time is ${responseTime}ms`,
    deviceName: device.name,
    metadata: { responseTime }
  });
};

/**
 * Limpar notificações antigas (mais de X dias)
 */
Notification.cleanupOld = async function(days = 30) {
  const { Op } = require('sequelize');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const deletedCount = await Notification.destroy({
    where: {
      read: true,
      createdAt: {
        [Op.lt]: cutoffDate
      }
    }
  });

  return deletedCount;
};

module.exports = Notification;