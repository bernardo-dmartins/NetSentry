require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Utilities and Configurations
const logger = require('./utils/logger');
const { testConnection, syncDatabase, sequelize } = require('./config/database');
const { specs, swaggerUi } = require('./config/swagger');
const redisClient = require('./config/redis');

// Services
const websocketService = require('./services/websocketService');
const monitoringJob = require('./jobs/monitoringJob');

// Routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const alertRoutes = require('./routes/alerts');

/**
 * Application class - Main application entry point
 * Handles server initialization, middleware setup, and graceful shutdown
 */
class Application {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = this.getPort();
    this.isShuttingDown = false;
    this.isRedisConnected = false; 
  }

  /**
   * Get port from environment or default
   */
  getPort() {
    return parseInt(process.env.PORT, 10) || 5000;
  }

  /**
   * Initialize application
   */
  async initialize() {
    try {
      logger.info('Initializing Monitoring System...');

      await this.setupDatabase();
      await this.setupRedis(); 
      this.setupMiddlewares();
      this.setupRoutes();
      this.setupWebSocket();
      this.setupBackgroundJobs();
      this.setupErrorHandlers();

      logger.info('Application initialized successfully');
    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  /**
   * Setup and test database connection
   */
  async setupDatabase() {
    try {
      const isConnected = await testConnection();

      if (!isConnected) {
        throw new Error('Database connection failed');
      }

      await syncDatabase(false);
      logger.info('Database connected and synchronized');
    } catch (error) {
      logger.error('Database setup failed:', error?.message || error);
      throw error;
    }
  }

  /**
   * Setup Redis connection
   */
  async setupRedis() {
    try {
      await redisClient.connect();
      
      // Test connection
      const pingResult = await redisClient.ping();
      
      if (pingResult) {
        this.isRedisConnected = true;
        logger.info('Redis connected and operational');
      } else {
        throw new Error('Redis ping failed');
      }
    } catch (error) {
      logger.error('Redis connection failed:', error?.message || error);
      logger.warn('Application will continue without Redis cache');
      logger.warn('Sessions and rate limiting will use fallback methods');
      this.isRedisConnected = false;
      // Don't throw error - Redis is optional for basic functionality
    }
  }

  /**
   * Configure Express middlewares
   */
  setupMiddlewares() {
    // Security
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: process.env.NODE_ENV === 'production'
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.setupRateLimiting();

    // Request logging
    this.setupRequestLogging();

    // Trust proxy
    this.app.set('trust proxy', 1);

    logger.info('Middlewares configured');
  }

  /**
   * Configure rate limiting
   */
  setupRateLimiting() {
    const isTest = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

    if (isTest) {
      logger.warn('Rate limiting DISABLED (test mode)');
      return; // No rate limiting applied
    }

    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 min
      max: isTest ? 1000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.'
      },
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.'
        });
      },
      // Skip rate limiting for health check and during test env or Cypress user agent
      skip: (req) => {
        if (req.path === '/health') return true;
        if (isTest) return true;
        const userAgent = req.get("user-agent") || "";
        if (userAgent.toLowerCase().includes("cypress")) return true;
        return false;
      }
    });

    // Apply rate limiter to all API routes
    this.app.use('/api/', limiter);
  }

  /**
   * Configure request logging
   */
  setupRequestLogging() {
    this.app.use((req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Log level based on status code
        const level = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 'info';
        
        logger[level](`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`, {
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      });

      next();
    });
  }

  /**
   * Configure application routes
   */
  setupRoutes() {
  // Health check
  this.app.get('/health', this.healthCheck.bind(this));

  // Redis health check (specific endpoint)
  this.app.get('/health/redis', this.redisHealthCheck.bind(this));

  // API documentation
  this.app.use('/api-docs', swaggerUi.serve);
  this.app.get('/api-docs', swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Monitoring System API Documentation'
  }));

  // API routes
  this.app.use('/api/auth', authRoutes);
  this.app.use('/api/devices', deviceRoutes);
  this.app.use('/api/alerts', alertRoutes);

  // Root endpoint
  this.app.get('/', this.rootEndpoint.bind(this));


  if (process.env.NODE_ENV === 'production') {
    const path = require('path');

    const frontendPath = path.join(__dirname, '../monitoring-frontend/build');

    // Servir arquivos estáticos do React
    this.app.use(express.static(frontendPath));

    // Qualquer rota que não seja API → enviar index.html
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }
 
  // 404 handler
  this.app.use(this.notFoundHandler.bind(this));

  logger.info('Routes configured');
}

  async healthCheck(req, res) {
    try {
      // Check database
      let dbStatus = 'unknown';
      try {
        await sequelize.authenticate();
        dbStatus = 'healthy';
      } catch (error) {
        dbStatus = 'unhealthy';
        logger.error('Database health check failed:', error);
      }

      // Check Redis
      let redisStatus = 'unknown';
      let redisInfo = null;
      
      if (this.isRedisConnected) {
        try {
          const pingResult = await redisClient.ping();
          redisStatus = pingResult ? 'healthy' : 'unhealthy';
          
          // Get Redis stats
          const stats = await redisClient.getStats();
          redisInfo = {
            connected: stats.connected,
            reconnectAttempts: stats.reconnectAttempts
          };
        } catch (error) {
          redisStatus = 'unhealthy';
          this.isRedisConnected = false;
        }
      } else {
        redisStatus = 'disconnected';
      }

      // Overall health
      const isHealthy = dbStatus === 'healthy';

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          unit: 'MB'
        },
        services: {
          database: dbStatus,
          redis: redisStatus,
          websocket: websocketService.isActive() ? 'active' : 'inactive'
        },
        ...(redisInfo && { redis: redisInfo }),
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(503).json({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Redis-specific health check
   */
  async redisHealthCheck(req, res) {
    try {
      if (!this.isRedisConnected) {
        return res.status(503).json({
          status: 'disconnected',
          message: 'Redis is not connected',
          timestamp: new Date().toISOString()
        });
      }

      const pingResult = await redisClient.ping();
      const stats = await redisClient.getStats();

      res.json({
        status: pingResult ? 'healthy' : 'unhealthy',
        connected: stats.connected,
        reconnectAttempts: stats.reconnectAttempts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Redis health check error:', error);
      res.status(503).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Root endpoint
   */
  rootEndpoint(req, res) {
    res.json({
      name: 'NetSentry Monitoring System API',
      version: process.env.APP_VERSION || '1.0.0',
      description: 'Real-time device monitoring system with alerts',
      documentation: '/api-docs',
      health: {
        general: '/health',
        redis: '/health/redis'
      },
      endpoints: {
        auth: '/api/auth',
        devices: '/api/devices',
        alerts: '/api/alerts'
      },
      features: {
        websocket: true,
        redis: this.isRedisConnected,
        cache: this.isRedisConnected,
        rateLimiting: true
      }
    });
  }

  /**
   * 404 handler
   */
  notFoundHandler(req, res) {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
      suggestion: 'Check /api-docs for available endpoints'
    });
  }

  /**
   * Setup WebSocket service
   */
  setupWebSocket() {
    websocketService.initialize(this.server);
    logger.info('WebSocket service initialized');
  }

  /**
   * Setup background jobs
   */
  setupBackgroundJobs() {
    monitoringJob.start();
    logger.info('Background jobs started');
  }

  /**
   * Configure error handlers
   */
  setupErrorHandlers() {
    // Express error handler
    this.app.use(this.errorHandler.bind(this));

    // Process error handlers
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));

    logger.info('Error handlers configured');
  }

  /**
   * Express error handler middleware
   */
  errorHandler(err, req, res, next) {
    logger.error('Application error:', {
      message: err?.message,
      stack: err?.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    const isDevelopment = process.env.NODE_ENV !== 'production';

    res.status(err.status || 500).json({
      success: false,
      message: isDevelopment ? err?.message : 'Internal server error',
      ...(isDevelopment && {
        stack: err?.stack,
        path: req.originalUrl
      })
    });
  }

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException(error) {
    logger.error('Uncaught Exception:', error);
    this.gracefulShutdown('UNCAUGHT_EXCEPTION');
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(reason, promise) {
    logger.error('Unhandled Promise Rejection:', { reason, promise });
    this.gracefulShutdown('UNHANDLED_REJECTION');
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    logger.error('Failed to initialize application:', error?.message || error);
    console.error(error);
    process.exit(1);
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();

      this.server.listen(this.port, () => {
        this.logServerInfo();
      });

      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Log server information
   */
  logServerInfo() {
    const border = '='.repeat(70);
    const redisStatus = this.isRedisConnected ? 'Connected' : 'Disconnected';
    
    console.log('');
    logger.info(border);
    logger.info('NetSentry Monitoring System Started');
    logger.info(border);
    logger.info(`Server:        http://localhost:${this.port}`);
    logger.info(`Documentation: http://localhost:${this.port}/api-docs`);
    logger.info(`WebSocket:     ws://localhost:${this.port}`);
    logger.info(`Health Check:  http://localhost:${this.port}/health`);
    logger.info(border);
    logger.info(`Environment:   ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Redis:         ${redisStatus}`);
    logger.info(`Cache:         ${this.isRedisConnected ? 'Enabled' : 'Disabled'}`);
    logger.info(`Rate Limit:   ${this.isRedisConnected ? 'Redis' : 'Memory'}`);
    logger.info(border);
    console.log('');
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  /**
   * Perform graceful shutdown
   */
  async gracefulShutdown(signal) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info(`\n Received ${signal}. Starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      logger.error('Shutdown timeout exceeded. Forcing exit...');
      process.exit(1);
    }, 30000); // 30 seconds timeout

    try {
      // Stop accepting new connections
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // Stop background jobs first
      monitoringJob.stop();
      logger.info('Background jobs stopped');

      // Close WebSocket connections
      websocketService.close();
      logger.info('WebSocket connections closed');

      // Close Redis connection
      if (this.isRedisConnected) {
        await redisClient.disconnect();
        logger.info('Redis connection closed');
      }

      // Close database connection last
      await sequelize.close();
      logger.info('Database connection closed');

      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed successfully\n');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }
}

// Create and start application
const application = new Application();

if (require.main === module) {
  application.start();
}

module.exports = application;
