const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemSettings = sequelize.define('SystemSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },

  monitoring: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      interval: 30,
      timeout: 5,
      retries: 3,
      autoRestart: true
    },
    get() {
      const value = this.getDataValue('monitoring');
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return {
            interval: 30,
            timeout: 5,
            retries: 3,
            autoRestart: true
          };
        }
      }
      return value || {
        interval: 30,
        timeout: 5,
        retries: 3,
        autoRestart: true
      };
    },
    set(value) {
      this.setDataValue('monitoring', JSON.stringify(value));
    }
  },

  notifications: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      emailAlerts: true,
      criticalOnly: false,
      pushNotifications: false,
      alertSound: true,
      quietHours: false,
      quietStart: '22:00',
      quietEnd: '08:00'  
    },
    get() {
      const value = this.getDataValue('notifications');
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return {
            emailAlerts: true,
            criticalOnly: false,
            pushNotifications: false,
            alertSound: true,
            quietHours: false,
            quietStart: '22:00',
            quietEnd: '08:00'
          };
        }
      }
      return value || {
        emailAlerts: true,
        criticalOnly: false,
        pushNotifications: false,
        alertSound: true,
        quietHours: false,
        quietStart: '22:00',
        quietEnd: '08:00'
      };
    },
    set(value) {
      this.setDataValue('notifications', JSON.stringify(value));
    }
  },

  dashboard: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      theme: 'dark',
      refreshRate: 10,
      showCharts: true,
      compactMode: false,
      animationsEnabled: true
    },
    get() {
      const value = this.getDataValue('dashboard');
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return {
            theme: 'dark',
            refreshRate: 10,
            showCharts: true,
            compactMode: false,
            animationsEnabled: true
          };
        }
      }
      return value || {
        theme: 'dark',
        refreshRate: 10,
        showCharts: true,
        compactMode: false,
        animationsEnabled: true
      };
    },
    set(value) {
      this.setDataValue('dashboard', JSON.stringify(value));
    }
  },

  security: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      sessionTimeout: 60,
      requireStrongPassword: true,
      twoFactorAuth: false,
      loginNotifications: true
    },
    get() {
      const value = this.getDataValue('security');
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return {
            sessionTimeout: 60,
            requireStrongPassword: true,
            twoFactorAuth: false,
            loginNotifications: true
          };
        }
      }
      return value || {
        sessionTimeout: 60,
        requireStrongPassword: true,
        twoFactorAuth: false,
        loginNotifications: true
      };
    },
    set(value) {
      this.setDataValue('security', JSON.stringify(value));
    }
  },

  dataRetention: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      keepLogs: 30,
      keepAlerts: 90,
      keepMetrics: 365,
      autoCleanup: true
    },
    get() {
      const value = this.getDataValue('dataRetention');
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return {
            keepLogs: 30,
            keepAlerts: 90,
            keepMetrics: 365,
            autoCleanup: true
          };
        }
      }
      return value || {
        keepLogs: 30,
        keepAlerts: 90,
        keepMetrics: 365,
        autoCleanup: true
      };
    },
    set(value) {
      this.setDataValue('dataRetention', JSON.stringify(value));
    }
  }
}, {
  tableName: 'system_settings',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId']
    }
  ]
});

SystemSettings.associate = (models) => {
  SystemSettings.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

//static method for default value
SystemSettings.getDefaults = () => ({
  monitoring: {
    interval: 30,
    timeout: 5,
    retries: 3,
    autoRestart: true
  },
  notifications: {
    emailAlerts: true,
    criticalOnly: false,
    pushNotifications: false,
    alertSound: true,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00'  
  },
  dashboard: {
    theme: 'dark',
    refreshRate: 10,
    showCharts: true,
    compactMode: false,
    animationsEnabled: true
  },
  security: {
    sessionTimeout: 60,
    requireStrongPassword: true,
    twoFactorAuth: false,
    loginNotifications: true
  },
  dataRetention: {
    keepLogs: 30,
    keepAlerts: 90,
    keepMetrics: 365,
    autoCleanup: true
  }
});

module.exports = SystemSettings;