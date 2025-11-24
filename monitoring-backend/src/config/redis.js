const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.namespace = process.env.REDIS_NAMESPACE || 'netsentry';
  }

  /**
   * Conecta ao Redis com retry automático
   */
  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redisPassword = process.env.REDIS_PASSWORD;

      const config = {
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: (retries) => {
            this.reconnectAttempts = retries;
            
            if (retries > this.maxReconnectAttempts) {
              logger.error(`Redis: Max reconnect attempts (${this.maxReconnectAttempts}) reached`);
              return false; // Para de tentar reconectar
            }
            
            const delay = Math.min(retries * 100, 3000);
            logger.warn(`Redis: Reconnecting... Attempt ${retries}/${this.maxReconnectAttempts} (delay: ${delay}ms)`);
            return delay;
          }
        }
      };

      // Adiciona senha se existir
      if (redisPassword) {
        config.password = redisPassword;
      }

      this.client = redis.createClient(config);

      // Event handlers
      this.client.on('error', (err) => {
        logger.error('Redis Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis: Connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis: Ready and operational');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis: Reconnecting...');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis: Connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error.message);
      logger.warn('Application will continue without Redis cache');
      // Não lança erro - aplicação continua sem Redis
    }
  }

  /**
   * Desconecta gracefully
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        logger.info('Redis disconnected gracefully');
      }
    } catch (error) {
      logger.error('Error disconnecting Redis:', error.message);
      // Force disconnect
      if (this.client) {
        await this.client.disconnect();
      }
    }
  }

  /**
   * Adiciona namespace à chave
   */
  _getKey(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Verifica se Redis está disponível antes de executar operação
   */
  _checkConnection() {
    if (!this.isConnected || !this.client) {
      logger.debug('Redis not available, operation skipped');
      return false;
    }
    return true;
  }

  // ==================== CACHE OPERATIONS ====================

  /**
   * Set com TTL opcional
   */
  async set(key, value, expireInSeconds = null) {
    if (!this._checkConnection()) return false;

    try {
      const fullKey = this._getKey(key);
      const serializedValue = JSON.stringify(value);
      
      if (expireInSeconds) {
        await this.client.setEx(fullKey, expireInSeconds, serializedValue);
      } else {
        await this.client.set(fullKey, serializedValue);
      }
      
      logger.debug(`Redis SET: ${fullKey} (TTL: ${expireInSeconds || 'none'})`);
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get com fallback
   */
  async get(key) {
    if (!this._checkConnection()) return null;

    try {
      const fullKey = this._getKey(key);
      const value = await this.client.get(fullKey);
      
      if (value) {
        logger.debug(`Redis HIT: ${fullKey}`);
        return JSON.parse(value);
      }
      
      logger.debug(`Redis MISS: ${fullKey}`);
      return null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Delete uma ou múltiplas chaves
   */
  async del(key) {
    if (!this._checkConnection()) return 0;

    try {
      const keys = Array.isArray(key) ? key : [key];
      const fullKeys = keys.map(k => this._getKey(k));
      const deleted = await this.client.del(fullKeys);
      
      logger.debug(`Redis DEL: ${deleted} key(s) deleted`);
      return deleted;
    } catch (error) {
      logger.error(`Redis DEL error:`, error.message);
      return 0;
    }
  }

  /**
   * Verifica se chave existe
   */
  async exists(key) {
    if (!this._checkConnection()) return false;

    try {
      const fullKey = this._getKey(key);
      return await this.client.exists(fullKey);
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Increment (útil para contadores, rate limiting)
   */
  async incr(key, expireInSeconds = null) {
    if (!this._checkConnection()) return null;

    try {
      const fullKey = this._getKey(key);
      const value = await this.client.incr(fullKey);
      
      if (expireInSeconds && value === 1) {
        await this.client.expire(fullKey, expireInSeconds);
      }
      
      return value;
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Get TTL de uma chave
   */
  async ttl(key) {
    if (!this._checkConnection()) return -2;

    try {
      const fullKey = this._getKey(key);
      return await this.client.ttl(fullKey);
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:`, error.message);
      return -2;
    }
  }

  // ==================== SESSION OPERATIONS ====================

  /**
   * Set session com TTL padrão de 24h
   */
  async setSession(sessionId, data, expireInSeconds = 86400) {
    const key = `session:${sessionId}`;
    return await this.set(key, data, expireInSeconds);
  }

  /**
   * Get session
   */
  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  /**
   * Renova TTL da sessão
   */
  async refreshSession(sessionId, expireInSeconds = 86400) {
    if (!this._checkConnection()) return false;

    try {
      const fullKey = this._getKey(`session:${sessionId}`);
      const renewed = await this.client.expire(fullKey, expireInSeconds);
      return renewed === 1;
    } catch (error) {
      logger.error(`Redis session refresh error:`, error.message);
      return false;
    }
  }

  // ==================== QUEUE OPERATIONS ====================

  /**
   * Adiciona item à fila
   */
  async pushToQueue(queueName, data, priority = 'normal') {
    if (!this._checkConnection()) return false;

    try {
      const fullQueue = this._getKey(`queue:${queueName}`);
      const item = {
        data,
        priority,
        timestamp: Date.now(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      const serializedData = JSON.stringify(item);
      
      if (priority === 'high') {
        await this.client.rPush(fullQueue, serializedData);
      } else {
        await this.client.lPush(fullQueue, serializedData);
      }
      
      return true;
    } catch (error) {
      logger.error(`Redis queue push error for ${queueName}:`, error.message);
      return false;
    }
  }

  /**
   * Remove e retorna item da fila
   */
  async popFromQueue(queueName, timeout = 0) {
    if (!this._checkConnection()) return null;

    try {
      const fullQueue = this._getKey(`queue:${queueName}`);
      
      let result;
      if (timeout > 0) {
        // Blocking pop com timeout
        result = await this.client.brPop(fullQueue, timeout);
        result = result?.element;
      } else {
        result = await this.client.rPop(fullQueue);
      }
      
      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.error(`Redis queue pop error for ${queueName}:`, error.message);
      return null;
    }
  }

  /**
   * Retorna tamanho da fila
   */
  async getQueueLength(queueName) {
    if (!this._checkConnection()) return 0;

    try {
      const fullQueue = this._getKey(`queue:${queueName}`);
      return await this.client.lLen(fullQueue);
    } catch (error) {
      logger.error(`Redis queue length error for ${queueName}:`, error.message);
      return 0;
    }
  }

  // ==================== CACHE INVALIDATION ====================

  /**
   * Invalida cache por pattern usando SCAN (seguro para produção)
   */
  async invalidatePattern(pattern) {
    if (!this._checkConnection()) return 0;

    try {
      const fullPattern = this._getKey(pattern);
      let cursor = 0;
      let deletedCount = 0;
      
      do {
        const result = await this.client.scan(cursor, {
          MATCH: fullPattern,
          COUNT: 100
        });
        
        cursor = result.cursor;
        const keys = result.keys;
        
        if (keys.length > 0) {
          await this.client.del(keys);
          deletedCount += keys.length;
        }
      } while (cursor !== 0);
      
      if (deletedCount > 0) {
        logger.info(`✅ Invalidated ${deletedCount} cache keys matching pattern: ${pattern}`);
      }
      
      return deletedCount;
    } catch (error) {
      logger.error(`Redis pattern invalidation error for ${pattern}:`, error.message);
      return 0;
    }
  }

  // ==================== HASH OPERATIONS (para objetos complexos) ====================

  /**
   * Set múltiplos campos em um hash
   */
  async hSet(key, field, value) {
    if (!this._checkConnection()) return false;

    try {
      const fullKey = this._getKey(key);
      await this.client.hSet(fullKey, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis HSET error:`, error.message);
      return false;
    }
  }

  /**
   * Get campo de um hash
   */
  async hGet(key, field) {
    if (!this._checkConnection()) return null;

    try {
      const fullKey = this._getKey(key);
      const value = await this.client.hGet(fullKey, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis HGET error:`, error.message);
      return null;
    }
  }

  /**
   * Get todos os campos de um hash
   */
  async hGetAll(key) {
    if (!this._checkConnection()) return {};

    try {
      const fullKey = this._getKey(key);
      const data = await this.client.hGetAll(fullKey);
      
      // Parse JSON values
      const parsed = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      
      return parsed;
    } catch (error) {
      logger.error(`Redis HGETALL error:`, error.message);
      return {};
    }
  }

  // ==================== MONITORING & HEALTH ====================

  /**
   * Health check
   */
  async ping() {
    if (!this._checkConnection()) return false;

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping error:', error.message);
      return false;
    }
  }

  /**
   * Retorna informações do Redis
   */
  async info() {
    if (!this._checkConnection()) return null;

    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Redis info error:', error.message);
      return null;
    }
  }

  /**
   * Retorna estatísticas de uso
   */
  async getStats() {
    if (!this._checkConnection()) {
      return {
        connected: false,
        reconnectAttempts: this.reconnectAttempts
      };
    }

    try {
      const info = await this.client.info('stats');
      const memory = await this.client.info('memory');
      
      return {
        connected: this.isConnected,
        reconnectAttempts: this.reconnectAttempts,
        info,
        memory
      };
    } catch (error) {
      logger.error('Redis stats error:', error.message);
      return {
        connected: this.isConnected,
        error: error.message
      };
    }
  }

  /**
   * Limpa TODOS os dados do namespace atual (CUIDADO!)
   */
  async flushNamespace() {
    if (!this._checkConnection()) return 0;

    try {
      return await this.invalidatePattern('*');
    } catch (error) {
      logger.error('Redis flush namespace error:', error.message);
      return 0;
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;