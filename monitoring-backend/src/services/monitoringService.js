const ping = require("ping");
const axios = require("axios");
const Device = require("../models/Device");
const Alert = require("../models/Alert");
const logger = require("../utils/logger");
const emailService = require("./emailService");

class MonitoringService {
  constructor() {
    this.pingTimeout = parseInt(process.env.PING_TIMEOUT) || 5000;
    this.httpTimeout = parseInt(process.env.HTTP_TIMEOUT) || 5000;
  }

  async checkPing(host) {
    try {
      const startTime = Date.now();

      const result = await ping.promise.probe(host, {
        timeout: this.pingTimeout / 1000,
        min_reply: 1,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: result.alive,
        responseTime: result.alive ? Math.round(result.time) : null,
        error: result.alive ? null : "Host unreachable",
      };
    } catch (error) {
      logger.error(`Error in ping of ${host}:`, error);
      return {
        success: false,
        responseTime: null,
        error: error.message,
      };
    }
  }

  async checkHttp(url, port = null) {
    try {
      const startTime = Date.now();

      let fullUrl = url;
      if (!url.startsWith("http")) {
        fullUrl = `http://${url}`;
      }
      if (port) {
        fullUrl = `${fullUrl}:${port}`;
      }

      const response = await axios.get(fullUrl, {
        timeout: this.httpTimeout,
        validateStatus: (status) => status < 500,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: response.status < 400,
        responseTime,
        statusCode: response.status,
        error: response.status >= 400 ? `HTTP ${response.status}` : null,
      };
    } catch (error) {
      logger.error(`Error in HTTP check of ${url}:`, error);

      return {
        success: false,
        responseTime: null,
        statusCode: error.response?.status || null,
        error:
          error.code === "ECONNREFUSED"
            ? "Connection refused"
            : error.code === "ETIMEDOUT"
            ? "Connection timeout"
            : error.message,
      };
    }
  }

  async checkDevice(device) {
    try {
      let result;

      if (device.checkUrl) {
        result = await this.checkHttp(device.checkUrl, device.port);
      } else {
        // Otherwise, use PING
        result = await this.checkPing(device.ip);
      }

      let status = "unknown";
      if (result.success) {
        status = "online";
      } else if (result.error) {
        status = "offline";
      }

      if (status === "online" && result.responseTime > 1000) {
        status = "warning";
      }

      const oldStatus = device.status;
      await device.updateStatus(status, result.responseTime, result.error);

      if (oldStatus === "online" && status === "offline") {
        await this.createAlert(device, "disaster", `Device is unreachable`);
      } else if (status === "warning" && oldStatus !== "warning") {
        await this.createAlert(
          device,
          "warning",
          `High response time: ${result.responseTime}ms`
        );
      } else if (
        status === "online" &&
        (oldStatus === "offline" || oldStatus === "warning")
      ) {
        await this.createAlert(device, "information", `Device is back online`);

        await this.resolveDeviceAlerts(device.id);
      }

      logger.monitoring("Device checked", {
        device: device.name,
        ip: device.ip,
        status,
        responseTime: result.responseTime,
      });

      return {
        status,
        responseTime: result.responseTime,
        previousStatus: oldStatus,
      };
    } catch (error) {
      logger.error(`Error checking device ${device.name}:`, error);
      throw error;
    }
  }

  async checkAllDevices() {
    try {
      const devices = await Device.findAll({
        where: { isActive: true },
      });

      logger.monitoring("Starting device check cycle", {
        count: devices.length,
      });

      const results = [];

      for (const device of devices) {
        try {
          const result = await this.checkDevice(device);
          results.push({
            device: device.name,
            ...result,
          });
        } catch (error) {
          logger.error(`Error checking ${device.name}:`, error);
          results.push({
            device: device.name,
            error: error.message,
          });
        }
      }

      logger.monitoring("Device check cycle completed", {
        checked: results.length,
        online: results.filter((r) => r.status === "online").length,
        offline: results.filter((r) => r.status === "offline").length,
        warning: results.filter((r) => r.status === "warning").length,
      });

      return results;
    } catch (error) {
      logger.error("Error in check cycle:", error);
      throw error;
    }
  }

  async createAlert(device, level, message) {
    try {
      const alert = await Alert.create({
        deviceId: device.id,
        device: device.name,
        message,
        level,
        timestamp: new Date(),
      });

      logger.info(`Alert created: ${device.name} - ${message} (${level})`);

      if (level === "disaster" || level === "warning") {
        await emailService.sendAlertEmail(alert, device);
      }

      const wsService = require("./websocketService");
      if (wsService.io) {
        wsService.io.emit("alert:new", {
          id: alert.id,
          device: alert.device,
          message: alert.message,
          level: alert.level,
          timestamp: alert.timestamp,
        });
      }

      return alert;
    } catch (error) {
      logger.error("Error creating alert:", error);
      throw error;
    }
  }

  async resolveDeviceAlerts(deviceId) {
    try {
      const alerts = await Alert.findAll({
        where: {
          deviceId,
          resolved: false,
        },
      });

      for (const alert of alerts) {
        await alert.resolve();
      }

      logger.info(
        `${alerts.length} alerts resolved for device #${deviceId}`
      );
    } catch (error) {
      logger.error("Error resolving alerts:", error);
    }
  }

  async getStats() {
    try {
      const devices = await Device.findAll();
      const alerts = await Alert.findAll({
        where: { resolved: false },
      });

      return {
        devices: {
          total: devices.length,
          online: devices.filter((d) => d.status === "online").length,
          offline: devices.filter((d) => d.status === "offline").length,
          warning: devices.filter((d) => d.status === "warning").length,
          unknown: devices.filter((d) => d.status === "unknown").length,
        },
        alerts: {
          total: alerts.length,
          disaster: alerts.filter((a) => a.level === "disaster").length,
          warning: alerts.filter((a) => a.level === "warning").length,
          information: alerts.filter((a) => a.level === "information").length,
        },
      };
    } catch (error) {
      logger.error("Error getting statistics:", error);
      throw error;
    }
  }
}

module.exports = new MonitoringService();
