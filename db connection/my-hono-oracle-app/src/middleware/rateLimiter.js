import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// Different rate limits for different endpoints
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute per IP
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Max 10 booking requests per minute per user
  keyGenerator: (req) => {
    return req.ip + ':' + (req.user?.session_id || 'anonymous');
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for user:', {
      ip: req.ip,
      sessionId: req.user?.session_id,
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many booking requests. Please slow down.'
    });
  }
});

export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Higher limit for admin operations
  keyGenerator: (req) => req.ip + ':admin',
});