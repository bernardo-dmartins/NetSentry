const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Device = require('../models/Device');
const logger = require('../utils/logger');
const monitoringService = require('../services/monitoringService');
const redisClient = require('../config/redis');

class DeviceController {
  static validateDevice = [
    body('name').isLength({ min: 3, max: 100 }).trim().escape(),
    body('ip').matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/),
    body('type').isIn(['server', 'database', 'switch', 'router', 'pc', 'other'])
  ];

  static async getAll(req, res) {
    try {
      const { status, type, search } = req.query;

      // Create cache key based on query parameters
      const cacheKey = `devices:list:${status || 'all'}:${type || 'all'}:${search || 'none'}`;

      // Try to get from cache first
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        logger.debug(`Cache HIT for devices: ${cacheKey}`);
        return res.json(cachedData); // 
      }

      logger.debug(`Cache MISS for devices: ${cacheKey}`);

      // Build filters
      const where = {};

      if (status && status !== 'all') {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { ip: { [Op.like]: `%${search}%` } }
        ];
      }

      const devices = await Device.findAll({
        where,
        order: [['name', 'ASC']]
      });

      const stats = {
        total: devices.length,
        online: devices.filter(d => d.status === 'online').length,
        offline: devices.filter(d => d.status === 'offline').length,
        warning: devices.filter(d => d.status === 'warning').length
      };

      const responseData = {
        success: true,
        data: devices,
        stats
      };

      // Cache the response for 30 seconds (devices change frequently)
      await redisClient.set(cacheKey, responseData, 30);

      res.json(responseData);

    } catch (error) {
      logger.error('Error listing devices:', error);
      res.status(500).json({
        success: false,
        message: 'Error listing devices'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;

      // Try cache first
      const cacheKey = `device:${id}`;
      const cachedDevice = await redisClient.get(cacheKey);
      
      if (cachedDevice) {
        logger.debug(`Cache HIT for device: ${id}`);
        return res.json({
          success: true,
          data: cachedDevice
        });
      }

      const device = await Device.findByPk(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Cache for 60 seconds
      await redisClient.set(cacheKey, device, 60);

      res.json({
        success: true,
        data: device
      });

    } catch (error) {
      logger.error('Error fetching device:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching device'
      });
    }
  }

  // Create new device
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { name, ip, type, checkUrl, port, description } = req.body;

      // Check if IP already exists
      const existingDevice = await Device.findOne({ where: { ip } });
      if (existingDevice) {
        return res.status(400).json({
          success: false,
          message: 'A device with this IP already exists'
        });
      }

      // Create device
      const device = await Device.create({
        name,
        ip,
        type,
        checkUrl,
        port,
        description
      });

      // Perform first check
      await monitoringService.checkDevice(device);

      // Invalidate all devices list caches
      await redisClient.invalidatePattern('devices:list:*');

      logger.info(`Device created: ${device.name} (${device.ip})`);

      res.status(201).json({
        success: true,
        message: 'Device created successfully',
        data: device
      });

    } catch (error) {
      logger.error('Error creating device:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating device'
      });
    }
  }

  // Update device
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, ip, type, checkUrl, port, description, isActive } = req.body;

      const device = await Device.findByPk(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Check if new IP already exists in another device
      if (ip && ip !== device.ip) {
        const existingDevice = await Device.findOne({
          where: { ip, id: { [Op.ne]: id } }
        });

        if (existingDevice) {
          return res.status(400).json({
            success: false,
            message: 'A device with this IP already exists'
          });
        }
      }

      // Update
      await device.update({
        name: name || device.name,
        ip: ip || device.ip,
        type: type || device.type,
        checkUrl: checkUrl !== undefined ? checkUrl : device.checkUrl,
        port: port !== undefined ? port : device.port,
        description: description !== undefined ? description : device.description,
        isActive: isActive !== undefined ? isActive : device.isActive
      });

      // Invalidate caches
      await redisClient.del(`device:${id}`);
      await redisClient.invalidatePattern('devices:list:*');

      logger.info(`Device updated: ${device.name} (${device.ip})`);

      res.json({
        success: true,
        message: 'Device updated successfully',
        data: device
      });

    } catch (error) {
      logger.error('Error updating device:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating device'
      });
    }
  }

  // Delete device
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const device = await Device.findByPk(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await device.destroy();

      // Invalidate caches
      await redisClient.del(`device:${id}`);
      await redisClient.invalidatePattern('devices:list:*');

      logger.info(`Device deleted: ${device.name} (${device.ip})`);

      res.json({
        success: true,
        message: 'Device deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting device:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting device'
      });
    }
  }

  // Force manual check of a device
  static async checkDevice(req, res) {
    try {
      const { id } = req.params;

      const device = await Device.findByPk(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Execute check
      const result = await monitoringService.checkDevice(device);

      // Invalidate cache of this device
      await redisClient.del(`device:${id}`);
      await redisClient.invalidatePattern('devices:list:*');

      res.json({
        success: true,
        message: 'Check executed',
        data: {
          device,
          result
        }
      });

    } catch (error) {
      logger.error('Error checking device:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking device'
      });
    }
  }

  // Get general statistics
  static async getStats(req, res) {
    try {
      // Try cache first
      const cacheKey = 'devices:stats';
      const cachedStats = await redisClient.get(cacheKey);

      if (cachedStats) {
        logger.debug('Cache HIT for stats');
        return res.json({
          success: true,
          data: cachedStats
        });
      }

      const devices = await Device.findAll();

      const stats = {
        total: devices.length,
        online: devices.filter(d => d.status === 'online').length,
        offline: devices.filter(d => d.status === 'offline').length,
        warning: devices.filter(d => d.status === 'warning').length,
        unknown: devices.filter(d => d.status === 'unknown').length,
        byType: {
          server: devices.filter(d => d.type === 'server').length,
          database: devices.filter(d => d.type === 'database').length,
          switch: devices.filter(d => d.type === 'switch').length,
          router: devices.filter(d => d.type === 'router').length,
          pc: devices.filter(d => d.type === 'pc').length,
          other: devices.filter(d => d.type === 'other').length
        }
      };

      // Cache for 10 seconds
      await redisClient.set(cacheKey, stats, 10);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching statistics'
      });
    }
  }
}

module.exports = DeviceController;