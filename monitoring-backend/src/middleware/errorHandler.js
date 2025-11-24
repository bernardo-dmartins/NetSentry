const logger = require('../utils/logger');

/**
 * Custom Error Class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Common HTTP error responses
 */
class HttpErrors {
  static badRequest(message = 'Bad Request') {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static unprocessableEntity(message = 'Unprocessable Entity') {
    return new ApiError(422, message);
  }

  static tooManyRequests(message = 'Too Many Requests') {
    return new ApiError(429, message);
  }

  static internalServer(message = 'Internal Server Error') {
    return new ApiError(500, message);
  }

  static serviceUnavailable(message = 'Service Unavailable') {
    return new ApiError(503, message);
  }
}

/**
 * Error converter - converts non-API errors to ApiError
 */
const errorConverter = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  next(error);
};

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Set default values
  if (!statusCode) {
    statusCode = 500;
  }

  if (!message) {
    message = 'Internal Server Error';
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Log error
  const errorLog = {
    message: err.message,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.username || 'anonymous',
    timestamp: new Date().toISOString()
  };

  if (statusCode >= 500) {
    logger.error('Server Error:', errorLog);
    if (err.stack) {
      logger.error('Stack trace:', err.stack);
    }
  } else if (statusCode >= 400) {
    logger.warn('Client Error:', errorLog);
  }

  // Prepare response
  const response = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString()
  };

  // Add additional info in development
  if (isDevelopment) {
    response.stack = err.stack;
    response.url = req.originalUrl;
    response.method = req.method;
  }

  // Send response
  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors (route not found)
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Async handler wrapper - catches errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler (for express-validator)
 */
const validationErrorHandler = (errors) => {
  const errorMessages = errors.array().map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value
  }));

  return new ApiError(400, 'Validation Error', true, JSON.stringify(errorMessages));
};

/**
 * Database error handler
 */
const handleDatabaseError = (err) => {
  let message = 'Database error occurred';
  let statusCode = 500;

  // Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    message = err.errors.map(e => e.message).join(', ');
    statusCode = 400;
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    message = 'A record with this value already exists';
    statusCode = 409;
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    message = 'Foreign key constraint violation';
    statusCode = 400;
  } else if (err.name === 'SequelizeDatabaseError') {
    message = 'Database query error';
    statusCode = 500;
  }

  return new ApiError(statusCode, message);
};

/**
 * JWT error handler
 */
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Token expired');
  }
  return new ApiError(401, 'Authentication failed');
};

/**
 * Centralized error handler for specific error types
 */
const errorTypeHandler = (err, req, res, next) => {
  let error = err;

  // Handle database errors
  if (err.name?.includes('Sequelize')) {
    error = handleDatabaseError(err);
  }
  
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }
  
  // Handle validation errors (express-validator)
  else if (err.array && typeof err.array === 'function') {
    error = validationErrorHandler(err);
  }

  next(error);
};

module.exports = {
  ApiError,
  HttpErrors,
  errorConverter,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  handleDatabaseError,
  handleJWTError,
  errorTypeHandler
};