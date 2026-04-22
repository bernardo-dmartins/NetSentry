require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
require("./models");

const logger = require("./utils/logger");
const {
  testConnection,
  syncDatabase,
  sequelize,
} = require("./config/database");
const { specs, swaggerUi } = require("./config/swagger");
const redisClient = require("./config/redis");

const websocketService = require("./services/websocketService");
const monitoringJob = require("./jobs/monitoringJob");
const emailService = require("./services/emailService");

const authRoutes = require("./routes/auth");
const deviceRoutes = require("./routes/devices");
const alertRoutes = require("./routes/alerts");
const checkRoutes = require("./routes/checks");
const settingRoutes = require("./routes/settings");
const analyticsRoutes = require("./routes/analytics");
const notificationsRoutes = require ("./routes/notifications")
const { rateLimitMiddleware } = require("./middleware/authJWT");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

class Application {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = this.getPort();
    this.isShuttingDown = false;
    this.isRedisConnected = false;
  }

  getPort() {
    return parseInt(process.env.PORT, 10) || 5000;
  }

  async initialize() {
    try {
      logger.info("Initializing Monitoring System...");

      await this.setupDatabase();
      await this.setupRedis();
      this.setupEmailService();
      this.setupMiddlewares();
      this.setupRoutes();
      this.setupWebSocket();
      this.setupBackgroundJobs();
      this.setupErrorHandlers();

      logger.info("Application initialized successfully");
    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  async setupDatabase() {
    try {
      const isConnected = await testConnection();

      if (!isConnected) {
        throw new Error("Database connection failed");
      }

      await syncDatabase(false);
      logger.info("Database connected and synchronized");
    } catch (error) {
      logger.error("Database setup failed:", error?.message || error);
      throw error;
    }
  }

  async setupRedis() {
    try {
      await redisClient.connect();

      const pingResult = await redisClient.ping();

      if (pingResult) {
        this.isRedisConnected = true;
        logger.info("Redis connected and operational");
      } else {
        throw new Error("Redis ping failed");
      }
    } catch (error) {
      logger.error("Redis connection failed:", error?.message || error);
      logger.warn("Application will continue without Redis cache");
      logger.warn("Sessions and rate limiting will use fallback methods");
      this.isRedisConnected = false;
    }
  }

  setupEmailService() {
    emailService.initialize();

    if (emailService.isInitialized()) {
      logger.info("Email service initialized and ready");
      return;
    }

    logger.warn("Email service disabled (missing or invalid SMTP config)");
  }

  setupMiddlewares() {
    this.app.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: process.env.NODE_ENV === "production",
      }),
    );

    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "https://netsentry.onrender.com",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    );

    this.app.use(compression());

    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    this.setupRateLimiting();

    this.setupRequestLogging();

    this.app.set("trust proxy", 1);

    logger.info("Middlewares configured");
  }

  setupRateLimiting() {
    const isTest =
      process.env.NODE_ENV === "test" ||
      process.env.DISABLE_RATE_LIMIT === "true";

    if (isTest) {
      logger.warn("Rate limiting DISABLED (test mode)");
      return;
    }

    this.app.use(
      "/api/",
      rateLimitMiddleware({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
        message: "Too many requests from this IP. Please try again later.",
        keyGenerator: (req) => req.ip || "unknown",
      }),
    );
  }

  setupRequestLogging() {
    this.app.use((req, res, next) => {
      const start = Date.now();

      res.on("finish", () => {
        const duration = Date.now() - start;

        const level =
          res.statusCode >= 500
            ? "error"
            : res.statusCode >= 400
              ? "warn"
              : "info";

        logger[level](
          `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`,
          {
            ip: req.ip,
            userAgent: req.get("user-agent"),
          },
        );
      });

      next();
    });
  }

  setupRoutes() {
    this.app.get("/health", this.healthCheck.bind(this));

    this.app.get("/health/redis", this.redisHealthCheck.bind(this));

    this.app.use("/api-docs", swaggerUi.serve);
    this.app.get(
      "/api-docs",
      swaggerUi.setup(specs, {
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Monitoring System API Documentation",
      }),
    );

    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/devices", deviceRoutes);
    this.app.use("/api/alerts", alertRoutes);
    this.app.use("/api/checks", checkRoutes);
    this.app.use('/api/settings', settingRoutes);
    this.app.use("/api/analytics", analyticsRoutes);
    this.app.use("/api/notifications", notificationsRoutes);

    if (process.env.NODE_ENV === "production") {
      const path = require("path");

      const frontendPath = path.join(
        __dirname,
        "..",
        "..",
        "monitoring-frontend",
        "build",
      );

      this.app.use(express.static(frontendPath));

      this.app.use((req, res, next) => {
        if (req.method !== "GET") return next();

        const blocked = [
          "/api",
          "/api-docs",
          "/health",
          "/static",
          "/favicon.ico",
        ];

        for (const prefix of blocked) {
          if (req.path.startsWith(prefix)) {
            return next();
          }
        }

        return res.sendFile(path.join(frontendPath, "index.html"));
      });
    }

    this.app.use(notFoundHandler);

    this.app.use(errorHandler);

    logger.info("Routes configured");
  }

  async healthCheck(req, res) {
    try {
      let dbStatus = "unknown";
      try {
        await sequelize.authenticate();
        dbStatus = "healthy";
      } catch (error) {
        dbStatus = "unhealthy";
        logger.error("Database health check failed:", error);
      }

      let redisStatus = "unknown";
      let redisInfo = null;

      if (this.isRedisConnected) {
        try {
          const pingResult = await redisClient.ping();
          redisStatus = pingResult ? "healthy" : "unhealthy";

          const stats = await redisClient.getStats();
          redisInfo = {
            connected: stats.connected,
            reconnectAttempts: stats.reconnectAttempts,
          };
        } catch (error) {
          redisStatus = "unhealthy";
          this.isRedisConnected = false;
        }
      } else {
        redisStatus = "disconnected";
      }

      const isHealthy = dbStatus === "healthy";

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          unit: "MB",
        },
        services: {
          database: dbStatus,
          redis: redisStatus,
          websocket: websocketService.isActive() ? "active" : "inactive",
        },
        ...(redisInfo && { redis: redisInfo }),
        version: process.env.APP_VERSION || "1.0.0",
        environment: process.env.NODE_ENV || "development",
      });
    } catch (error) {
      logger.error("Health check error:", error);
      res.status(503).json({
        status: "error",
        message: "Health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  }

  async redisHealthCheck(req, res) {
    try {
      if (!this.isRedisConnected) {
        return res.status(503).json({
          status: "disconnected",
          message: "Redis is not connected",
          timestamp: new Date().toISOString(),
        });
      }

      const pingResult = await redisClient.ping();
      const stats = await redisClient.getStats();

      res.json({
        status: pingResult ? "healthy" : "unhealthy",
        connected: stats.connected,
        reconnectAttempts: stats.reconnectAttempts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Redis health check error:", error);
      res.status(503).json({
        status: "error",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  rootEndpoint(req, res) {
    res.json({
      name: "NetSentry Monitoring System API",
      version: process.env.APP_VERSION || "1.0.0",
      description: "Real-time device monitoring system with alerts",
      documentation: "/api-docs",
      health: {
        general: "/health",
        redis: "/health/redis",
      },
      endpoints: {
        auth: "/api/auth",
        devices: "/api/devices",
        alerts: "/api/alerts",
      },
      features: {
        websocket: true,
        redis: this.isRedisConnected,
        cache: this.isRedisConnected,
        rateLimiting: true,
      },
    });
  }

  setupWebSocket() {
    websocketService.initialize(this.server);
    logger.info("WebSocket service initialized");
  }

  setupBackgroundJobs() {
    monitoringJob.start();
    logger.info("Background jobs started");
  }

  setupErrorHandlers() {
    process.on("uncaughtException", this.handleUncaughtException.bind(this));
    process.on("unhandledRejection", this.handleUnhandledRejection.bind(this));

    logger.info("Error handlers configured");
  }

  handleUncaughtException(error) {
    logger.error("Uncaught Exception:", error);
    this.gracefulShutdown("UNCAUGHT_EXCEPTION");
  }

  handleUnhandledRejection(reason, promise) {
    logger.error("Unhandled Promise Rejection:", { reason, promise });
    this.gracefulShutdown("UNHANDLED_REJECTION");
  }

  handleInitializationError(error) {
    logger.error("Failed to initialize application:", error?.message || error);
    console.error(error);
    process.exit(1);
  }

  async start() {
    try {
      await this.initialize();

      const HOST = "0.0.0.0";

      this.server.listen(this.port, HOST, () => {
        this.logServerInfo();
      });

      this.setupGracefulShutdown();
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  logServerInfo() {
    const border = "=".repeat(70);
    const redisStatus = this.isRedisConnected ? "Connected" : "Disconnected";

    console.log("");
    logger.info(border);
    logger.info("NetSentry Monitoring System Started");
    logger.info(border);
    logger.info(`Server:        http://localhost:${this.port}`);
    logger.info(`Documentation: http://localhost:${this.port}/api-docs`);
    logger.info(`WebSocket:     ws://localhost:${this.port}`);
    logger.info(`Health Check:  http://localhost:${this.port}/health`);
    logger.info(border);
    logger.info(`Environment:   ${process.env.NODE_ENV || "development"}`);
    logger.info(`Redis:         ${redisStatus}`);
    logger.info(
      `Cache:         ${this.isRedisConnected ? "Enabled" : "Disabled"}`,
    );
    logger.info(`Rate Limit:   ${this.isRedisConnected ? "Redis" : "Memory"}`);
    logger.info(border);
    console.log("");
  }

  setupGracefulShutdown() {
    process.on("SIGTERM", () => this.gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => this.gracefulShutdown("SIGINT"));
  }

  async gracefulShutdown(signal) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info(`\n Received ${signal}. Starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      logger.error("Shutdown timeout exceeded. Forcing exit...");
      process.exit(1);
    }, 30000);

    try {
      this.server.close(() => {
        logger.info("HTTP server closed");
      });

      monitoringJob.stop();
      logger.info("Background jobs stopped");

      websocketService.close();
      logger.info("WebSocket connections closed");

      if (this.isRedisConnected) {
        await redisClient.disconnect();
        logger.info("Redis connection closed");
      }

      await sequelize.close();
      logger.info("Database connection closed");

      clearTimeout(shutdownTimeout);
      logger.info("Graceful shutdown completed successfully\n");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown:", error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }
}

const application = new Application();

if (require.main === module) {
  application.start();
}

module.exports = application;
