const ping = require("ping");
const axios = require("axios");
const net = require("net");
const tls = require("tls");
const dns = require("dns").promises;
const Device = require("../models/Device");
const DeviceCheck = require("../models/DeviceCheck");
const CheckResult = require("../models/CheckResult");
const Alert = require("../models/Alert");
const logger = require("../utils/logger");
const emailService = require("./emailService");
const Notification = require('../models/Notifications')

class MonitoringService {
  constructor() {
    this.pingTimeout = parseInt(process.env.PING_TIMEOUT, 10) || 5000;
    this.httpTimeout = parseInt(process.env.HTTP_TIMEOUT, 10) || 5000;
    this.retryAttempts = parseInt(process.env.MONITORING_RETRIES, 10) || 3;
    this.notifications = {
      emailAlerts: true,
      criticalOnly: false,
      quietHours: false,
      quietStart: "22:00",
      quietEnd: "08:00",
    };
  }

  parsePacketLoss(value) {
    if (value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  applySettings(settings = {}) {
    const monitoring = settings.monitoring || {};
    if (monitoring.timeout !== undefined && monitoring.timeout !== null) {
      const timeoutMs = parseInt(monitoring.timeout, 10) * 1000;
      if (!Number.isNaN(timeoutMs) && timeoutMs > 0) {
        this.pingTimeout = timeoutMs;
        this.httpTimeout = timeoutMs;
      }
    }

    if (monitoring.retries !== undefined && monitoring.retries !== null) {
      const retries = parseInt(monitoring.retries, 10);
      if (!Number.isNaN(retries) && retries >= 1) {
        this.retryAttempts = retries;
      }
    }

    if (settings.notifications) {
      this.notifications = {
        ...this.notifications,
        ...settings.notifications,
      };
    }
  }

  async executeWithRetries(fn, retries) {
    let attempt = 0;
    let lastResult = null;
    while (attempt < retries) {
      lastResult = await fn();
      if (lastResult?.success) {
        return lastResult;
      }
      attempt += 1;
    }
    return lastResult;
  }

  isWithinQuietHours() {
    if (!this.notifications.quietHours) return false;
    const start = this.notifications.quietStart || "22:00";
    const end = this.notifications.quietEnd || "08:00";

    const now = new Date();
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) {
      return false;
    }

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    }

    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }

  shouldSendEmail(level) {
    if (!this.notifications.emailAlerts) return false;
    if (this.notifications.criticalOnly && level !== "disaster") return false;
    if (this.isWithinQuietHours() && level !== "disaster") return false;
    return level === "disaster" || level === "warning";
  }

  async checkPing(host, timeoutMs = this.pingTimeout) {
    try {
      const startTime = Date.now();

      const result = await ping.promise.probe(host, {
        timeout: timeoutMs / 1000,
        min_reply: 1,
      });

      const responseTime = Date.now() - startTime;
      const packetLoss = this.parsePacketLoss(result.packetLoss);

      return {
        success: result.alive,
        responseTime: result.alive ? Math.round(result.time) : null,
        packetLoss,
        error: result.alive ? null : "Host unreachable",
      };
    } catch (error) {
      logger.error(`Error in ping of ${host}:`, error);
      return {
        success: false,
        responseTime: null,
        packetLoss: null,
        error: error.message,
      };
    }
  }

  async checkPacketLoss(host, timeoutMs = this.pingTimeout, count = 4) {
    try {
      const startTime = Date.now();
      const isWindows = process.platform === "win32";
      const countFlag = isWindows ? "-n" : "-c";
      const result = await ping.promise.probe(host, {
        timeout: timeoutMs / 1000,
        min_reply: 1,
        extra: [countFlag, String(count)],
      });

      const responseTime = Date.now() - startTime;
      const packetLoss = this.parsePacketLoss(result.packetLoss);

      return {
        success: result.alive,
        responseTime: result.alive ? Math.round(result.time) : null,
        packetLoss,
        error: result.alive ? null : "Host unreachable",
      };
    } catch (error) {
      logger.error(`Error in packet loss check of ${host}:`, error);
      return {
        success: false,
        responseTime: null,
        packetLoss: null,
        error: error.message,
      };
    }
  }

  async checkHttp(url, port = null, timeoutMs = this.httpTimeout, options = {}) {
    try {
      const startTime = Date.now();

      let fullUrl = url;
      if (!url.startsWith("http")) {
        fullUrl = `http://${url}`;
      }
      if (port) {
        fullUrl = `${fullUrl}:${port}`;
      }

      const response = await axios({
        url: fullUrl,
        method: options.method || "GET",
        headers: options.headers || undefined,
        data: options.body || undefined,
        timeout: timeoutMs,
        validateStatus: (status) => status < 500,
      });

      const responseTime = Date.now() - startTime;
      const expectedStatus = options.expectedStatus;
      const success =
        expectedStatus !== undefined
          ? response.status === expectedStatus
          : response.status < 400;

      return {
        success,
        responseTime,
        statusCode: response.status,
        error: success ? null : `HTTP ${response.status}`,
        metadata: {
          expectedStatus: expectedStatus ?? null,
        },
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


  buildStatusFromResult(result, check) {
    let status = "unknown";
    if (result.success) {
      status = "online";
    } else if (result.error) {
      status = "offline";
    }

    if (check.type === "packet_loss" && result.packetLoss !== null && result.packetLoss !== undefined) {
      if (
        check.criticalThreshold !== null &&
        check.criticalThreshold !== undefined &&
        result.packetLoss >= check.criticalThreshold
      ) {
        return "offline";
      }
      if (
        check.warningThreshold !== null &&
        check.warningThreshold !== undefined &&
        result.packetLoss >= check.warningThreshold
      ) {
        return "warning";
      }
    }

    if (check.type === "ssl_certificate" && result.metadata?.expiresInDays !== undefined) {
      const days = result.metadata.expiresInDays;
      if (days !== null) {
        if (
          check.criticalThreshold !== null &&
          check.criticalThreshold !== undefined &&
          days <= check.criticalThreshold
        ) {
          status = "offline";
        } else if (
          check.warningThreshold !== null &&
          check.warningThreshold !== undefined &&
          days <= check.warningThreshold
        ) {
          status = "warning";
        }
        return status;
      }
    }

    if (status === "online" && result.responseTime !== null) {
      if (
        check.criticalThreshold !== null &&
        check.criticalThreshold !== undefined &&
        result.responseTime > check.criticalThreshold
      ) {
        status = "offline";
      } else if (
        check.warningThreshold !== null &&
        check.warningThreshold !== undefined &&
        result.responseTime > check.warningThreshold
      ) {
        status = "warning";
      }
    }

    return status;
  }

  async checkTcpPort(host, port, timeoutMs) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();
      let settled = false;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(timeoutMs);

      socket.once("connect", () => {
        const responseTime = Date.now() - startTime;
        finish({ success: true, responseTime, error: null });
      });

      socket.once("timeout", () => {
        finish({ success: false, responseTime: null, error: "Connection timeout" });
      });

      socket.once("error", (error) => {
        finish({ success: false, responseTime: null, error: error.message });
      });

      socket.connect(port, host);
    });
  }

  async checkDns(hostname, recordType = "A", expected = []) {
    try {
      let resolved = [];

      if (recordType === "A") {
        resolved = await dns.resolve4(hostname);
      } else if (recordType === "AAAA") {
        resolved = await dns.resolve6(hostname);
      } else if (recordType === "CNAME") {
        resolved = await dns.resolveCname(hostname);
      } else if (recordType === "MX") {
        const mxRecords = await dns.resolveMx(hostname);
        resolved = mxRecords.map((item) => `${item.exchange}:${item.priority}`);
      } else if (recordType === "TXT") {
        const txtRecords = await dns.resolveTxt(hostname);
        resolved = txtRecords.flat().map((item) => `${item}`);
      } else if (recordType === "NS") {
        resolved = await dns.resolveNs(hostname);
      } else {
        return {
          success: false,
          responseTime: null,
          error: "Unsupported DNS record type",
          resolvedValue: null,
        };
      }

      const expectedList = Array.isArray(expected) ? expected : [];
      const isMatch =
        expectedList.length === 0 ||
        expectedList.every((value) => resolved.includes(value));

      return {
        success: isMatch,
        responseTime: null,
        error: isMatch ? null : "DNS record mismatch",
        resolvedValue: resolved.join(", "),
        metadata: { resolved },
      };
    } catch (error) {
      return {
        success: false,
        responseTime: null,
        error: error.message,
        resolvedValue: null,
      };
    }
  }

  async checkSslCertificate(host, port, timeoutMs) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = tls.connect(
        {
          host,
          port,
          servername: host,
          rejectUnauthorized: false,
          timeout: timeoutMs,
        },
        () => {
          const responseTime = Date.now() - startTime;
          const cert = socket.getPeerCertificate(true);
          const validTo = cert && cert.valid_to ? new Date(cert.valid_to) : null;
          const expiresInDays = validTo
            ? Math.ceil((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          const expired = expiresInDays !== null && expiresInDays < 0;
          socket.end();
          resolve({
            success: !expired,
            responseTime,
            error: expired ? "Certificate expired" : null,
            resolvedValue: validTo ? validTo.toISOString() : null,
            metadata: {
              subject: cert && cert.subject ? cert.subject : null,
              issuer: cert && cert.issuer ? cert.issuer : null,
              validFrom: cert && cert.valid_from ? cert.valid_from : null,
              validTo: cert && cert.valid_to ? cert.valid_to : null,
              expiresInDays,
            },
          });
        }
      );

      socket.once("timeout", () => {
        socket.destroy();
        resolve({ success: false, responseTime: null, error: "TLS timeout" });
      });

      socket.once("error", (error) => {
        resolve({ success: false, responseTime: null, error: error.message });
      });
    });
  }

  async checkDeviceCheck(check, device) {
    let result;
    const config = check.config || {};

    const retries = Math.max(
      1,
      parseInt(config.retries ?? this.retryAttempts, 10) || 1
    );

    if (check.type === "ping") {
      const host = config.host || device.ip;
      result = await this.executeWithRetries(
        () => this.checkPing(host, check.timeoutMs || this.pingTimeout),
        retries
      );
    } else if (check.type === "packet_loss") {
      const host = config.host || device.ip;
      const count = config.count ?? 4;
      result = await this.executeWithRetries(
        () => this.checkPacketLoss(
          host,
          check.timeoutMs || this.pingTimeout,
          count
        ),
        retries
      );
    } else if (check.type === "http") {
      const url = config.url || device.checkUrl || device.ip;
      const port = config.port ?? device.port ?? null;
      const options = {
        method: config.method,
        headers: config.headers,
        body: config.body,
        expectedStatus: check.expected?.status,
      };
      result = await this.executeWithRetries(
        () =>
          this.checkHttp(
            url,
            port,
            check.timeoutMs || this.httpTimeout,
            options
          ),
        retries
      );
    } else if (check.type === "tcp_port") {
      const host = config.host || device.ip;
      const port = config.port ?? device.port;
      if (!port) {
        result = {
          success: false,
          responseTime: null,
          error: "TCP port is required",
        };
      } else {
        result = await this.executeWithRetries(
          () =>
            this.checkTcpPort(
              host,
              port,
              check.timeoutMs || this.httpTimeout
            ),
          retries
        );
      }
    } else if (check.type === "dns") {
      const hostname = config.hostname || device.ip;
      const recordType = config.recordType || "A";
      const expected = check.expected?.values || config.expected || [];
      result = await this.executeWithRetries(
        () => this.checkDns(hostname, recordType, expected),
        retries
      );
    } else if (check.type === "ssl_certificate") {
      const host = config.host || device.ip;
      const port = config.port ?? 443;
      result = await this.executeWithRetries(
        () =>
          this.checkSslCertificate(
            host,
            port,
            check.timeoutMs || this.httpTimeout
          ),
        retries
      );
    } else if (check.type === "keyword_match") {
      const url = config.url || device.checkUrl || device.ip;
      const port = config.port ?? device.port ?? null;
      const options = {
        method: config.method,
        headers: config.headers,
        body: config.body,
      };
      result = await this.executeWithRetries(async () => {
        const startTime = Date.now();
        const fullUrl = url.startsWith("http")
          ? url
          : `http://${url}${port ? `:${port}` : ""}`;
        const response = await axios({
          url: fullUrl,
          method: options.method || "GET",
          headers: options.headers || undefined,
          data: options.body || undefined,
          timeout: check.timeoutMs || this.httpTimeout,
          validateStatus: (status) => status < 500,
        });
        const responseTime = Date.now() - startTime;

        const responseBody =
          typeof response.data === "string"
            ? response.data
            : JSON.stringify(response.data ?? "");

        const expected = {
          keyword: check.expected?.keyword,
          regex: check.expected?.regex,
        };

        let match = false;
        if (expected.regex) {
          try {
            const re = new RegExp(expected.regex);
            match = re.test(responseBody);
          } catch (error) {
            return {
              success: false,
              responseTime,
              statusCode: response.status,
              error: "Invalid regex",
            };
          }
        } else if (expected.keyword) {
          match = responseBody.includes(expected.keyword);
        }

        return {
          success: match,
          responseTime,
          statusCode: response.status,
          error: match ? null : "Keyword not found",
          metadata: { matchType: expected.regex ? "regex" : "keyword" },
        };
      }, retries);
    } else {
      result = {
        success: false,
        responseTime: null,
        error: "Check type not implemented",
      };
    }

    const status = this.buildStatusFromResult(result, check);
    const checkedAt = new Date();

    const checkResult = await CheckResult.create({
      deviceCheckId: check.id,
      status,
      responseTime: result.responseTime ?? null,
      error: result.error ?? null,
      statusCode: result.statusCode ?? null,
      packetLoss: result.packetLoss ?? null,
      resolvedValue: result.resolvedValue ?? null,
      metadata: result.metadata || {},
      checkedAt,
    });

    const oldStatus = check.lastStatus;
    await check.updateLastResult({
      status,
      error: result.error,
      responseTime: result.responseTime,
      checkedAt,
    });

    await this.handleCheckAlerts(device, check, oldStatus, status, result);
    await this.updateDeviceStatusFromChecks(device.id);

    logger.monitoring("Check executed", {
      device: device.name,
      check: check.name,
      type: check.type,
      status,
      responseTime: result.responseTime,
    });

    return {
      checkId: check.id,
      status,
      responseTime: result.responseTime,
      previousStatus: oldStatus,
      resultId: checkResult.id,
    };
  }

  async handleCheckAlerts(device, check, oldStatus, newStatus, result) {
    if (oldStatus === "online" && newStatus === "offline") {
      await this.createAlert(
        device,
        "disaster",
        `${check.name} is unreachable`
      );
    } else if (newStatus === "warning" && oldStatus !== "warning") {
      await this.createAlert(
        device,
        "warning",
        `${check.name} high response time: ${result.responseTime}ms`
      );
    } else if (
      newStatus === "online" &&
      (oldStatus === "offline" || oldStatus === "warning")
    ) {
      await this.createAlert(
        device,
        "information",
        `${check.name} is back online`
      );

      await this.resolveDeviceAlerts(device.id);
    }
  }

  async updateDeviceStatusFromChecks(deviceId) {
    const checks = await DeviceCheck.findAll({
      where: { deviceId, isActive: true },
    });

    if (!checks.length) {
      return;
    }

    const statusRank = { offline: 3, warning: 2, online: 1, unknown: 0 };
    let finalStatus = "unknown";
    let maxResponseTime = null;

    for (const check of checks) {
      if (statusRank[check.lastStatus] > statusRank[finalStatus]) {
        finalStatus = check.lastStatus;
      }

      if (
        check.lastResponseTime !== null &&
        (maxResponseTime === null || check.lastResponseTime > maxResponseTime)
      ) {
        maxResponseTime = check.lastResponseTime;
      }
    }

    const device = await Device.findByPk(deviceId);
    if (!device) return;

    await device.updateStatus(finalStatus, maxResponseTime, null);
  }

  async checkDevice(device) {
    const checks = await DeviceCheck.findAll({
      where: { deviceId: device.id, isActive: true },
      order: [["createdAt", "ASC"]],
    });

    if (!checks.length) {
      let result;

      if (device.checkUrl) {
        result = await this.checkHttp(device.checkUrl, device.port);
      } else {
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

      logger.monitoring("Device checked (legacy)", {
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
    }

    const results = [];
    for (const check of checks) {
      results.push(await this.checkDeviceCheck(check, device));
    }

    return results;
  }

  async checkAllDeviceChecks() {
    try {
      const checks = await DeviceCheck.findAll({
        where: { isActive: true },
        include: [{ model: Device, as: "device" }],
      });

      logger.monitoring("Starting checks cycle", {
        count: checks.length,
      });

      const results = [];

      for (const check of checks) {
        const device = check.device;
        if (!device || !device.isActive) {
          continue;
        }

        try {
          const result = await this.checkDeviceCheck(check, device);
          results.push({ device: device.name, check: check.name, ...result });
        } catch (error) {
          logger.error(`Error checking ${check.name}:`, error);
          results.push({
            device: device.name,
            check: check.name,
            error: error.message,
          });
        }
      }

      logger.monitoring("Checks cycle completed", {
        checked: results.length,
        online: results.filter((r) => r.status === "online").length,
        offline: results.filter((r) => r.status === "offline").length,
        warning: results.filter((r) => r.status === "warning").length,
      });

      return results;
    } catch (error) {
      logger.error("Error in checks cycle:", error);
      throw error;
    }
  }

  async checkAllDevices() {
    return this.checkAllDeviceChecks();
  }

  async checkSingleCheck(checkId) {
    const check = await DeviceCheck.findByPk(checkId, {
      include: [{ model: Device, as: "device" }],
    });

    if (!check || !check.device) {
      throw new Error("Check not found");
    }

    return this.checkDeviceCheck(check, check.device);
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

      if (this.shouldSendEmail(level)) {
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

      logger.info(`${alerts.length} alerts resolved for device #${deviceId}`);
    } catch (error) {
      logger.error("Error resolving alerts:", error);
    }
  }

  async getStats() {
    try {
      const devices = await Device.findAll();
      const checks = await DeviceCheck.findAll();
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
        checks: {
          total: checks.length,
          online: checks.filter((c) => c.lastStatus === "online").length,
          offline: checks.filter((c) => c.lastStatus === "offline").length,
          warning: checks.filter((c) => c.lastStatus === "warning").length,
          unknown: checks.filter((c) => c.lastStatus === "unknown").length,
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

  async function handleDeviceOffline(device) {
    const users = await User.findAll({ where: { role: 'admin'} });

    for (const user of users) {
      await Notification.createDeviceOffline(device. user.id);

      websocketService.sendToUser(user.id, 'new-notification', {
        id: notification.id,
        type: 'alert',
        severity: 'critical',
        title: 'Device offline',
        message: `${device.name} is offline`,
        timestamp: new Date().toISOString(),
        read: false
      })
    }
  }

  async function handleDeviceRecovery(device) {
  const users = await User.findAll({ where: { role: 'admin' } });
  
  for (const user of users) {
    await Notification.createDeviceRecovery(device, user.id);
  }
}

// Response time alto
async function handleHighResponseTime(device, responseTime) {
  const users = await User.findAll({ where: { role: 'admin' } });
  
  for (const user of users) {
    await Notification.createHighResponseTime(device, responseTime, user.id);
  }
}

module.exports = new MonitoringService();
