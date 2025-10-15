class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  formatMessage(level, message, extra = {}) {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level: level.toUpperCase(),
      message
    };

    if (Object.keys(extra).length > 0) {
      return { ...baseLog, ...extra };
    }

    return baseLog;
  }

  info(message, extra = {}) {
    const logData = this.formatMessage('info', message, extra);
    
    if (this.isDevelopment) {
      console.log('ℹ️', JSON.stringify(logData, null, 2));
    } else {
      console.log(JSON.stringify(logData));
    }
  }

  warn(message, extra = {}) {
    const logData = this.formatMessage('warn', message, extra);
    
    if (this.isDevelopment) {
      console.warn('⚠️', JSON.stringify(logData, null, 2));
    } else {
      console.warn(JSON.stringify(logData));
    }
  }

  error(message, error = null) {
    const extra = {};
    
    if (error) {
      if (error instanceof Error) {
        extra.error = {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
      } else {
        extra.error = error;
      }
    }

    const logData = this.formatMessage('error', message, extra);
    
    if (this.isDevelopment) {
      console.error('❌', JSON.stringify(logData, null, 2));
    } else {
      console.error(JSON.stringify(logData));
    }
  }

  debug(message, extra = {}) {
    if (!this.isDevelopment) {
      return;
    }

    const logData = this.formatMessage('debug', message, extra);
    console.debug('🐛', JSON.stringify(logData, null, 2));
  }

  // Log HTTP requests
  request(method, url, statusCode, responseTime, extra = {}) {
    const logData = this.formatMessage('request', 'HTTP Request', {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      ...extra
    });

    if (this.isDevelopment) {
      const statusEmoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
      console.log(`${statusEmoji} ${method} ${url} - ${statusCode} (${responseTime}ms)`);
    } else {
      console.log(JSON.stringify(logData));
    }
  }

  // Log database operations
  database(operation, query, duration, extra = {}) {
    const logData = this.formatMessage('database', `Database ${operation}`, {
      operation,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      duration: `${duration}ms`,
      ...extra
    });

    if (this.isDevelopment) {
      console.log('🗄️', JSON.stringify(logData, null, 2));
    } else {
      console.log(JSON.stringify(logData));
    }
  }
}

export default new Logger();