class AppError extends Error {
    constructor(message, statsCode, errorCode, isOperational = true) {
        super(message);

        this.statusCode = statsCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.timeStamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message = 'Validation failed', details = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', errorCode = 'AUTH_FAILED') {
        super(message, 401, errorCode);
    }
}

class TokenExpiredError extends AuthenticationError {
    constructor() {
       super('Token expired. Please log in again', 'TOKEN_EXPIRED') ;
    }
}

class InvalidTokenError extends AuthenticationError {
  constructor() {
    super('Invalid authentication token', 'INVALID_TOKEN');
  }
}

class SessionExpiredError extends AuthenticationError {
    constructor() {
        super('Session expired. Please log in again', 'SESSION_EXPIRED');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied', errorCode = 'FORBIDDEN') {
        super(message, 403, errorCode);
        }
    }

class AccountDeactivatedError extends AuthorizationError {
    constructor() {
        super('Account has been deactivated', 'ACCOUNT_DEACTIVATED');
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.resource = resource;
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists', field = null) {
        super(message, 409, 'CONFLICT');
        this.field = field;
    }
}

class RateLimitError extends AppError {
    constructor(retryAfter = 60) {
        super('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfter;
    }
}

class InternalServerError extends AppError {
    constructor(message = 'Internal server error', isOperational = false) {
        super(message, 500, 'INTERNAL_ERROR', isOperational);
    }
}

class ServiceUnavailableError extends AppError {
    constructor(service = 'Service') {
        super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
        this.service = service;
    }
}

class DatabaseError extends ServiceUnavailableError {
    constructor() {
        super('Database');
        this.errorCode = 'DATABASE_ERROR';
    }
}

class RedisError extends ServiceUnavailableError {
    constructor() {
        super('Cache service');
        this.errorCode = 'CACHE_ERROR';
    }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  TokenExpiredError,
  InvalidTokenError,
  SessionExpiredError,
  AuthorizationError,
  AccountDeactivatedError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  RedisError,
};