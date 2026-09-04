const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '../../logs');

try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (err) {
  console.error('Falha ao criar diretório de logs:', err);
  process.exit(1);
}

const VALID_LEVELS = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
const logLevel = VALID_LEVELS.includes(process.env.LOG_LEVEL)
  ? process.env.LOG_LEVEL
  : 'info';

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return stack
      ? `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}\n${stack}`
      : `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }), // só hora no terminal
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    // Exibe stack apenas em desenvolvimento
    const stackStr = stack && process.env.NODE_ENV !== 'production' ? `\n${stack}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}${stackStr}`;
  })
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
    // Silencia completamente o console em testes
    silent: process.env.NODE_ENV === 'test',
  }),

  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880,
    maxFiles: 10,
  }),
];

const logger = winston.createLogger({
  level: logLevel,
  transports,
});

// Métodos auxiliares 
logger.monitoring = (action, details = {}) => {
  logger.info(`[MONITORING] ${action}`, { ...details });
};

logger.auth = (action, user) => {
  logger.info(`[AUTH] ${action}`, { user: user?.username || user });
};

logger.websocket = (event, data = {}) => {
  // Usa verbose em vez de debug para aparecer com LOG_LEVEL=verbose sem ligar tudo
  logger.verbose(`[WEBSOCKET] ${event}`, data);
};

logger.email = (action, recipient) => {
  logger.info(`[EMAIL] ${action}`, { recipient });
};

module.exports = logger;