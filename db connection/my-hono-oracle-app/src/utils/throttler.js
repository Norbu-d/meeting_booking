class RequestThrottler {
  constructor(options = {}) {
    this.options = {
      maxRequests: 100,          // Max requests per window
      windowMs: 60000,           // 1 minute window
      delayAfter: 50,            // Start delaying after 50 requests
      delayMs: 200,              // Add 200ms delay per request over limit
      ...options
    };
    
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), this.options.windowMs);
  }

  // Check if request should be throttled
  shouldThrottle(identifier) {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    // Get or create request history for this identifier
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const requestTimes = this.requests.get(identifier);
    
    // Remove old requests outside current window
    const recentRequests = requestTimes.filter(time => time > windowStart);
    this.requests.set(identifier, recentRequests);
    
    const requestCount = recentRequests.length;
    
    // Check if over limit
    if (requestCount >= this.options.maxRequests) {
      return { throttled: true, waitTime: this.options.windowMs };
    }
    
    // Check if should delay
    if (requestCount >= this.options.delayAfter) {
      const excess = requestCount - this.options.delayAfter;
      const delay = excess * this.options.delayMs;
      return { throttled: false, delay };
    }
    
    // Record this request
    recentRequests.push(now);
    
    return { throttled: false, delay: 0 };
  }

  // Get throttle status for an identifier
  getStatus(identifier) {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    const requestTimes = this.requests.get(identifier) || [];
    const recentRequests = requestTimes.filter(time => time > windowStart);
    
    return {
      requestsInWindow: recentRequests.length,
      maxRequests: this.options.maxRequests,
      windowMs: this.options.windowMs,
      timeToReset: Math.max(0, windowStart + this.options.windowMs - now)
    };
  }

  // Clean up old entries
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    for (const [identifier, requestTimes] of this.requests.entries()) {
      const recentRequests = requestTimes.filter(time => time > windowStart);
      
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }

  // Destroy cleaner interval
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create throttler instances
export const apiThrottler = new RequestThrottler({
  maxRequests: 1000,    // Higher limit for API endpoints
  windowMs: 60000,
  delayAfter: 800
});

export const userThrottler = new RequestThrottler({
  maxRequests: 100,     // Lower limit per user
  windowMs: 60000,
  delayAfter: 50,
  delayMs: 100
});

export default RequestThrottler;