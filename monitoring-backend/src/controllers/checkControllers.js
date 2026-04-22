const { body, param, query, validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const DeviceCheck = require("../models/DeviceCheck");
const CheckResult = require("../models/CheckResult");
const Device = require("../models/Device");
const logger = require("../utils/logger");
const monitoringService = require("../services/monitoringService");

const CHECK_TYPES = [
  "ping",
  "packet_loss",
  "tcp_port",
  "http",
  "ssl_certificate",
  "dns",
  "keyword_match",
];
const DNS_RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];

const validateCheckSpecifics = (
  type,
  config = {},
  expected = {},
  thresholds = {}
) => {
  const errors = [];

  if (type === "tcp_port") {
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      errors.push({
        field: "config.port",
        message: "TCP port is required and must be between 1 and 65535",
      });
    }
  }

  if (type === "dns") {
    if (config.recordType && !DNS_RECORD_TYPES.includes(config.recordType)) {
      errors.push({
        field: "config.recordType",
        message: `DNS recordType must be one of: ${DNS_RECORD_TYPES.join(", ")}`,
      });
    }

    if (expected.values && !Array.isArray(expected.values)) {
      errors.push({
        field: "expected.values",
        message: "expected.values must be an array of strings",
      });
    }
  }

  if (type === "ssl_certificate") {
    if (config.port && (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)) {
      errors.push({
        field: "config.port",
        message: "SSL port must be between 1 and 65535",
      });
    }
  }

  if (type === "keyword_match") {
    const hasKeyword = typeof expected.keyword === "string" && expected.keyword.length > 0;
    const hasRegex = typeof expected.regex === "string" && expected.regex.length > 0;

    if (!hasKeyword && !hasRegex) {
      errors.push({
        field: "expected.keyword|expected.regex",
        message: "Provide expected.keyword or expected.regex for keyword_match",
      });
    }
  }

  if (type === "http" && expected.status !== undefined) {
    if (!Number.isInteger(expected.status) || expected.status < 100 || expected.status > 599) {
      errors.push({
        field: "expected.status",
        message: "expected.status must be a valid HTTP status code",
      });
    }
  }

  if (type === "packet_loss") {
    if (
      config.count !== undefined &&
      (!Number.isInteger(config.count) || config.count < 1 || config.count > 10)
    ) {
      errors.push({
        field: "config.count",
        message: "config.count must be an integer between 1 and 10",
      });
    }

    const warning = thresholds.warningThreshold;
    const critical = thresholds.criticalThreshold;

    if (warning !== null && warning !== undefined && (warning < 0 || warning > 100)) {
      errors.push({
        field: "warningThreshold",
        message: "warningThreshold must be between 0 and 100",
      });
    }

    if (critical !== null && critical !== undefined && (critical < 0 || critical > 100)) {
      errors.push({
        field: "criticalThreshold",
        message: "criticalThreshold must be between 0 and 100",
      });
    }

    if (
      warning !== null &&
      warning !== undefined &&
      critical !== null &&
      critical !== undefined &&
      warning >= critical
    ) {
      errors.push({
        field: "warningThreshold|criticalThreshold",
        message: "warningThreshold must be lower than criticalThreshold",
      });
    }
  }

  return errors;
};

class CheckController {
  static validateDeviceId = [param("id").isInt({ min: 1 }).toInt()];
  static validateId = [param("id").isInt({ min: 1 }).toInt()];

  static validateCreate = [
    param("id").isInt({ min: 1 }).toInt(),
    body("name").optional().isLength({ min: 3, max: 100 }).trim().escape(),
    body("type").isIn(CHECK_TYPES),
    body("isActive").optional().isBoolean().toBoolean(),
    body("isDefault").optional().isBoolean().toBoolean(),
    body("intervalSeconds")
      .optional()
      .isInt({ min: 10, max: 86400 })
      .toInt(),
    body("timeoutMs").optional().isInt({ min: 1000, max: 120000 }).toInt(),
    body("warningThreshold").optional().isInt({ min: 0 }).toInt(),
    body("criticalThreshold").optional().isInt({ min: 0 }).toInt(),
    body("config").optional().isObject(),
    body("expected").optional().isObject(),
  ];

  static validateUpdate = [
    param("id").isInt({ min: 1 }).toInt(),
    body("name").optional().isLength({ min: 3, max: 100 }).trim().escape(),
    body("type").optional().isIn(CHECK_TYPES),
    body("isActive").optional().isBoolean().toBoolean(),
    body("isDefault").optional().isBoolean().toBoolean(),
    body("intervalSeconds")
      .optional()
      .isInt({ min: 10, max: 86400 })
      .toInt(),
    body("timeoutMs").optional().isInt({ min: 1000, max: 120000 }).toInt(),
    body("warningThreshold").optional().isInt({ min: 0 }).toInt(),
    body("criticalThreshold").optional().isInt({ min: 0 }).toInt(),
    body("config").optional().isObject(),
    body("expected").optional().isObject(),
  ];

  static validateRun = [param("id").isInt({ min: 1 }).toInt()];

  static validateResults = [
    param("id").isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
  ];
  static validateHistory = [
    param("id").isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
    query("days").optional().isInt({ min: 1, max: 3650 }).toInt(),
  ];
  static validateStats = [
    param("id").isInt({ min: 1 }).toInt(),
    query("days").optional().isInt({ min: 1, max: 3650 }).toInt(),
  ];

  static async listByDevice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const deviceId = req.params.id;

      const device = await Device.findByPk(deviceId);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      const checks = await DeviceCheck.findAll({
        where: { deviceId },
        order: [["createdAt", "ASC"]],
      });

      res.json({ success: true, data: checks });
    } catch (error) {
      logger.error("Error listing checks:", error);
      res.status(500).json({ success: false, message: "Error listing checks" });
    }
  }

  static async createForDevice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const deviceId = req.params.id;
      const device = await Device.findByPk(deviceId);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      const payload = {
        deviceId,
        name: req.body.name || `${req.body.type} check`,
        type: req.body.type,
        isActive: req.body.isActive ?? true,
        isDefault: req.body.isDefault ?? false,
        intervalSeconds: req.body.intervalSeconds ?? 30,
        timeoutMs: req.body.timeoutMs ?? 5000,
        warningThreshold: req.body.warningThreshold ?? null,
        criticalThreshold: req.body.criticalThreshold ?? null,
        config: req.body.config || {},
        expected: req.body.expected || {},
      };

      const validationErrors = validateCheckSpecifics(
        payload.type,
        payload.config,
        payload.expected,
        {
          warningThreshold: payload.warningThreshold,
          criticalThreshold: payload.criticalThreshold,
        }
      );
      if (validationErrors.length) {
        return res.status(400).json({ success: false, errors: validationErrors });
      }

      if (payload.isDefault) {
        await DeviceCheck.update(
          { isDefault: false },
          { where: { deviceId, isDefault: true } }
        );
      }

      const check = await DeviceCheck.create(payload);

      res.status(201).json({
        success: true,
        message: "Check created successfully",
        data: check,
      });
    } catch (error) {
      logger.error("Error creating check:", error);
      res.status(500).json({ success: false, message: "Error creating check" });
    }
  }

  static async getById(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const check = await DeviceCheck.findByPk(id);

      if (!check) {
        return res.status(404).json({ success: false, message: "Check not found" });
      }

      res.json({ success: true, data: check });
    } catch (error) {
      logger.error("Error fetching check:", error);
      res.status(500).json({ success: false, message: "Error fetching check" });
    }
  }

  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const check = await DeviceCheck.findByPk(id);

      if (!check) {
        return res.status(404).json({ success: false, message: "Check not found" });
      }

      const updates = {
        name: req.body.name ?? check.name,
        type: req.body.type ?? check.type,
        isActive: req.body.isActive ?? check.isActive,
        isDefault: req.body.isDefault ?? check.isDefault,
        intervalSeconds: req.body.intervalSeconds ?? check.intervalSeconds,
        timeoutMs: req.body.timeoutMs ?? check.timeoutMs,
        warningThreshold: req.body.warningThreshold ?? check.warningThreshold,
        criticalThreshold: req.body.criticalThreshold ?? check.criticalThreshold,
        config: req.body.config ?? check.config,
        expected: req.body.expected ?? check.expected,
      };

      const validationErrors = validateCheckSpecifics(
        updates.type,
        updates.config,
        updates.expected,
        {
          warningThreshold: updates.warningThreshold,
          criticalThreshold: updates.criticalThreshold,
        }
      );
      if (validationErrors.length) {
        return res.status(400).json({ success: false, errors: validationErrors });
      }

      if (updates.isDefault && !check.isDefault) {
        await DeviceCheck.update(
          { isDefault: false },
          { where: { deviceId: check.deviceId, isDefault: true } }
        );
      }

      await check.update(updates);

      res.json({
        success: true,
        message: "Check updated successfully",
        data: check,
      });
    } catch (error) {
      logger.error("Error updating check:", error);
      res.status(500).json({ success: false, message: "Error updating check" });
    }
  }

  static async delete(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const check = await DeviceCheck.findByPk(id);

      if (!check) {
        return res.status(404).json({ success: false, message: "Check not found" });
      }

      await check.destroy();

      res.json({ success: true, message: "Check deleted successfully" });
    } catch (error) {
      logger.error("Error deleting check:", error);
      res.status(500).json({ success: false, message: "Error deleting check" });
    }
  }

  static async run(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const result = await monitoringService.checkSingleCheck(id);

      res.json({
        success: true,
        message: "Check executed",
        data: result,
      });
    } catch (error) {
      logger.error("Error running check:", error);
      res.status(500).json({ success: false, message: "Error running check" });
    }
  }

  static async results(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const limit = req.query.limit || 50;

      const check = await DeviceCheck.findByPk(id);
      if (!check) {
        return res.status(404).json({ success: false, message: "Check not found" });
      }

      const results = await CheckResult.findAll({
        where: { deviceCheckId: id },
        order: [["checkedAt", "DESC"]],
        limit,
      });

      res.json({ success: true, data: results });
    } catch (error) {
      logger.error("Error fetching check results:", error);
      res.status(500).json({ success: false, message: "Error fetching check results" });
    }
  }

  static async history(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const limit = req.query.limit || 100;
      const days = req.query.days;

      const check = await DeviceCheck.findByPk(id);
      if (!check) {
        return res.status(404).json({ success: false, message: "Check not found" });
      }

      const where = { deviceCheckId: id };
      if (days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        where.checkedAt = { [Op.gte]: cutoff };
      }

      const results = await CheckResult.findAll({
        where,
        order: [["checkedAt", "DESC"]],
        limit,
      });

      res.json({ success: true, data: results });
    } catch (error) {
      logger.error("Error fetching check history:", error);
      res.status(500).json({ success: false, message: "Error fetching check history" });
    }
  }

  static async stats(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const days = req.query.days || 7;

      const check = await DeviceCheck.findByPk(id);
      if (!check) {
        return res.status(404).json({ success: false, message: "Check not found" });
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const resultsByStatus = await CheckResult.findAll({
        where: {
          deviceCheckId: id,
          checkedAt: { [Op.gte]: cutoff },
        },
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["status"],
      });

      const responseStats = await CheckResult.findOne({
        where: {
          deviceCheckId: id,
          checkedAt: { [Op.gte]: cutoff },
          responseTime: { [Op.ne]: null },
        },
        attributes: [
          [sequelize.fn("AVG", sequelize.col("responseTime")), "avgResponseTime"],
          [sequelize.fn("MIN", sequelize.col("responseTime")), "minResponseTime"],
          [sequelize.fn("MAX", sequelize.col("responseTime")), "maxResponseTime"],
        ],
      });

      const counts = { online: 0, offline: 0, warning: 0, unknown: 0, total: 0 };
      resultsByStatus.forEach((row) => {
        const status = row.get("status");
        const count = parseInt(row.get("count"), 10);
        counts[status] = count;
        counts.total += count;
      });

      const uptime =
        counts.total > 0 ? (counts.online / counts.total) * 100 : null;

      res.json({
        success: true,
        data: {
          windowDays: days,
          counts,
          uptime,
          responseTime: {
            average: Math.round(responseStats?.get("avgResponseTime") || 0),
            min: responseStats?.get("minResponseTime") || 0,
            max: responseStats?.get("maxResponseTime") || 0,
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching check stats:", error);
      res.status(500).json({ success: false, message: "Error fetching check stats" });
    }
  }
}

module.exports = CheckController;
