const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const redisClient = require("../config/redis");
const { asyncHandler } = require("./errorHandler");
const {
  AuthenticationError,
  TokenExpiredError,
  InvalidTokenError,
  SessionExpiredError,
  InsufficientPermissionsError,
  AccountDeactivatedError,
  RateLimitError,
} = require("../errors/AppError");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    throw new AuthenticationError(
      "Authentication token not provided",
      "TOKEN_MISSING",
    );
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new InvalidTokenError();
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
  }

  if (decoded.sessionId) {
    const sessionData = await redisClient.getSession(decoded.sessionId);

    if (!sessionData) {
      throw new SessionExpiredError();
    }

    if (sessionData.userId !== decoded.id) {
      logger.warn("Session mismatch detected", {
        sessionId: decoded.sessionId,
        tokenUserId: decoded.id,
        sessionUserId: sessionData.userId,
        ip: req.ip,
      });
      throw new SessionExpiredError();
    }

    req.sessionData = sessionData;
  }

  req.user = decoded;
  req.token = token;
  next();
});

const adminMiddleware = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required", "AUTH_REQUIRED");
  }

  if (req.user.role !== "admin") {
    logger.warn("Unauthorized admin access attempt", {
      userId: req.user.id,
      username: req.user.username,
      ip: req.ip,
      path: req.originalUrl,
    });
    throw new InsufficientPermissionsError();
  }

  next();
});

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.sessionId) {
          const sessionData = await redisClient.getSession(decoded.sessionId);

          if (sessionData && sessionData.userId === decoded.id) {
            req.user = decoded;
            req.sessionData = sessionData;
          }
        } else {
          req.user = decoded;
        }
      } catch (err) {
        logger.debug("Optional auth: Invalid or expired token", {
          error: err.message,
          ip: req.ip,
        });
      }
    }

    next();
  } catch (error) {
    logger.error("Error in optionalAuth middleware", {
      error: error.message,
      stack: error.stack,
    });
    next();
  }
};

const rateLimitMiddleware = (options = {}) => {
  const {
    windowMs = 60000,
    max = 100,
    message = "Too many requests. Please try again later.",
    keyGenerator = (req) => req.ip || "unknown",
  } = options;

  const skipRateLimit = (req) => {
    if (process.env.NODE_ENV === "test") return true;
    if (process.env.DISABLE_RATE_LIMIT === "true") return true;

    const userAgent = req.get("user-agent") || "";
    if (userAgent.toLowerCase().includes("cypress")) return true;

    return false;
  };

  return asyncHandler(async (req, res, next) => {
    if (skipRateLimit(req)) {
      return next();
    }

    const key = `ratelimit:${keyGenerator(req)}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      const requests = await redisClient.incr(key, windowSeconds);

      if (requests === null) {
        logger.warn("Rate limiting disabled - Redis unavailable");
        return next();
      }

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - requests));

      if (requests > max) {
        const ttl = await redisClient.ttl(key);
        const retryAfter = Math.max(ttl, 60);

        res.setHeader("X-RateLimit-Reset", Date.now() + ttl * 1000);

        logger.warn("Rate limit exceeded", {
          key,
          requests,
          limit: max,
          ip: req.ip,
          path: req.originalUrl,
        });

        throw new RateLimitError(retryAfter);
      }

      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }

      logger.error("Error in rate limit middleware", {
        error: error.message,
        stack: error.stack,
      });
      next();
    }
  });
};

const activeUserMiddleware = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required", "AUTH_REQUIRED");
  }

  const cacheKey = `user:active:${req.user.id}`;

  try {
    const isActive = await redisClient.get(cacheKey);

    if (isActive !== null) {
      if (!isActive) {
        throw new AccountDeactivatedError();
      }
      return next();
    }

    const User = require("../models/User");
    const user = await User.findByPk(req.user.id);

    if (!user || !user.isActive) {
      await redisClient.set(cacheKey, false, 300);
      throw new AccountDeactivatedError();
    }

    await redisClient.set(cacheKey, true, 300);
    next();
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      throw error;
    }

    logger.error("Error checking user active status", {
      userId: req.user.id,
      error: error.message,
    });
    next();
  }
});

module.exports = {
  authMiddleware,
  adminMiddleware,
  optionalAuth,
  rateLimitMiddleware,
  activeUserMiddleware,
};
