import cacheService from '../services/cache/cacheService.js';

const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`,
    shouldCache = (req, res) => res.statusCode === 200 && req.method === 'GET',
    shouldInvalidate = (req) => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)
  } = options;

  return async (req, res, next) => {
    const key = keyGenerator(req);

    // Check cache for GET requests
    if (req.method === 'GET') {
      try {
        const cached = await cacheService.get(key);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(cached);
        }
        res.setHeader('X-Cache', 'MISS');
      } catch (error) {
        console.error('Cache middleware error:', error);
        res.setHeader('X-Cache', 'ERROR');
      }
    }

    // Override res.json to cache responses
    const originalJson = res.json;
    res.json = function(data) {
      if (shouldCache(req, res)) {
        cacheService.set(key, data, ttl).catch(console.error);
      }
      
      if (shouldInvalidate(req)) {
        // Invalidate related caches on mutations
        const pattern = `bookings:${req.user?.session_id}:*`;
        cacheService.invalidate(pattern).catch(console.error);
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// Specific cache middleware for bookings
export const bookingsCacheMiddleware = cacheMiddleware({
  ttl: 300, // 5 minutes
  keyGenerator: (req) => {
    const sessionId = req.user?.session_id || 'anonymous';
    const page = req.query.page || 1;
    const limit = req.query.limit || 50;
    return `bookings:${sessionId}:page${page}:limit${limit}`;
  }
});

export default cacheMiddleware;