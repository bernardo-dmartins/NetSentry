const cron = require('node-cron');
const monitoringService = require('../services/monitoringService');
const emailService = require('../services/emailService');
const websocketService = require('../services/websocketService');
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');

class MonitoringJob {
  constructor() {
    this.jobs = [];
  }

  // Start all jobs
  start() {
    this.startDeviceMonitoring();
    this.startStatsUpdate();
    this.startDailyReport();
    this.startAlertCleanup();

    logger.info('Monitoring jobs started');
  }

  // Job: Monitor devices (every 30 seconds or as configured)
  startDeviceMonitoring() {
    const interval = process.env.MONITORING_INTERVAL || 30000; // 30 seconds
    const cronExpression = this.convertMillisecondsToCron(interval);

    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.debug('Executing monitoring cycle...');
        await monitoringService.checkAllDevices();

        // Broadcast updated statistics via WebSocket
        await websocketService.broadcastStats();

      } catch (error) {
        logger.error('Error in monitoring job:', error);
      }
    });

    this.jobs.push({ name: 'deviceMonitoring', job });
    logger.info(`Job 'deviceMonitoring' scheduled: ${cronExpression}`);
  }

  // Job: Update statistics via WebSocket (every 10 seconds)
  startStatsUpdate() {
    const job = cron.schedule('*/10 * * * * *', async () => {
      try {
        await websocketService.broadcastStats();
      } catch (error) {
        logger.error('Error updating stats:', error);
      }
    });

    this.jobs.push({ name: 'statsUpdate', job });
    logger.info('Job \'statsUpdate\' scheduled: every 10 seconds');
  }

  // Job: Send daily report (every day at 9h)
  startDailyReport() {
    const job = cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('Sending daily report...');

        const stats = await monitoringService.getStats();
        const devices = await Device.findAll();
        const alerts = await Alert.findAll({
          where: { resolved: false },
          order: [['timestamp', 'DESC']],
          limit: 10
        });

        await emailService.sendDailyReport(stats, devices, alerts);

        logger.info('Daily report sent successfully');

      } catch (error) {
        logger.error('Error sending daily report:', error);
      }
    });

    this.jobs.push({ name: 'dailyReport', job });
    logger.info('Job \'dailyReport\' scheduled: every day at 9h');
  }

  // Job: Limpar alertas antigos resolvidos (todo dia às 3h)
  startAlertCleanup() {
    const job = cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Clearing old alerts...');
        
        const { Op } = require('sequelize');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deletedCount = await Alert.destroy({
          where: {
            resolved: true,
            resolvedAt: {
              [Op.lt]: thirtyDaysAgo
            }
          }
        });

        logger.info(`${deletedCount} Old alerts removed`);
        
      } catch (error) {
        logger.error('Error clearing alerts:', error);
      }
    });

    this.jobs.push({ name: 'alertCleanup', job });
    logger.info('Job \'alertCleanup\' Scheduled: Every day at 3 AM');
  }

  // Convert milliseconds to cron expression
  convertMillisecondsToCron(ms) {
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) {
      return `*/${seconds} * * * * *`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `*/${minutes} * * * *`;
    }

    const hours = Math.floor(minutes / 60);
    return `0 */${hours} * * *`;
  }

  // Stop all jobs
  stop() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`Job '${name}' stopped`);
    });

    this.jobs = [];
    logger.info('All jobs have been stopped');
  }

  // Get status of jobs
  getStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.running || false
    }));
  }
}

module.exports = new MonitoringJob();