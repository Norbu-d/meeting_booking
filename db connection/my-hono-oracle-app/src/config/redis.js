import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

class RedisClient {
  constructor() {
    this.client = new Redis(redisConfig);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });

    this.client.on('ready', () => {
      console.log('🚀 Redis ready for operations');
    });
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async setex(key, seconds, value) {
    try {
      return await this.client.setex(key, seconds, value);
    } catch (error) {
      console.error('Redis setex error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
      return null;
    }
  }
}

export default new RedisClient();