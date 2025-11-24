const { DataTypes } = require ('sequelize');
const { sequelize } = require ('../config/database');

const Device = sequelize.define('Device', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [3, 100]
        }
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            is: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/i
        }
    },
    type: {
        type: DataTypes.ENUM('server', 'Database', 'switch', 'router', 'pc', 'other'),
        defaultValue: 'server'
    },
    status: {
        type: DataTypes.ENUM('online', 'offline', 'warning', 'unknown'),
        defaultValue: 'unknown'
    },
    responseTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Response time'
    },
    lastCheck: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL for HTTP verification (optional)'
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    validate: {
      min: 1,
      max: 65535
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'If false, it does not monitor the device.'
  },
  consecutiveFailures: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Counter of consecutive failures'
  },
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'devices',
  timestamps: true,
  indexes: [
    { fields: ['ip'] },
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['isActive'] }
  ]
});

// Método para atualizar status
Device.prototype.updateStatus = async function(status, responseTime = null, error = null) {
  this.status = status;
  this.responseTime = responseTime;
  this.lastCheck = new Date();
  
  if (status === 'offline' || status === 'warning') {
    this.consecutiveFailures += 1;
    this.lastError = error;
  } else {
    this.consecutiveFailures = 0;
    this.lastError = null;
  }
  
  await this.save();
};

module.exports = Device;

