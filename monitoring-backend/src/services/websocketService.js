const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Device = require('../models/Device');
const Alert = require('../models/Alert');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // Map de socketId para info do cliente
    this.deviceSubscriptions = new Map(); // Map de deviceId para array de socketIds
  }

  /**
   * Inicializar servidor Socket.IO
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Middleware de autenticação
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        logger.warn('WebSocket connection attempt without token');
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.username = decoded.username;
        socket.role = decoded.role;
        logger.debug(`Token verified for user: ${decoded.username}`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // Evento de conexão
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('Socket.IO service initialized successfully');
  }

  /**
   * Lidar com nova conexão
   */
  handleConnection(socket) {
    logger.info(`WebSocket client connected: ${socket.username} (${socket.id})`);
    
    // Registrar cliente conectado
    this.connectedClients.set(socket.id, {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      role: socket.role,
      connectedAt: new Date(),
      subscriptions: []
    });

    // Enviar confirmação de autenticação
    socket.emit('auth:success', {
      message: 'Authentication successful',
      username: socket.username,
      role: socket.role
    });

    // Configurar listeners de eventos
    this.setupEventListeners(socket);

    // Log de estatísticas
    logger.debug(`Total connected clients: ${this.connectedClients.size}`);
  }

  /**
   * Configurar listeners de eventos do socket
   */
  setupEventListeners(socket) {
    // Subscrever a atualizações de um device específico
    socket.on('device:subscribe', (deviceId) => {
      this.handleDeviceSubscribe(socket, deviceId);
    });

    // Cancelar subscrição de um device
    socket.on('device:unsubscribe', (deviceId) => {
      this.handleDeviceUnsubscribe(socket, deviceId);
    });

    // Requisitar atualização manual
    socket.on('request:update', () => {
      this.handleUpdateRequest(socket);
    });

    // Requisitar verificação manual de device
    socket.on('device:check', (deviceId) => {
      this.handleDeviceCheckRequest(socket, deviceId);
    });

    // Ping/Pong para keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // Requisitar estatísticas
    socket.on('stats:request', () => {
      this.handleStatsRequest(socket);
    });

    // Requisitar lista de devices
    socket.on('devices:request', () => {
      this.handleDevicesRequest(socket);
    });

    // Requisitar lista de alertas
    socket.on('alerts:request', () => {
      this.handleAlertsRequest(socket);
    });

    // Evento de desconexão
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Evento de erro
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.username}:`, error);
    });
  }

  /**
   * Lidar com subscrição a device
   */
  handleDeviceSubscribe(socket, deviceId) {
    if (!deviceId) {
      socket.emit('error', { message: 'Device ID is required' });
      return;
    }

    // Adicionar à lista de subscrições do device
    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, []);
    }

    const subscribers = this.deviceSubscriptions.get(deviceId);
    if (!subscribers.includes(socket.id)) {
      subscribers.push(socket.id);
      
      // Atualizar registro do cliente
      const client = this.connectedClients.get(socket.id);
      if (client && !client.subscriptions.includes(deviceId)) {
        client.subscriptions.push(deviceId);
      }

      logger.info(`Client ${socket.username} subscribed to device ${deviceId}`);
      
      socket.emit('device:subscribed', {
        deviceId,
        message: `Successfully subscribed to device ${deviceId}`
      });
    }
  }

  /**
   * Lidar com cancelamento de subscrição
   */
  handleDeviceUnsubscribe(socket, deviceId) {
    if (!deviceId) {
      socket.emit('error', { message: 'Device ID is required' });
      return;
    }

    if (this.deviceSubscriptions.has(deviceId)) {
      const subscribers = this.deviceSubscriptions.get(deviceId);
      const index = subscribers.indexOf(socket.id);
      
      if (index > -1) {
        subscribers.splice(index, 1);
        
        // Atualizar registro do cliente
        const client = this.connectedClients.get(socket.id);
        if (client) {
          const subIndex = client.subscriptions.indexOf(deviceId);
          if (subIndex > -1) {
            client.subscriptions.splice(subIndex, 1);
          }
        }

        logger.info(`Client ${socket.username} unsubscribed from device ${deviceId}`);
        
        socket.emit('device:unsubscribed', {
          deviceId,
          message: `Successfully unsubscribed from device ${deviceId}`
        });

        // Remover device das subscrições se não há mais subscribers
        if (subscribers.length === 0) {
          this.deviceSubscriptions.delete(deviceId);
        }
      }
    }
  }

  /**
   * Lidar com requisição de atualização
   */
  async handleUpdateRequest(socket) {
    logger.info(`Update requested by ${socket.username}`);
    
    try {
      // Buscar dados atualizados
      const devices = await Device.findAll();
      const alerts = await Alert.findAll({
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      // Enviar apenas para o cliente que requisitou
      socket.emit('devices:list', devices);
      socket.emit('alerts:list', alerts);
      
    } catch (error) {
      logger.error('Error handling update request:', error);
      socket.emit('error', { message: 'Failed to fetch updated data' });
    }
  }

  /**
   * Lidar com requisição de verificação de device
   */
  handleDeviceCheckRequest(socket, deviceId) {
    logger.info(`Device check requested for ${deviceId} by ${socket.username}`);
    
    // Emitir evento para o sistema de monitoramento processar
    this.io.emit('device:check:requested', {
      deviceId,
      requestedBy: socket.username,
      timestamp: new Date()
    });
  }

  /**
   * Lidar com requisição de estatísticas
   */
  async handleStatsRequest(socket) {
    try {
      const stats = await this.calculateStats();
      socket.emit('stats:update', stats);
    } catch (error) {
      logger.error('Error handling stats request:', error);
      socket.emit('error', { message: 'Failed to fetch statistics' });
    }
  }

  /**
   * Lidar com requisição de devices
   */
  async handleDevicesRequest(socket) {
    try {
      const devices = await Device.findAll();
      socket.emit('devices:list', devices);
    } catch (error) {
      logger.error('Error handling devices request:', error);
      socket.emit('error', { message: 'Failed to fetch devices' });
    }
  }

  /**
   * Lidar com requisição de alertas
   */
  async handleAlertsRequest(socket) {
    try {
      const alerts = await Alert.findAll({
        order: [['createdAt', 'DESC']],
        limit: 20
      });
      socket.emit('alerts:list', alerts);
    } catch (error) {
      logger.error('Error handling alerts request:', error);
      socket.emit('error', { message: 'Failed to fetch alerts' });
    }
  }

  /**
   * Lidar com desconexão
   */
  handleDisconnection(socket, reason) {
    logger.info(`Client disconnected: ${socket.username} (${socket.id}) - Reason: ${reason}`);
    
    // Remover de todas as subscrições
    const client = this.connectedClients.get(socket.id);
    if (client && client.subscriptions) {
      client.subscriptions.forEach(deviceId => {
        if (this.deviceSubscriptions.has(deviceId)) {
          const subscribers = this.deviceSubscriptions.get(deviceId);
          const index = subscribers.indexOf(socket.id);
          if (index > -1) {
            subscribers.splice(index, 1);
            if (subscribers.length === 0) {
              this.deviceSubscriptions.delete(deviceId);
            }
          }
        }
      });
    }

    // Remover cliente da lista
    this.connectedClients.delete(socket.id);
    
    logger.debug(`Total connected clients: ${this.connectedClients.size}`);
  }

  /**
   * Calcular estatísticas
   */
  async calculateStats() {
    try {
      const devices = await Device.findAll();
      
      const stats = {
        total: devices.length,
        online: devices.filter(d => d.status === 'online').length,
        offline: devices.filter(d => d.status === 'offline').length,
        warning: devices.filter(d => d.status === 'warning').length
      };

      return { devices: stats };
    } catch (error) {
      logger.error('Error calculating stats:', error);
      return null;
    }
  }

  // ========== MÉTODOS PÚBLICOS PARA EMITIR EVENTOS ==========

  /**
   * Enviar atualização de status de device
   * Pode enviar para todos ou apenas para subscribers
   */
  async sendDeviceUpdate(deviceId, updateData) {
    if (!this.io) return;

    const message = {
      deviceId,
      data: updateData,
      timestamp: new Date()
    };

    // Se há subscribers específicos, enviar apenas para eles
    if (this.deviceSubscriptions.has(deviceId)) {
      const subscribers = this.deviceSubscriptions.get(deviceId);
      let sentCount = 0;

      subscribers.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
          socket.emit('device:update', message);
          sentCount++;
        }
      });

      if (sentCount > 0) {
        logger.debug(`Device update sent to ${sentCount} subscribers`);
      }
    } else {
      // Enviar para todos os clientes conectados
      this.io.emit('device:status', updateData);
      logger.debug('Device status broadcasted to all clients');
    }
  }

  /**
   * Enviar novo alerta para todos os clientes
   */
  async broadcastAlert(alert) {
    if (!this.io) return;

    this.io.emit('alert:new', {
      ...alert,
      timestamp: new Date()
    });

    logger.debug(`Alert broadcasted to ${this.connectedClients.size} clients`);
  }

  /**
   * Enviar estatísticas atualizadas
   */
  async broadcastStats(stats) {
    if (!this.io) return;

    this.io.emit('stats:update', {
      ...stats,
      timestamp: new Date()
    });

    logger.debug(`Stats broadcasted to ${this.connectedClients.size} clients`);
  }

  /**
   * Enviar atualização de status de device para todos
   */
  emitDeviceStatus(device) {
    if (this.io) {
      this.io.emit('device:status', device);
      logger.debug(`Device status emitted: ${device.id}`);
    }
  }

  /**
   * Enviar novo alerta
   */
  emitNewAlert(alert) {
    if (this.io) {
      this.io.emit('alert:new', alert);
      logger.debug(`Alert emitted: ${alert.id}`);
    }
  }

  /**
   * Enviar estatísticas atualizadas
   */
  emitStatsUpdate(stats) {
    if (this.io) {
      this.io.emit('stats:update', stats);
      logger.debug('Stats update emitted');
    }
  }

  /**
   * Enviar lista de devices
   */
  emitDevicesList(devices) {
    if (this.io) {
      this.io.emit('devices:list', devices);
      logger.debug('Devices list emitted');
    }
  }

  /**
   * Enviar lista de alertas
   */
  emitAlertsList(alerts) {
    if (this.io) {
      this.io.emit('alerts:list', alerts);
      logger.debug('Alerts list emitted');
    }
  }

  /**
   * Verificar se o serviço está ativo
   */
  isActive() {
    return this.io !== null;
  }

  /**
   * Obter informações de conexão
   */
  getConnectionInfo() {
    return {
      totalClients: this.connectedClients.size,
      totalSubscriptions: Array.from(this.deviceSubscriptions.values())
        .reduce((sum, subs) => sum + subs.length, 0),
      subscribedDevices: this.deviceSubscriptions.size,
      clients: Array.from(this.connectedClients.values()).map(client => ({
        username: client.username,
        role: client.role,
        connectedAt: client.connectedAt,
        subscriptions: client.subscriptions.length
      }))
    };
  }

  /**
   * Fechar todas as conexões
   */
  close() {
    if (this.io) {
      this.io.close();
      this.connectedClients.clear();
      this.deviceSubscriptions.clear();
      logger.info('Socket.IO server closed and all connections terminated');
    }
  }
}

module.exports = new WebSocketService();