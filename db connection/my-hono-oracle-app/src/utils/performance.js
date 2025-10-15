export class PerformanceMonitor {
  constructor() {
    this.markers = new Map();
    this.measurements = [];
  }

  mark(name) {
    this.markers.set(name, {
      timestamp: performance.now(),
      time: Date.now()
    });
  }

  measure(measureName, startMark, endMark) {
    const start = this.markers.get(startMark);
    const end = this.markers.get(endMark);

    if (!start || !end) {
      console.warn(`Marks not found: ${startMark}, ${endMark}`);
      return null;
    }

    const duration = end.timestamp - start.timestamp;
    
    const measurement = {
      name: measureName,
      duration,
      startTime: start.time,
      endTime: end.time,
      timestamp: Date.now()
    };

    this.measurements.push(measurement);
    
    // Keep only last 1000 measurements
    if (this.measurements.length > 1000) {
      this.measurements = this.measurements.slice(-1000);
    }

    return measurement;
  }

  getMeasurements(name, limit = 100) {
    const filtered = name ? 
      this.measurements.filter(m => m.name === name) : 
      this.measurements;
    
    return filtered.slice(-limit);
  }

  getStats(name) {
    const measurements = this.getMeasurements(name);
    
    if (measurements.length === 0) {
      return null;
    }

    const durations = measurements.map(m => m.duration);
    const average = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    
    // Percentiles
    const sorted = durations.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      count: measurements.length,
      average: Math.round(average * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100
    };
  }

  clear() {
    this.markers.clear();
    this.measurements = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Performance decorator for methods
export function measurePerformance(target, propertyName, descriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args) {
    const startMark = `${propertyName}_start`;
    const endMark = `${propertyName}_end`;
    
    performanceMonitor.mark(startMark);
    
    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } finally {
      performanceMonitor.mark(endMark);
      performanceMonitor.measure(propertyName, startMark, endMark);
    }
  };
  
  return descriptor;
}

// Utility to measure function execution time
export async function withTiming(fn, context) {
  const start = performance.now();
  
  try {
    const result = await fn();
    const end = performance.now();
    
    return {
      result,
      duration: end - start
    };
  } catch (error) {
    const end = performance.now();
    
    throw {
      error,
      duration: end - start
    };
  }
}