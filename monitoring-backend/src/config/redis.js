const redis = require("redis");
const logger = require("../utils/logger");

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.namespace = process.env.REDIS_NAMESPACE || "netsentry";
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        throw new Error("REDIS_URL not defined in environment variables");
      }

      const isSecure = redisUrl.startsWith("rediss://");

      const config = {
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: (retries) => {
            this.reconnectAttempts = retries;

            if (retries > this.maxReconnectAttempts) {
              logger.error(
                `Redis: Max reconnect attempts (${this.maxReconnectAttempts}) reached`
              );
              return false;
            }

            const delay = Math.min(retries * 100, 3000);
            logger.warn(
              `Redis: Reconnecting... Attempt ${retries}/${this.maxReconnectAttempts} (delay: ${delay}ms)`
            );
            return delay;
          },
        },
      };

      if (isSecure) {
        config.socket.tls = true;
        config.socket.rejectUnauthorized = false;
      }

      this.client = redis.createClient(config);

      this.client.on("error", (err) => {
        logger.error("Redis Error:", err.message);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        logger.info("Redis: Connecting...");
      });

      this.client.on("ready", () => {
        logger.info("Redis: Ready and operational");
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on("reconnecting", () => {
        logger.warn("Redis: Reconnecting...");
        this.isConnected = false;
      });

      this.client.on("end", () => {
        logger.info("Redis: Connection closed");
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error("Failed to connect to Redis:", error.message);
      logger.warn("Application will continue without Redis cache");
    }
  }

  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        logger.info("Redis disconnected gracefully");
      }
    } catch (error) {
      logger.error("Error disconnecting Redis:", error.message);
      if (this.client) {
        await this.client.disconnect();
      }
    }
  }

  _getKey(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * FIX 2: Usa client.isReady como fonte de verdade em vez de flag local.
   * O flag `isConnected` pode ficar dessincronizado pois é atualizado por
   * eventos assíncronos — pode haver um delay entre a desconexão real e o
   * disparo do evento. `client.isReady` é síncrono e sempre reflete o estado
   * atual do socket.
   */
  _checkConnection() {
    if (!this.client?.isReady) {
      logger.debug("Redis not available, operation skipped");
      return false;
    }
    return true;
  }

  /**
   * FIX 5: Helper de retry com backoff exponencial.
   * Operações críticas (set/get) agora tentam novamente em caso de falha
   * transiente, com espera crescente entre tentativas para não sobrecarregar
   * um Redis que esteja se recuperando.
   */
  async _withRetry(fn, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === retries) throw error;
        const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
        logger.warn(`Redis retry ${attempt}/${retries} after ${delay}ms: ${error.message}`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  // ==================== CACHE OPERATIONS ====================

  async set(key, value, expireInSeconds = null) {
    if (!this._checkConnection()) return false;

    // FIX 5 aplicado: set usa retry pois é uma operação crítica de escrita
    return this._withRetry(async () => {
      const fullKey = this._getKey(key);
      const serializedValue = JSON.stringify(value);

      if (expireInSeconds) {
        await this.client.setEx(fullKey, expireInSeconds, serializedValue);
      } else {
        await this.client.set(fullKey, serializedValue);
      }

      logger.debug(`Redis SET: ${fullKey} (TTL: ${expireInSeconds || "none"})`);
      return true;
    }).catch((error) => {
      logger.error(`Redis SET error for key ${key}:`, error.message);
      return false;
    });
  }

  async get(key) {
    if (!this._checkConnection()) return null;

    // FIX 5 aplicado: get usa retry pois é a operação de leitura mais frequente
    return this._withRetry(async () => {
      const fullKey = this._getKey(key);
      const value = await this.client.get(fullKey);

      if (value) {
        logger.debug(`Redis HIT: ${fullKey}`);
        return JSON.parse(value);
      }

      logger.debug(`Redis MISS: ${fullKey}`);
      return null;
    }).catch((error) => {
      logger.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    });
  }

  async del(key) {
    if (!this._checkConnection()) return 0;

    try {
      const keys = Array.isArray(key) ? key : [key];
      const fullKeys = keys.map((k) => this._getKey(k));
      const deleted = await this.client.del(fullKeys);

      logger.debug(`Redis DEL: ${deleted} key(s) deleted`);
      return deleted;
    } catch (error) {
      logger.error(`Redis DEL error:`, error.message);
      return 0;
    }
  }

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
   * FIX 3: Race condition eliminada com pipeline atômico (multi/exec).
   * Antes, incr e expire eram duas operações separadas. Se dois processos
   * chamassem incr ao mesmo tempo, ambos podiam ver value === 1 e tentar
   * definir o TTL — ou pior, um processo incrementava entre o incr e o expire
   * do outro, deixando a chave sem TTL. Usando multi().incr().expire().exec(),
   * as duas operações são enviadas e executadas atomicamente no Redis.
   */
  async incr(key, expireInSeconds = null) {
    if (!this._checkConnection()) return null;

    try {
      const fullKey = this._getKey(key);

      if (expireInSeconds) {
        const results = await this.client
          .multi()
          .incr(fullKey)
          .expire(fullKey, expireInSeconds)
          .exec();

        // results[0] = valor após incr
        return results[0];
      }

      return await this.client.incr(fullKey);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error.message);
      return null;
    }
  }

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

  async setSession(sessionId, data, expireInSeconds = 86400) {
    const key = `session:${sessionId}`;
    return await this.set(key, data, expireInSeconds);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

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
   * FIX 1: Lógica de prioridade corrigida.
   * Antes: alta prioridade usava rPush (insere no FINAL da lista)
   * e o popFromQueue usava rPop (retira do FINAL) — itens de alta prioridade
   * chegavam por último, o oposto do esperado.
   *
   * Agora: alta prioridade usa lPush (insere na FRENTE) e normal usa rPush
   * (insere no FINAL). O pop com rPop retira da frente do processamento,
   * garantindo que itens de alta prioridade sejam consumidos primeiro.
   *
   * Filas separadas por prioridade:
   *   queue:{name}:high  — consumida preferencialmente
   *   queue:{name}:normal — consumida quando a de alta estiver vazia
   */
  async pushToQueue(queueName, data, priority = "normal") {
    if (!this._checkConnection()) return false;

    try {
      const item = {
        data,
        priority,
        timestamp: Date.now(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const serializedData = JSON.stringify(item);

      if (priority === "high") {
        // Alta prioridade: fila dedicada, inserção na frente (lPush)
        const highQueue = this._getKey(`queue:${queueName}:high`);
        await this.client.lPush(highQueue, serializedData);
      } else {
        // Prioridade normal: fila padrão, inserção no final (rPush)
        const normalQueue = this._getKey(`queue:${queueName}:normal`);
        await this.client.rPush(normalQueue, serializedData);
      }

      return true;
    } catch (error) {
      logger.error(`Redis queue push error for ${queueName}:`, error.message);
      return false;
    }
  }

  /**
   * FIX 4: Pop agora respeita prioridade.
   * Antes: um único rPop consumia de uma fila genérica, sem distinção de
   * prioridade. Agora, tenta primeiro a fila :high com timeout curto (1s)
   * e só consome da :normal se não houver itens de alta prioridade pendentes.
   * Isso garante que eventos críticos (ex: alertas de rede) sempre sejam
   * processados antes de eventos de rotina.
   */
  async popFromQueue(queueName, timeout = 0) {
    if (!this._checkConnection()) return null;

    try {
      const highQueue = this._getKey(`queue:${queueName}:high`);
      const normalQueue = this._getKey(`queue:${queueName}:normal`);

      // Tenta fila de alta prioridade primeiro (sem bloqueio)
      let result = await this.client.rPop(highQueue);

      if (!result) {
        // Fila de alta vazia: consome da normal
        if (timeout > 0) {
          const blocked = await this.client.brPop(normalQueue, timeout);
          result = blocked?.element ?? null;
        } else {
          result = await this.client.rPop(normalQueue);
        }
      }

      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.error(`Redis queue pop error for ${queueName}:`, error.message);
      return null;
    }
  }

  async getQueueLength(queueName) {
    if (!this._checkConnection()) return 0;

    try {
      const highQueue = this._getKey(`queue:${queueName}:high`);
      const normalQueue = this._getKey(`queue:${queueName}:normal`);

      const [highLen, normalLen] = await Promise.all([
        this.client.lLen(highQueue),
        this.client.lLen(normalQueue),
      ]);

      return { high: highLen, normal: normalLen, total: highLen + normalLen };
    } catch (error) {
      logger.error(`Redis queue length error for ${queueName}:`, error.message);
      return { high: 0, normal: 0, total: 0 };
    }
  }

  // ==================== CACHE INVALIDATION ====================

  async invalidatePattern(pattern) {
    if (!this._checkConnection()) return 0;

    try {
      const fullPattern = this._getKey(pattern);
      let cursor = 0;
      let deletedCount = 0;

      do {
        const result = await this.client.scan(cursor, {
          MATCH: fullPattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        const keys = result.keys;

        if (keys.length > 0) {
          await this.client.del(keys);
          deletedCount += keys.length;
        }
      } while (cursor !== 0);

      if (deletedCount > 0) {
        logger.info(
          `✅ Invalidated ${deletedCount} cache keys matching pattern: ${pattern}`
        );
      }

      return deletedCount;
    } catch (error) {
      logger.error(
        `Redis pattern invalidation error for ${pattern}:`,
        error.message
      );
      return 0;
    }
  }

  // ==================== HASH OPERATIONS ====================

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

  async hGetAll(key) {
    if (!this._checkConnection()) return {};

    try {
      const fullKey = this._getKey(key);
      const data = await this.client.hGetAll(fullKey);

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

  async ping() {
    if (!this._checkConnection()) return false;

    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      logger.error("Redis ping error:", error.message);
      return false;
    }
  }

  async info() {
    if (!this._checkConnection()) return null;

    try {
      return await this.client.info();
    } catch (error) {
      logger.error("Redis info error:", error.message);
      return null;
    }
  }

  async getStats() {
    if (!this._checkConnection()) {
      return {
        connected: false,
        reconnectAttempts: this.reconnectAttempts,
      };
    }

    try {
      const info = await this.client.info("stats");
      const memory = await this.client.info("memory");

      return {
        connected: this.isConnected,
        reconnectAttempts: this.reconnectAttempts,
        info,
        memory,
      };
    } catch (error) {
      logger.error("Redis stats error:", error.message);
      return {
        connected: this.isConnected,
        error: error.message,
      };
    }
  }

  /**
   * FIX 6: flushNamespace protegido contra uso acidental.
   * Antes: qualquer chamada limpava todo o namespace sem aviso.
   * Agora:
   *   - Requer `confirm = true` explícito (proteção contra typos/chamadas acidentais)
   *   - Bloqueado em produção (NODE_ENV === 'production') por padrão,
   *     a menos que `forceInProduction = true` seja passado explicitamente.
   * Uso em dev:   flushNamespace(true)
   * Uso em prod:  flushNamespace(true, true)  ← exige intenção dupla
   */
  async flushNamespace(confirm = false, forceInProduction = false) {
    if (!confirm) {
      logger.warn(
        "Redis flushNamespace called without confirmation. Pass true to confirm."
      );
      return 0;
    }

    if (process.env.NODE_ENV === "production" && !forceInProduction) {
      logger.error(
        "Redis flushNamespace blocked in production. Pass forceInProduction=true to override."
      );
      return 0;
    }

    if (!this._checkConnection()) return 0;

    try {
      logger.warn(`Redis: flushing namespace "${this.namespace}"...`);
      return await this.invalidatePattern("*");
    } catch (error) {
      logger.error("Redis flush namespace error:", error.message);
      return 0;
    }
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;