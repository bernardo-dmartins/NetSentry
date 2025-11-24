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
        email: 'contato@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server'
      },
      {
        url: 'https://seu-app.railway.app',
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
              description: 'Divece ID'
            },
            name: {
              type: 'string',
              description: 'Device name'
            },
            ip: {
              type: 'string',
              description: 'IP adress'
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
        description: 'device management'
      },
      {
        name: 'Alerts',
        description: 'Alerts management'
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