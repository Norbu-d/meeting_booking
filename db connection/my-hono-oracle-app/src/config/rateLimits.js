export const rateLimitConfigs = {
  // General API limits
  general: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Max 100 requests per minute per IP
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },

  // Strict limits for booking operations
  bookings: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Max 10 booking requests per minute per user
    keyGenerator: (req) => req.user?.session_id || req.ip,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many booking requests. Please slow down.'
      });
    }
  },

  // Admin endpoints have higher limits
  admin: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // Higher limit for admin operations
    keyGenerator: (req) => req.user?.session_id ? `${req.user.session_id}:admin` : req.ip,
    skip: (req) => !req.user?.session_id // Skip if not authenticated
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true // Don't count successful logins
  },

  // File upload limits
  upload: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 uploads per 15 minutes
    message: 'Too many file uploads, please try again later.'
  }
};

export default rateLimitConfigs;