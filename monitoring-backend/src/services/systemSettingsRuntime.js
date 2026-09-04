const SystemSettings = require("../models/SystemSettings");
const monitoringService = require("./monitoringService");
const monitoringJob = require("../jobs/monitoringJob");
const logger = require("../utils/logger");

const defaults = SystemSettings.getDefaults();
let currentSettings = { ...defaults };

const buildSettingsPayload = (settings) => ({
  monitoring: settings.monitoring,
  notifications: settings.notifications,
  dashboard: settings.dashboard,
  security: settings.security,
  dataRetention: settings.dataRetention,
});

const applySettings = (settingsPayload = {}) => {
  currentSettings = {
    ...defaults,
    ...settingsPayload,
    monitoring: {
      ...defaults.monitoring,
      ...(settingsPayload.monitoring || {}),
    },
    notifications: {
      ...defaults.notifications,
      ...(settingsPayload.notifications || {}),
    },
    dashboard: {
      ...defaults.dashboard,
      ...(settingsPayload.dashboard || {}),
    },
    security: {
      ...defaults.security,
      ...(settingsPayload.security || {}),
    },
    dataRetention: {
      ...defaults.dataRetention,
      ...(settingsPayload.dataRetention || {}),
    },
  };

  monitoringService.applySettings(currentSettings);
  monitoringJob.applySettings(currentSettings);

  return currentSettings;
};

const loadLatestSettings = async () => {
  try {
    const settings = await SystemSettings.findOne({
      order: [["updatedAt", "DESC"]],
    });

    if (!settings) {
      applySettings(defaults);
      return currentSettings;
    }

    const payload = buildSettingsPayload(settings);
    applySettings(payload);
    return currentSettings;
  } catch (error) {
    logger.warn("Failed to load system settings, using defaults", error);
    applySettings(defaults);
    return currentSettings;
  }
};

const loadSettingsForUser = async (userId) => {
  if (!userId) return currentSettings;

  try {
    const settings = await SystemSettings.findOne({
      where: { userId },
    });

    if (!settings) {
      applySettings(defaults);
      return currentSettings;
    }

    const payload = buildSettingsPayload(settings);
    applySettings(payload);
    return currentSettings;
  } catch (error) {
    logger.warn("Failed to load system settings for user, using defaults", error);
    applySettings(defaults);
    return currentSettings;
  }
};

const getSettings = () => currentSettings;

module.exports = {
  applySettings,
  loadLatestSettings,
  loadSettingsForUser,
  getSettings,
};
