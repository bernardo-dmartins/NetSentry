const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const redisClient = require("../config/redis"); // ✅ ADICIONADO

// Helper de resposta para manter consistência
const sendError = (res, status, message) => {
  return res.status(status).json({ success: false, message });
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return sendError(res, 401, "Authentication token not provided");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return sendError(res, 401, "Invalid token");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return sendError(res, 401, "Token expired. Please log in again.");
      }
      return sendError(res, 401, "Invalid token");
    }

    // Verificar sessão no Redis
    if (decoded.sessionId) {
      const sessionData = await redisClient.getSession(decoded.sessionId);

      if (!sessionData) {
        return sendError(
          res,
          401,
          "Session expired or invalid. Please log in again."
        );
      }

      if (sessionData.userId !== decoded.id) {
        logger.warn(
          `Session mismatch: sessionId=${decoded.sessionId}, userId=${decoded.id}`
        );
        return sendError(res, 401, "Invalid session");
      }

      req.sessionData = sessionData;
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    logger.error("Erro no middleware de autenticação:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, "Authentication required");
  }

  if (req.user.role !== "admin") {
    logger.warn(`Unauthorized admin access by user: ${req.user.username}`);
    return sendError(
      res,
      403,
      "Access denied. Administrator privileges required."
    );
  }

  next();
};

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
        logger.debug("Optional auth: Invalid or expired token");
      }
    }

    next();
  } catch (error) {
    logger.error("Error in optionalAuth middleware:", error);
    next();
  }
};

const rateLimitMiddleware = (options = {}) => {
  const {
    windowMs = 60000,
    max = 100,
    message = "Too many requests. Try again later.",
    keyGenerator = (req) => req.ip || "unknown",
  } = options;

  // Skip rate limiting in test environment or from Cypress user agent
  const skipRateLimit = (req) => {
    if (process.env.NODE_ENV === "test") {
      return true;
    }
    const userAgent = req.get("user-agent") || "";
    if (userAgent.toLowerCase().includes("cypress")) {
      return true;
    }
    return false;
  };

  return async (req, res, next) => {
    try {
      if (skipRateLimit(req)) {
        return next();
      }
      const key = `ratelimit:${keyGenerator(req)}`;
      const requests = await redisClient.incr(key, Math.ceil(windowMs / 1000));

      if (requests === null) return next(); // Redis offline -> libera

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - requests));

      if (requests > max) {
        const ttl = await redisClient.ttl(key);
        res.setHeader("X-RateLimit-Reset", Date.now() + ttl * 1000);

        logger.warn(`Rate limit exceeded for ${key}`);
        return sendError(res, 429, message);
      }

      next();
    } catch (error) {
      logger.error("Error in rate limit middleware:", error);
      next(); // Em erro, libera
    }
  };
};

const activeUserMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(res, 401, "Authentication required");
    }

    const cacheKey = `user:active:${req.user.id}`;
    const isActive = await redisClient.get(cacheKey);

    if (isActive !== null) {
      if (!isActive) return sendError(res, 403, "User deactivated");
      return next();
    }

    const User = require("../models/User");
    const user = await User.findByPk(req.user.id);

    if (!user || !user.isActive) {
      await redisClient.set(cacheKey, false, 300);
      return sendError(res, 403, "User deactivated or not found");
    }

    await redisClient.set(cacheKey, true, 300);
    next();
  } catch (error) {
    logger.error("Error in activeUser middleware:", error);
    next(); // Em erro, não bloqueia
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  optionalAuth,
  rateLimitMiddleware,
  activeUserMiddleware,
};
