const { Op } = require("sequelize");
const Device = require("../models/Device");
const DeviceCheck = require("../models/DeviceCheck");
const CheckResult = require("../models/CheckResult");
const logger = require("../utils/logger");

const RANGE_CONFIG = {
  "24h": { hours: 24, bucketMinutes: 60 },
  "7d": { days: 7, bucketMinutes: 60 * 24 },
  "30d": { days: 30, bucketMinutes: 60 * 24 },
};

const normalizeRange = (range) => (RANGE_CONFIG[range] ? range : "24h");

const buildBuckets = (start, end, bucketMinutes) => {
  const bucketMs = bucketMinutes * 60 * 1000;
  const buckets = [];
  let current = new Date(Math.floor(start.getTime() / bucketMs) * bucketMs);
  const endTime = end.getTime();

  while (current.getTime() <= endTime) {
    buckets.push(current.getTime());
    current = new Date(current.getTime() + bucketMs);
  }

  return buckets;
};

class AnalyticsController {
  static async overview(req, res) {
    try {
      const range = normalizeRange(req.query.range);
      const config = RANGE_CONFIG[range];

      const now = new Date();
      const start = new Date(now);

      if (config.hours) {
        start.setHours(start.getHours() - config.hours);
      }
      if (config.days) {
        start.setDate(start.getDate() - config.days);
      }

      const bucketMs = config.bucketMinutes * 60 * 1000;
      const bucketKeys = buildBuckets(start, now, config.bucketMinutes);
      const bucketMap = new Map();

      bucketKeys.forEach((time) => {
        bucketMap.set(time, {
          time: new Date(time).toISOString(),
          total: 0,
          online: 0,
          responseSum: 0,
          responseCount: 0,
          responseMin: null,
          responseMax: null,
        });
      });

      const results = await CheckResult.findAll({
        where: {
          checkedAt: { [Op.gte]: start },
        },
        include: [
          {
            model: DeviceCheck,
            as: "check",
            include: [{ model: Device, as: "device" }],
          },
        ],
        order: [["checkedAt", "ASC"]],
      });

      let totalCount = 0;
      let totalOnline = 0;
      let totalIncidents = 0;
      let responseSum = 0;
      let responseCount = 0;
      let responseMin = null;
      let responseMax = null;
      let intervalSum = 0;
      let intervalCount = 0;

      const deviceMap = new Map();

      results.forEach((result) => {
        const checkedAt = new Date(result.checkedAt);
        const bucketKey = Math.floor(checkedAt.getTime() / bucketMs) * bucketMs;
        const bucket = bucketMap.get(bucketKey);
        if (bucket) {
          bucket.total += 1;
          if (result.status === "online") {
            bucket.online += 1;
          }
          if (result.responseTime !== null && result.responseTime !== undefined) {
            bucket.responseSum += result.responseTime;
            bucket.responseCount += 1;
            bucket.responseMin =
              bucket.responseMin === null
                ? result.responseTime
                : Math.min(bucket.responseMin, result.responseTime);
            bucket.responseMax =
              bucket.responseMax === null
                ? result.responseTime
                : Math.max(bucket.responseMax, result.responseTime);
          }
        }

        totalCount += 1;
        if (result.status === "online") {
          totalOnline += 1;
        } else if (result.status === "offline" || result.status === "warning") {
          totalIncidents += 1;
        }

        if (result.responseTime !== null && result.responseTime !== undefined) {
          responseSum += result.responseTime;
          responseCount += 1;
          responseMin =
            responseMin === null
              ? result.responseTime
              : Math.min(responseMin, result.responseTime);
          responseMax =
            responseMax === null
              ? result.responseTime
              : Math.max(responseMax, result.responseTime);
        }

        if (result.check?.intervalSeconds) {
          intervalSum += result.check.intervalSeconds;
          intervalCount += 1;
        }

        const device = result.check?.device;
        if (device) {
          if (!deviceMap.has(device.id)) {
            deviceMap.set(device.id, { name: device.name, total: 0, online: 0 });
          }
          const entry = deviceMap.get(device.id);
          entry.total += 1;
          if (result.status === "online") {
            entry.online += 1;
          }
        }
      });

      const uptimeSeries = [];
      const responseTimeSeries = [];

      bucketKeys.forEach((time) => {
        const bucket = bucketMap.get(time);
        const uptime =
          bucket.total > 0 ? (bucket.online / bucket.total) * 100 : 0;
        uptimeSeries.push({
          time: bucket.time,
          uptime: Number(uptime.toFixed(2)),
        });

        const avgResponse =
          bucket.responseCount > 0
            ? bucket.responseSum / bucket.responseCount
            : 0;

        responseTimeSeries.push({
          time: bucket.time,
          avg: Math.round(avgResponse),
          min: bucket.responseMin || 0,
          max: bucket.responseMax || 0,
        });
      });

      const averageUptime =
        totalCount > 0 ? (totalOnline / totalCount) * 100 : 0;
      const avgResponseTime =
        responseCount > 0 ? responseSum / responseCount : 0;

      const avgIntervalSeconds =
        intervalCount > 0 ? intervalSum / intervalCount : 30;
      const totalDowntimeMinutes = (totalIncidents * avgIntervalSeconds) / 60;

      const deviceUptime = Array.from(deviceMap.entries()).map(([id, data]) => {
        const uptime =
          data.total > 0 ? (data.online / data.total) * 100 : 0;
        return {
          id,
          name: data.name,
          uptime: Number(uptime.toFixed(2)),
          downtime: Number((100 - uptime).toFixed(2)),
        };
      });

      deviceUptime.sort((a, b) => b.uptime - a.uptime);

      res.json({
        success: true,
        data: {
          range,
          stats: {
            averageUptime: Number(averageUptime.toFixed(2)),
            avgResponseTime: Number(avgResponseTime.toFixed(2)),
            totalIncidents,
            totalDowntimeMinutes: Number(totalDowntimeMinutes.toFixed(2)),
          },
          uptimeSeries,
          responseTimeSeries,
          deviceUptime,
        },
      });
    } catch (error) {
      logger.error("Error loading analytics overview:", error);
      res.status(500).json({
        success: false,
        message: "Error loading analytics overview",
      });
    }
  }
}

module.exports = AnalyticsController;
