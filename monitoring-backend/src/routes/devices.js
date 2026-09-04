const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/deviceControllers');
const CheckController = require('../controllers/checkControllers');
const { authMiddleware } = require('../middleware/authJWT'); 

const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Device management endpoints
 */


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
 * /api/devices/{id}/checks:
 *   get:
 *     summary: List checks for a device
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
router.get('/:id/checks',
  authMiddleware,
  CheckController.validateDeviceId,
  wrap(CheckController.listByDevice)
);

/**
 * @swagger
 * /api/devices:
  *   post:
 *     summary: Create new device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Device'
 *     responses:
 *       201:
 *         description: Device created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',
  authMiddleware,
  DeviceController.validateDevice,
  wrap(DeviceController.create)
);

/**
 * @swagger
 * /api/devices/{id}/checks:
 *   post:
 *     summary: Create a check for a device
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
router.post('/:id/checks',
  authMiddleware,
  CheckController.validateCreate,
  wrap(CheckController.createForDevice)
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *               timeout:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Check executed successfully
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               ip:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [server, database, switch, router, pc, other]
 *               checkUrl:
 *                 type: string
 *               port:
 *                 type: integer
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Device updated successfully
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
