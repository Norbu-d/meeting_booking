import redisClient from '../../config/redis.js';
import logger from '../../utils/logger.js';

class CacheService {
  constructor() {
    this.defaultTTL = 5 * 60; // 5 minutes in seconds
  }

  async get(key) {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(cached);
      }
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(data));
      logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async invalidate(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisClient.del(key)));
        logger.debug(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      return 0;
    }
  }

  // Generate cache key for bookings
  generateBookingsKey(sessionId, page = 1, limit = 20) {
    return `bookings:${sessionId}:page${page}:limit${limit}`;
  }

  // Invalidate all booking caches for a user
  async invalidateUserBookings(sessionId) {
    return this.invalidate(`bookings:${sessionId}:*`);
  }
}

export default new CacheService();