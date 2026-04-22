const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authJWT');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../errors/AppError');
const SystemSettings = require('../models/SystemSettings');
const logger = require('../utils/logger');
const systemSettingsRuntime = require('../services/systemSettingsRuntime');

/**
 * @swagger
 * /api/settings/system:
 *   get:
 *     summary: Get system settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/system', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await systemSettingsRuntime.loadSettingsForUser(userId);

  let settings = await SystemSettings.findOne({
    where: { userId }
  });

  // Se não existir, criar com valores padrão
  if (!settings) {
    const defaults = SystemSettings.getDefaults();
    settings = await SystemSettings.create({
      userId,
      ...defaults
    });

    logger.info('Created default system settings', { userId });
  }

  res.json({
    success: true,
    data: {
      id: settings.id,
      userId: settings.userId,
      monitoring: settings.monitoring,
      notifications: settings.notifications,
      dashboard: settings.dashboard,
      security: settings.security,
      dataRetention: settings.dataRetention,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    }
  });

  await systemSettingsRuntime.loadSettingsForUser(userId);
}));

/**
 * @swagger
 * /api/settings/system:
 *   post:
 *     summary: Update system settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid settings data
 *       401:
 *         description: Unauthorized
 */
router.post('/system', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { monitoring, notifications, dashboard, security, dataRetention } = req.body;

  // Validar que pelo menos uma categoria foi enviada
  if (!monitoring && !notifications && !dashboard && !security && !dataRetention) {
    throw new ValidationError('At least one settings category is required');
  }

  // Validações específicas
  if (monitoring) {
    if (monitoring.interval !== undefined && (monitoring.interval < 10 || monitoring.interval > 300)) {
      throw new ValidationError('Check interval must be between 10 and 300 seconds');
    }
    if (monitoring.timeout !== undefined && (monitoring.timeout < 1 || monitoring.timeout > 30)) {
      throw new ValidationError('Connection timeout must be between 1 and 30 seconds');
    }
    if (monitoring.retries !== undefined && (monitoring.retries < 1 || monitoring.retries > 10)) {
      throw new ValidationError('Max retries must be between 1 and 10');
    }
  }

  if (dashboard?.refreshRate && (dashboard.refreshRate < 5 || dashboard.refreshRate > 60)) {
    throw new ValidationError('Dashboard refresh rate must be between 5 and 60 seconds');
  }

  if (security?.sessionTimeout && (security.sessionTimeout < 5 || security.sessionTimeout > 1440)) {
    throw new ValidationError('Session timeout must be between 5 and 1440 minutes');
  }

  // Buscar ou criar settings
  let settings = await SystemSettings.findOne({ where: { userId } });

  if (!settings) {
    // Criar novo com defaults + valores fornecidos
    const defaults = SystemSettings.getDefaults();
    settings = await SystemSettings.create({
      userId,
      monitoring: monitoring || defaults.monitoring,
      notifications: notifications || defaults.notifications,
      dashboard: dashboard || defaults.dashboard,
      security: security || defaults.security,
      dataRetention: dataRetention || defaults.dataRetention,
    });

    logger.info('Created system settings', { userId });
  } else {
    // Atualizar apenas os campos fornecidos
    const updates = {};
    
    if (monitoring) {
      updates.monitoring = { ...settings.monitoring, ...monitoring };
    }
    if (notifications) {
      updates.notifications = { ...settings.notifications, ...notifications };
    }
    if (dashboard) {
      updates.dashboard = { ...settings.dashboard, ...dashboard };
    }
    if (security) {
      updates.security = { ...settings.security, ...security };
    }
    if (dataRetention) {
      updates.dataRetention = { ...settings.dataRetention, ...dataRetention };
    }

    await settings.update(updates);

    logger.info('Updated system settings', { 
      userId, 
      categories: Object.keys(updates) 
    });
  }

  await systemSettingsRuntime.loadSettingsForUser(userId);

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: {
      id: settings.id,
      userId: settings.userId,
      monitoring: settings.monitoring,
      notifications: settings.notifications,
      dashboard: settings.dashboard,
      security: settings.security,
      dataRetention: settings.dataRetention,
      updatedAt: settings.updatedAt
    }
  });
}));

/**
 * @swagger
 * /api/settings/system/reset:
 *   post:
 *     summary: Reset system settings to defaults
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings reset successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/system/reset', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const defaults = SystemSettings.getDefaults();

  let settings = await SystemSettings.findOne({ where: { userId } });

  if (!settings) {
    settings = await SystemSettings.create({
      userId,
      ...defaults
    });
  } else {
    await settings.update(defaults);
  }

  logger.info('Reset system settings to defaults', { userId });

  await systemSettingsRuntime.loadSettingsForUser(userId);

  res.json({
    success: true,
    message: 'Settings reset to defaults',
    data: {
      id: settings.id,
      userId: settings.userId,
      monitoring: settings.monitoring,
      notifications: settings.notifications,
      dashboard: settings.dashboard,
      security: settings.security,
      dataRetention: settings.dataRetention,
      updatedAt: settings.updatedAt
    }
  });
}));

/**
 * @swagger
 * /api/settings/system/defaults:
 *   get:
 *     summary: Get default system settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Default settings retrieved
 */
router.get('/system/defaults', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: SystemSettings.getDefaults()
  });
}));

module.exports = router;
