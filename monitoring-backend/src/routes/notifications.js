const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Notification = require('../models/Notification');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * GET /api/notifications
 * Listar notificações do usuário
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0, read } = req.query;

  const where = { userId };
  
  // Filtrar por lida/não lida
  if (read !== undefined) {
    where.read = read === 'true';
  }

  const notifications = await Notification.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  const unreadCount = await Notification.count({
    where: { userId, read: false }
  });

  res.json({
    success: true,
    data: notifications,
    unreadCount,
    total: notifications.length
  });
}));

/**
 * GET /api/notifications/unread-count
 * Contar notificações não lidas
 */
router.get('/unread-count', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const count = await Notification.count({
    where: { userId, read: false }
  });

  res.json({
    success: true,
    count
  });
}));

/**
 * PATCH /api/notifications/:id/read
 * Marcar notificação como lida
 */
router.patch('/:id/read', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = await Notification.findOne({
    where: { id, userId }
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  await notification.update({ read: true, readAt: new Date() });

  logger.debug('Notification marked as read', { notificationId: id, userId });

  res.json({
    success: true,
    data: notification
  });
}));

/**
 * POST /api/notifications/mark-all-read
 * Marcar todas como lidas
 */
router.post('/mark-all-read', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [updatedCount] = await Notification.update(
    { read: true, readAt: new Date() },
    { where: { userId, read: false } }
  );

  logger.info('Marked all notifications as read', { userId, count: updatedCount });

  res.json({
    success: true,
    message: `${updatedCount} notifications marked as read`,
    count: updatedCount
  });
}));

/**
 * DELETE /api/notifications/:id
 * Deletar uma notificação
 */
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const deleted = await Notification.destroy({
    where: { id, userId }
  });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  logger.debug('Notification deleted', { notificationId: id, userId });

  res.json({
    success: true,
    message: 'Notification deleted'
  });
}));

/**
 * DELETE /api/notifications/clear-all
 * Limpar todas as notificações
 */
router.delete('/clear-all', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const deletedCount = await Notification.destroy({
    where: { userId }
  });

  logger.info('All notifications cleared', { userId, count: deletedCount });

  res.json({
    success: true,
    message: `${deletedCount} notifications cleared`,
    count: deletedCount
  });
}));

/**
 * POST /api/notifications/test
 * Criar notificação de teste (dev only)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const notification = await Notification.create({
      userId,
      type: 'test',
      severity: 'info',
      title: 'Test Notification',
      message: 'This is a test notification',
      deviceId: null
    });

    // Broadcast via WebSocket
    const websocketService = require('../services/websocketService');
    websocketService.sendToUser(userId, 'new-notification', notification);

    res.json({
      success: true,
      data: notification
    });
  }));
}

module.exports = router;