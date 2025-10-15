import logger from '../../utils/logger.js';
import redisClient from '../../config/redis.js';

class HealthCheckService {
  constructor(supabase) {
    this.supabase = supabase;
    this.checks = {
      database: this.checkDatabase.bind(this),
      redis: this.checkRedis.bind(this),
      memory: this.checkMemory.bind(this)
    };
  }

  async performHealthCheck() {
    const results = {};
    const promises = Object.entries(this.checks).map(async ([name, check]) => {
      try {
        results[name] = await check();
      } catch (error) {
        results[name] = { healthy: false, error: error.message };
      }
    });

    await Promise.all(promises);

    const allHealthy = Object.values(results).every(result => result.healthy);
    
    return {
      healthy: allHealthy,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }

  async checkDatabase() {
    const startTime = Date.now();
    const { data, error } = await this.supabase
      .from('meeting_bookings')
      .select('id')
      .limit(1)
      .single();

    return {
      healthy: !error,
      responseTime: Date.now() - startTime,
      error: error ? error.message : null
    };
  }

  async checkRedis() {
    const startTime = Date.now();
    try {
      await redisClient.ping();
      return {
        healthy: true,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  checkMemory() {
    const used = process.memoryUsage();
    const memoryUsage = {};
    
    for (let key in used) {
      memoryUsage[key] = Math.round(used[key] / 1024 / 1024 * 100) / 100; // MB
    }

    return {
      healthy: memoryUsage.heapUsed < 500, // Alert if over 500MB
      memoryUsage,
      uptime: process.uptime()
    };
  }
}

export default HealthCheckService;