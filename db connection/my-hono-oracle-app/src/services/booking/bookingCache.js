import cacheService from '../cache/cacheService.js';
import logger from '../../utils/logger.js';

class BookingCacheService {
  constructor() {
    this.cachePrefix = 'bookings';
  }

  // Cache keys
  generateKey(sessionId, filters = {}) {
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}=${filters[key]}`)
      .join('&');
    
    return `${this.cachePrefix}:${sessionId}:${filterString}`;
  }

  // Get cached bookings
  async getBookings(sessionId, filters = {}) {
    const key = this.generateKey(sessionId, filters);
    return cacheService.get(key);
  }

  // Set cached bookings
  async setBookings(sessionId, data, filters = {}, ttl = 300) {
    const key = this.generateKey(sessionId, filters);
    return cacheService.set(key, data, ttl);
  }

  // Invalidate all caches for a user
  async invalidateUserBookings(sessionId) {
    const pattern = `${this.cachePrefix}:${sessionId}:*`;
    return cacheService.invalidate(pattern);
  }

  // Invalidate specific cache
  async invalidateBooking(bookingId, sessionId) {
    // Invalidate all user caches when a booking changes
    return this.invalidateUserBookings(sessionId);
  }

  // Warm up cache (pre-load frequently accessed data)
  async warmUpCache(sessionId, bookingService) {
    try {
      logger.info(`Warming up cache for user ${sessionId}`);
      
      const commonFilters = [
        { status: 'pending', limit: 20 },
        { status: 'approved', limit: 50 },
        { limit: 10 } // Recent bookings
      ];

      const warmUpPromises = commonFilters.map(async (filters) => {
        try {
          const result = await bookingService.getBookings(sessionId, filters);
          if (result.success) {
            await this.setBookings(sessionId, result, filters, 600); // 10 minutes
          }
        } catch (error) {
          logger.warn('Cache warm-up failed for filters:', filters);
        }
      });

      await Promise.allSettled(warmUpPromises);
      logger.info(`Cache warm-up completed for user ${sessionId}`);
    } catch (error) {
      logger.error('Cache warm-up error:', error);
    }
  }

  // Get cache statistics
  async getStats(sessionId) {
    const pattern = `${this.cachePrefix}:${sessionId}:*`;
    // This would require Redis SCAN in a real implementation
    return {
      user: sessionId,
      cachedPatterns: pattern,
      note: 'Cache statistics would show hit rates and sizes'
    };
  }
}

export default new BookingCacheService();