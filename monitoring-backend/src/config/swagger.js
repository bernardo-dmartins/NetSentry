const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Monitoring System API',
      version: '1.0.0',
      description: 'API for real-time monitoring of hosts with alerts and notifications',
      contact: {
        name: 'Bernardo Martins',
        email: 'netsentry.app@gmail.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server'
      },
      {
        url: 'https://netsentry.onrender.com/',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            email: {
              type: 'string',
              description: 'User Email'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'If the user is active'
            }
          }
        },
        Device: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Device ID'
            },
            name: {
              type: 'string',
              description: 'Device name'
            },
            ip: {
              type: 'string',
              description: 'IP address'
            },
            type: {
              type: 'string',
              enum: ['server', 'database', 'switch', 'router', 'pc', 'other'],
              description: 'Device type'
            },
            status: {
              type: 'string',
              enum: ['online', 'offline', 'warning', 'unknown'],
              description: 'Current status'
            },
            responseTime: {
              type: 'integer',
              description: 'Response time'
            },
            lastCheck: {
              type: 'string',
              format: 'date-time',
              description: 'Last check'
            }
          }
        },
        Alert: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Alert ID'
            },
            device: {
              type: 'string',
              description: 'Device name'
            },
            message: {
              type: 'string',
              description: 'Alert message'
            },
            level: {
              type: 'string',
              enum: ['disaster', 'warning', 'information'],
              description: 'Severity level'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp'
            },
            acknowledged: {
              type: 'boolean',
              description: 'if it was recognized'
            }
          }
        },
        DeviceCheck: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Check ID' },
            deviceId: { type: 'integer', description: 'Device ID' },
            name: { type: 'string', description: 'Check name' },
            type: {
              type: 'string',
              enum: ['ping', 'tcp_port', 'http', 'ssl_certificate', 'dns', 'keyword_match']
            },
            isActive: { type: 'boolean' },
            isDefault: { type: 'boolean' },
            intervalSeconds: { type: 'integer' },
            timeoutMs: { type: 'integer' },
            warningThreshold: { type: 'integer' },
            criticalThreshold: { type: 'integer' },
            config: { type: 'object' },
            expected: { type: 'object' },
            lastStatus: {
              type: 'string',
              enum: ['online', 'offline', 'warning', 'unknown']
            },
            lastResponseTime: { type: 'integer' },
            lastCheckedAt: { type: 'string', format: 'date-time' }
          }
        },
        CheckResult: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            deviceCheckId: { type: 'integer' },
            status: {
              type: 'string',
              enum: ['online', 'offline', 'warning', 'unknown']
            },
            responseTime: { type: 'integer' },
            statusCode: { type: 'integer' },
            error: { type: 'string' },
            packetLoss: { type: 'number' },
            resolvedValue: { type: 'string' },
            metadata: { type: 'object' },
            checkedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and authorization'
      },
      {
        name: 'Devices',
        description: 'Device management'
      },
      {
        name: 'Alerts',
        description: 'Alerts management'
      },
      {
        name: 'Checks',
        description: 'Device checks'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};
