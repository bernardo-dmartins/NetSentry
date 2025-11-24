const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Device = require('./Device');

const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'devices',
      key: 'id'
    }
  },
  device: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Device name (copy)'
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 500]
    }
  },
  level: {
    type: DataTypes.ENUM('disaster', 'warning', 'information'),
    defaultValue: 'information'
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  acknowledged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  acknowledgedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  emailSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'alerts',
  timestamps: true,
  indexes: [
    { fields: ['deviceId'] },
    { fields: ['level'] },
    { fields: ['acknowledged'] },
    { fields: ['resolved'] },
    { fields: ['timestamp'] }
  ]
});

// Relação com Device
Alert.belongsTo(Device, { foreignKey: 'deviceId', as: 'deviceInfo' });
Device.hasMany(Alert, { foreignKey: 'deviceId', as: 'alerts' });

// Método para reconhecer alerta
Alert.prototype.acknowledge = async function(username) {
  this.acknowledged = true;
  this.acknowledgedBy = username;
  this.acknowledgedAt = new Date();
  await this.save();
};

// Método para resolver alerta
Alert.prototype.resolve = async function() {
  this.resolved = true;
  this.resolvedAt = new Date();
  await this.save();
};

module.exports = Alert;