const { Op } = require("sequelize");
const Alert = require("../models/Alert");
const Device = require("../models/Device");
const logger = require("../utils/logger");

class AlertController {
  // List all alerts
  // List alerts + statistics
static async getAll(req, res) {
  try {
    const alerts = await Alert.findAll({
      include: [
        {
          model: Device,
          as: "deviceInfo",
          attributes: ["id", "name", "ip", "type"],
        },
      ],
      order: [["timestamp", "DESC"]],
    });

    // Example: statistics (if already calculated before)
    const stats = {
      total: alerts.length,
      resolved: alerts.filter(a => a.resolved).length,
      unresolved: alerts.filter(a => !a.resolved).length,
    };

    return res.status(200).json({
      message: "Alerts successfully listed",
      data: alerts,
      meta: stats, 
    });
  } catch (error) {
    logger.error("Error listing alerts:", error);
    return res.status(500).json({
      error: {
        code: "ALERT_LIST_ERROR",
        message: "Error listing alerts",
      },
    });
  }
}

static async getById(req, res) {
  try {
    const { id } = req.params;

    const alert = await Alert.findByPk(id, {
      include: [
        {
          model: Device,
          as: "deviceInfo",
          attributes: ["id", "name", "ip", "type"],
        },
      ],
    });

    if (!alert) {
      return res.status(404).json({
        error: {
          code: "ALERT_NOT_FOUND",
          message: "Alert not found",
        },
      });
    }

    return res.status(200).json({
      message: "Alert found successfully",
      data: alert,
    });
  } catch (error) {
    logger.error("Failed to fetch alert:", error);
    return res.status(500).json({
      error: {
        code: "ALERT_FETCH_ERROR",
        message: "Failed to fetch alert",
      },
    });
  }
}


  // Acknowledge alert
  static async acknowledge(req, res) {
    try {
      const { id } = req.params;
      const username = req.user.username;

      const alert = await Alert.findByPk(id);

      if (!alert) {
        return res.status(404).json({
          error: {
            code: "ALERT_NOT_FOUND",
            message: "Alert not found",
          },
        });
      }

      if (alert.acknowledged) {
        return res.status(400).json({
          error: {
            code: "ALERT_ALREADY_ACK",
            message: "Alert has already been acknowledged",
          },
        });
      }

      await alert.acknowledge(username);

      logger.info(`Alert #${id} acknowledged by ${username}`);

      res.status(200).json({
        data: alert,
        message: "Alert acknowledged successfully",
      });
    } catch (error) {
      logger.error("Error acknowledging alert:", error);
      res.status(500).json({
        error: {
          code: "ALERT_RECOGNITION_FAILED",
          message: "Error acknowledging alert",
        },
      });
    }
  }

  // Resolve alert
  static async resolve(req, res) {
    try {
      const { id } = req.params;

      const alert = await Alert.findByPk(id);

      if (!alert) {
        return res.status(404).json({
          error: {
            code: "ALERT_NOT_FOUND",
            message: "Alert not found",
          },
        });
      }

      if (alert.resolved) {
        return res.status(400).json({
          error: {
            code: "ALERT_ALREADY_RESOLVED",
            message: "Alert has already been resolved",
          },
        });
      }

      await alert.resolve();

      logger.info(`Alert #${id} resolved`);

      return res.status(200).json({
        message: "Alert resolved successfully",
        data: alert,
      });
    } catch (error) {
      logger.error("Error resolving alert:", error);
      return res.status(500).json({
        error: {
          code: "ALERT_RESOLVE_ERROR",
          message: "Error resolving alert",
        },
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const alert = await Alert.findByPk(id);

      if (!alert) {
        return res.status(404).json({
          error: {
            code: "ALERT_NOT_FOUND",
            message: "Alert not found",
          },
        });
      }

      await alert.destroy();

      logger.info(`Alert #${id} deleted`);

      return res.status(200).json({
      message: "Alert deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting alert:", error);
      return res.status(500).json({
        error: {
          code: "ALERT_DELETE_ERROR",
          message: "Error deleting alert",
        },
      });
    }
  }

  // Clean up old alerts
  static async cleanup(req, res) {
  try {
    const { days = 30 } = req.query;

    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));

    const result = await Alert.destroy({
      where: {
        timestamp: { [Op.lt]: date },
        resolved: true,
      },
    });

    logger.info(`${result} old alerts removed`);

    return res.status(200).json({
      message: `${result} alerts removed successfully`,
      data: { removed: result },
    });
  } catch (error) {
    logger.error("Error cleaning up alerts:", error);
    return res.status(500).json({
      error: {
        code: "ALERT_CLEANUP_ERROR",
        message: "Error cleaning up alerts",
      },
    });
  }
}

static async getRecent(req, res) {
  try {
    const date = new Date();
    date.setHours(date.getHours() - 24);

    const alerts = await Alert.findAll({
      where: {
        timestamp: { [Op.gte]: date },
      },
      include: [
        {
          model: Device,
          as: "deviceInfo",
          attributes: ["id", "name", "ip", "type"],
        },
      ],
      order: [["timestamp", "DESC"]],
      limit: 20,
    });

    return res.status(200).json({
      message: "Recent alerts obtained successfully",
      data: alerts,
    });
  } catch (error) {
    logger.error("Error fetching recent alerts:", error);
    return res.status(500).json({
      error: {
        code: "ALERT_RECENT_FETCH_ERROR",
        message: "Error fetching recent alerts",
      },
    })
  }
}}

module.exports = AlertController;
