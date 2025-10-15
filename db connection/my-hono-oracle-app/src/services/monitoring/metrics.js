class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: { total: 0, byEndpoint: {} },
      responseTimes: { average: 0, byEndpoint: {} },
      errors: { total: 0, byType: {} },
      cache: { hits: 0, misses: 0, hitRate: 0 }
    };
    
    this.startTime = Date.now();
  }

  recordRequest(endpoint, method, duration, statusCode) {
    this.metrics.requests.total++;
    
    const endpointKey = `${method}:${endpoint}`;
    this.metrics.requests.byEndpoint[endpointKey] = 
      (this.metrics.requests.byEndpoint[endpointKey] || 0) + 1;

    // Record response time
    if (!this.metrics.responseTimes.byEndpoint[endpointKey]) {
      this.metrics.responseTimes.byEndpoint[endpointKey] = [];
    }
    this.metrics.responseTimes.byEndpoint[endpointKey].push(duration);
    
    // Update averages
    this.updateAverages();
  }

  recordError(endpoint, errorType) {
    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] = 
      (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheMetrics();
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheMetrics();
  }

  updateCacheMetrics() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? 
      (this.metrics.cache.hits / total) * 100 : 0;
  }

  updateAverages() {
    let totalDuration = 0;
    let totalCount = 0;

    Object.values(this.metrics.responseTimes.byEndpoint).forEach(times => {
      totalDuration += times.reduce((sum, time) => sum + time, 0);
      totalCount += times.length;
    });

    this.metrics.responseTimes.average = totalCount > 0 ? 
      totalDuration / totalCount : 0;
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      ...this.metrics,
      uptime: this.formatUptime(uptime),
      requestsPerMinute: this.calculateRpm(),
      health: this.calculateHealthScore()
    };
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  calculateRpm() {
    const uptimeMinutes = (Date.now() - this.startTime) / 1000 / 60;
    return uptimeMinutes > 0 ? this.metrics.requests.total / uptimeMinutes : 0;
  }

  calculateHealthScore() {
    const errorRate = this.metrics.requests.total > 0 ? 
      this.metrics.errors.total / this.metrics.requests.total : 0;
    
    return Math.max(0, 100 - (errorRate * 100));
  }

  // Reset metrics (useful for testing)
  reset() {
    this.metrics = {
      requests: { total: 0, byEndpoint: {} },
      responseTimes: { average: 0, byEndpoint: {} },
      errors: { total: 0, byType: {} },
      cache: { hits: 0, misses: 0, hitRate: 0 }
    };
    this.startTime = Date.now();
  }
}

// Singleton instance
export const metrics = new MetricsCollector();
export default metrics;