const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/deviceControllers');
const { authMiddleware } = require('../middleware/authJWT'); // ⬅️ SÓ authMiddleware, SEM adminMiddleware

const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Device management endpoints
 */

// ⚠️ ORDEM IMPORTANTE: Rotas específicas PRIMEIRO!

/**
 * @swagger
 * /api/devices/stats:
 *   get:
 *     summary: Get device statistics
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats',
  authMiddleware,
  wrap(DeviceController.getStats)
);

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: List all devices
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 */
router.get('/',
  authMiddleware,
  wrap(DeviceController.getAll)
);

/**
 * @swagger
 * /api/devices/{id}:
 *   get:
 *     summary: Get device by ID
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 */
router.get('/:id',
  authMiddleware,
  wrap(DeviceController.getById)
);

/**
 * @swagger
 * /api/devices:
 *   post:
 *     summary: Create new device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 */
router.post('/',
  authMiddleware,
  DeviceController.validateDevice,
  wrap(DeviceController.create)
);

/**
 * @swagger
 * /api/devices/{id}/check:
 *   post:
 *     summary: Manually check device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 */
router.post('/:id/check',
  authMiddleware,
  wrap(DeviceController.checkDevice)
);

/**
 * @swagger
 * /api/devices/{id}:
 *   put:
 *     summary: Update device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 */
router.put('/:id',
  authMiddleware,
  wrap(DeviceController.update)
);

/**
 * @swagger
 * /api/devices/{id}:
 *   delete:
 *     summary: Delete device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 */
router.delete('/:id',
  authMiddleware,
  wrap(DeviceController.delete)
);

module.exports = router;
