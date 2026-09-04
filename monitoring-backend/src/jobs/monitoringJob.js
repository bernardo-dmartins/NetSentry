const cron = require("node-cron");
const { Op } = require("sequelize");
const monitoringService = require("../services/monitoringService");
const emailService = require("../services/emailService");
const websocketService = require("../services/websocketService");
const Device = require("../models/Device");
const DeviceCheck = require("../models/DeviceCheck");
const CheckResult = require("../models/CheckResult");
const Alert = require("../models/Alert");
const logger = require("../utils/logger");


class MonitoringJob {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
    this.activeChecks = new Set();
    this.maxConcurrentChecks = parseInt(process.env.MAX_CONCURRENT_CHECKS, 10) || 20;
    this.globalCycleInterval = parseInt(process.env.GLOBAL_CYCLE_INTERVAL, 10) || 10000;
    this.dataRetention = null;
    this.stats = {
      totalExecutions: 0,
      successfulChecks: 0,
      failedChecks: 0,
      skippedChecks: 0,
      lastCycleTime: 0,
      averageCheckTime: 0,
    };
  }

  start() {
    if (this.isRunning) {
      logger.warn("Monitoring jobs already running");
      return;
    }

    this.isRunning = true;

    this.startCheckMonitoring();
    this.startStatsUpdate();
    this.startDailyReport();
    this.startAlertCleanup();
    this.startCheckResultsCleanup();

    logger.info("Monitoring jobs started", {
      maxConcurrentChecks: this.maxConcurrentChecks,
      globalCycleInterval: this.globalCycleInterval,
    });
  }

  startCheckMonitoring() {
    const seconds = Math.max(1, Math.floor(this.globalCycleInterval / 1000));
    const cronExpression = `*/${seconds} * * * * *`;

    const job = cron.schedule(cronExpression, async () => {
      if (!this.isRunning) return;

      const cycleStart = Date.now();

      try {
        const now = new Date();
        const dueChecks = await DeviceCheck.findAll({
          where: {
            isActive: true,
            [Op.or]: [{ nextRunAt: null }, { nextRunAt: { [Op.lte]: now } }],
          },
          include: [
            {
              model: Device,
              as: "device",
              where: { isActive: true },
            },
          ],
          order: [["nextRunAt", "ASC"]],
        });

        if (dueChecks.length === 0) {
          return;
        }

        await this.executeChecksWithConcurrencyLimit(dueChecks);
        const stats = await monitoringService.getStats();
        await websocketService.broadcastStats(stats);

        this.stats.lastCycleTime = Date.now() - cycleStart;
      } catch (error) {
        logger.error("Error in monitoring cycle:", error);
      }
    });

    this.jobs.push({ name: "checkMonitoring", job });
    logger.info(`Job 'checkMonitoring' scheduled: ${cronExpression}`);
  }

  rescheduleCheckMonitoring() {
    const existingIndex = this.jobs.findIndex((item) => item.name === "checkMonitoring");
    if (existingIndex !== -1) {
      this.jobs[existingIndex].job.stop();
      this.jobs.splice(existingIndex, 1);
    }

    if (this.isRunning) {
      this.startCheckMonitoring();
    }
  }

  async executeChecksWithConcurrencyLimit(checks) {
    let index = 0;
    const workers = Array.from(
      { length: Math.min(this.maxConcurrentChecks, checks.length) },
      async () => {
        while (index < checks.length) {
          const check = checks[index++];
          await this.executeCheck(check);
        }
      }
    );

    await Promise.all(workers);
  }

  async executeCheck(check) {
    if (this.activeChecks.has(check.id)) {
      this.stats.skippedChecks++;
      return;
    }

    this.activeChecks.add(check.id);
    const startTime = Date.now();
    this.stats.totalExecutions++;

    try {
      const result = await monitoringService.checkDeviceCheck(check, check.device);
      const duration = Date.now() - startTime;

      if (result.status === "offline") {
        this.stats.failedChecks++;
      } else {
        this.stats.successfulChecks++;
      }

      this.stats.averageCheckTime =
        (this.stats.averageCheckTime * (this.stats.totalExecutions - 1) + duration) /
        this.stats.totalExecutions;

      return result;
    } catch (error) {
      this.stats.failedChecks++;
      logger.error(`Check ${check.id} failed:`, error);
      return null;
    } finally {
      this.activeChecks.delete(check.id);
    }
  }


  startStatsUpdate() {
    const job = cron.schedule("*/10 * * * * *", async () => {
      try {
        const stats = await monitoringService.getStats();
        await websocketService.broadcastStats(stats);
      } catch (error) {
        logger.error("Error updating stats:", error);
      }
    });

    this.jobs.push({ name: "statsUpdate", job });
    logger.info("Job 'statsUpdate' scheduled: every 10 seconds");
  }

  startDailyReport() {
    const job = cron.schedule("0 9 * * *", async () => {
      try {
        logger.info("Sending daily report...");

        const stats = await monitoringService.getStats();
        const devices = await Device.findAll();
        const alerts = await Alert.findAll({
          where: { resolved: false },
          order: [["timestamp", "DESC"]],
          limit: 10,
        });

        await emailService.sendDailyReport(stats, devices, alerts);

        logger.info("Daily report sent successfully");
      } catch (error) {
        logger.error("Error sending daily report:", error);
      }
    });

    this.jobs.push({ name: "dailyReport", job });
    logger.info("Job 'dailyReport' scheduled: every day at 9 AM");
  }

  startAlertCleanup() {
    const job = cron.schedule("0 3 * * *", async () => {
      try {
        logger.info("Cleaning up old alerts...");

        const retentionDays =
          this.dataRetention?.keepAlerts || 30;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - retentionDays);

        const deletedCount = await Alert.destroy({
          where: {
            resolved: true,
            resolvedAt: {
              [Op.lt]: thirtyDaysAgo,
            },
          },
        });

        logger.info(`${deletedCount} old alerts removed`);
      } catch (error) {
        logger.error("Error cleaning up alerts:", error);
      }
    });

    this.jobs.push({ name: "alertCleanup", job });
    logger.info("Job 'alertCleanup' scheduled: every day at 3 AM");
  }

  startCheckResultsCleanup() {
    const job = cron.schedule("0 4 * * *", async () => {
      try {
        logger.info("Cleaning up old check results...");

        const retentionDays =
          this.dataRetention?.keepMetrics ||
          parseInt(process.env.CHECK_RESULTS_RETENTION_DAYS, 10) ||
          90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const deletedCount = await CheckResult.destroy({
          where: {
            checkedAt: {
              [Op.lt]: cutoffDate,
            },
          },
        });

        logger.info(`${deletedCount} old check results removed`);
      } catch (error) {
        logger.error("Error cleaning up check results:", error);
      }
    });

    this.jobs.push({ name: "checkResultsCleanup", job });
    logger.info("Job 'checkResultsCleanup' scheduled: every day at 4 AM");
  }

  stop() {
    this.isRunning = false;

    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`Job '${name}' stopped`);
    });

    this.jobs = [];
    logger.info("All jobs have been stopped");
  }

  getStatus() {
    return {
      jobs: this.jobs.map(({ name, job }) => ({
        name,
        running: job.running || false,
      })),
      stats: {
        ...this.stats,
        activeChecks: this.activeChecks.size,
        maxConcurrentChecks: this.maxConcurrentChecks,
      },
      config: {
        globalCycleInterval: this.globalCycleInterval,
        maxConcurrentChecks: this.maxConcurrentChecks,
      },
    };
  }

  resetStats() {
    this.stats = {
      totalExecutions: 0,
      successfulChecks: 0,
      failedChecks: 0,
      skippedChecks: 0,
      lastCycleTime: 0,
      averageCheckTime: 0,
    };
    logger.info("Monitoring stats reset");
  }

  applySettings(settings) {
    if (!settings) return;

    const intervalSeconds = settings.monitoring?.interval;
    if (intervalSeconds) {
      const nextInterval = intervalSeconds * 1000;
      if (this.globalCycleInterval !== nextInterval) {
        this.globalCycleInterval = nextInterval;
        this.rescheduleCheckMonitoring();
      }
    }

    if (settings.dataRetention) {
      this.dataRetention = settings.dataRetention;
    }
  }
}

module.exports = new MonitoringJob();
