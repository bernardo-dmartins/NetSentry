import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Connect to WebSocket server
  connect(token) {
    if (this.socket?.connected) {
    console.log('WebSocket is already connected');
      return this.socket;
    }

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return this.socket;
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('WebSocket disconnected');
    }
  }

  // Add listener for events
  on(event, callback) {
    if (!this.socket) {
      console.warn('WebSocket is not connected');
      return;
    }

    // Remove previous listener if exists
    if (this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
    }

    // Add new listener
    this.socket.on(event, callback);
    this.listeners.set(event, callback);
  }

  // Remove listener
  off(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
      this.listeners.delete(event);
    }
  }

  // Emit event
  emit(event, data) {
    if (!this.socket) {
      console.warn('WebSocket is not connected');
      return;
    }

    this.socket.emit(event, data);
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }

  // Get socket ID
  getSocketId() {
    return this.socket?.id || null;
  }

  // Application-specific listeners

  // Listener for stats updates
  onStatsUpdate(callback) {
    this.on('stats:update', callback);
  }

  // Listener for device status updates
  onDeviceStatus(callback) {
    this.on('device:status', callback);
  }

  // Listener for new alerts
  onNewAlert(callback) {
    this.on('alert:new', callback);
  }

  // Listener for devices list
  onDevicesList(callback) {
    this.on('devices:list', callback);
  }

  // Listener for alerts list
  onAlertsList(callback) {
    this.on('alerts:list', callback);
  }

  // Request manual update
  requestUpdate() {
    this.emit('request:update');
  }

  // Request manual device check
  checkDevice(deviceId) {
    this.emit('device:check', deviceId);
  }

  // Send ping (keep-alive)
  ping() {
    this.emit('ping');
  }

  // Listener for pong
  onPong(callback) {
    this.on('pong', callback);
  }
}

// Singleton - export single instance
const websocketService = new WebSocketService();

export default websocketService;
