class CircuitBreaker {
  constructor(options = {}) {
    this.options = {
      failureThreshold: 5,    // After 5 failures
      successThreshold: 3,    // Need 3 successes to close
      timeout: 10000,         // 10 seconds timeout
      resetTimeout: 30000,    // 30 seconds before attempting reset
      ...options
    };
    
    this.state = 'CLOSED';    // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
  }

  async call(serviceFunction, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await Promise.race([
        serviceFunction(...args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.options.timeout)
        )
      ]);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.resetTimeout;
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
      isOpen: this.state === 'OPEN'
    };
  }
}

// Create circuit breaker instances for different services
export const databaseCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000
});

export const externalAPICircuitBreaker = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 120000
});

export default CircuitBreaker;