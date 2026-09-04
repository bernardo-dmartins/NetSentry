const logger = require("../utils/logger");
const { AppError } = require("../errors/AppError");

const formatErrorResponse = (err, includeStack = false) => {
  const response = {
    success: false,
    error: {
      message: err.message,
      code: err.errorCode || "UNKNOWN_ERROR",
      statusCode: err.statusCode || 500,
      timestamp: err.timestamp || new Date().toISOString(),
    },
  };

  if (err.details) response.error.details = err.details;
  if (err.field) response.error.field = err.field;
  if (err.resource) response.error.resource = err.resource;
  if (err.retryAfter) response.error.retryAfter = err.retryAfter;

  if (includeStack && err.stack) {
    response.error.stack = err.stack;
  }

  return response;
};

const shouldIncludeStack = () => {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test" ||
    process.env.DEBUG_MODE === "true"
  );
};

const sanitizeErrorMessage = (err) => {
  if (err.isOperational) {
    return err.message;
  }

  return "An unexpected error occurred. Please try again later.";
};

const logError = (err, req) => {
  const errorLog = {
    message: err.message,
    code: err.errorCode || "UNKNOWN_ERROR",
    statusCode: err.statusCode || 500,
    stack: err.stack,
    isOperational: err.isOperational || false,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    userId: req.user?.id,
    username: req.user?.username,
    sessionId: req.user?.sessionId,
    timestamp: new Date().toISOString(),
  };

  if (err.statusCode === 400 && req.body) {
    const sanitizedBody = { ...req.body };
    delete sanitizedBody.password;
    delete sanitizedBody.oldPassword;
    delete sanitizedBody.newPassword;
    errorLog.requestBody = sanitizedBody;
  }

  if (err.statusCode >= 500) {
    logger.error("Server Error", errorLog);
  } else if (err.statusCode >= 400) {
    logger.warn("Client Error", errorLog);
  } else {
    logger.info("Error", errorLog);
  }
};

const handleSequelizeError = (err) => {
  const {
    ValidationError,
    UniqueConstraintError,
    ForeignKeyConstraintError,
  } = require("sequelize");

  if (err instanceof ValidationError) {
    const details = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));

    const AppErrors = require("../errors/AppError");
    return new AppErrors.ValidationError("Validation failed", details);
  }

  if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path || "field";
    const AppErrors = require("../errors/AppError");
    return new AppErrors.ConflictError(`${field} already exists`, field);
  }

  if (err instanceof ForeignKeyConstraintError) {
    const AppErrors = require("../errors/AppError");
    return new AppErrors.ValidationError(
      "Invalid reference to related resource",
    );
  }

  return err;
};

const handleJWTError = (err) => {
  const AppErrors = require("../errors/AppError");

  if (err.name === "JsonWebTokenError") {
    return new AppErrors.InvalidTokenError();
  }

  if (err.name === "TokenExpiredError") {
    return new AppErrors.TokenExpiredError();
  }

  return err;
};

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (
    err.name === "SequelizeValidationError" ||
    err.name === "SequelizeUniqueConstraintError" ||
    err.name === "SequelizeForeignKeyConstraintError"
  ) {
    error = handleSequelizeError(err);
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    error = handleJWTError(err);
  }

  if (!(error instanceof AppError)) {
    error = new (require("../errors/AppError").InternalServerError)(
      shouldIncludeStack() ? err.message : "Internal server error",
      false,
    );
    error.stack = err.stack;
  }

  if (!shouldIncludeStack() && !error.isOperational) {
    error.message = sanitizeErrorMessage(error);
  }

  logError(error, req);

  const response = formatErrorResponse(error, shouldIncludeStack());

  if (error.retryAfter) {
    res.setHeader("Retry-After", error.retryAfter);
  }

  res.status(error.statusCode).json(response);
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const notFoundHandler = (req, res, next) => {
  const AppErrors = require("../errors/AppError");
  const error = new AppErrors.NotFoundError("Endpoint");
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  logError,
};
