import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

class SessionService {
  constructor() {
    this.invalidatedTokens = new Set(); // In-memory token blacklist
    this.jwtSecret = process.env.JWT_SECRET || 'your-fallback-secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  async createSession(user, financialYear) {
    try {
      const payload = {
        employee_id: user.employeeId, // Changed to match middleware expectation
        login_id: user.loginId,       // Changed to snake_case for consistency
        branch_code: user.branchCode,  // Changed to snake_case for consistency
        financial_year: financialYear, // Changed to snake_case for consistency
        login_time: new Date().toISOString(),
        session_id: this.generateSessionId()
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: 'wifi-auth-backend',
        audience: 'wifi-auth-frontend'
      });

      logger.info(`Session created for user: ${user.loginId}, Session ID: ${payload.session_id}`);

      return {
        token,
        sessionId: payload.session_id,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  async verifyWiFiSession(token) {
    try {
      // Check if token is blacklisted
      if (this.invalidatedTokens.has(token)) {
        return {
          valid: false,
          message: 'Token has been invalidated',
          session: null
        };
      }

      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: 'wifi-auth-backend',
        audience: 'wifi-auth-frontend'
      });

      // Return the format that middleware expects: { valid, session, message }
      return {
        valid: true,
        session: payload,
        message: 'Token is valid'
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          message: 'Token has expired',
          session: null
        };
      } else if (error.name === 'JsonWebTokenError') {
        return {
          valid: false,
          message: 'Invalid token',
          session: null
        };
      }
      
      logger.error('Error verifying session:', error);
      return {
        valid: false,
        message: 'Token verification failed',
        session: null
      };
    }
  }

  async verifySession(token) {
    // Keep the original verifySession method for backward compatibility
    // It now calls verifyWiFiSession internally
    const result = await this.verifyWiFiSession(token);
    return {
      valid: result.valid,
      payload: result.session, // Map session to payload for backward compatibility
      message: result.message
    };
  }

  async invalidateSession(token) {
    try {
      // Add token to blacklist
      this.invalidatedTokens.add(token);
      
      // Clean up expired tokens periodically (simple cleanup)
      if (this.invalidatedTokens.size > 1000) {
        this.cleanupExpiredTokens();
      }
      
      logger.info('Session invalidated');
      return true;
    } catch (error) {
      logger.error('Error invalidating session:', error);
      throw error;
    }
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  cleanupExpiredTokens() {
    try {
      const tokensToRemove = [];
      
      this.invalidatedTokens.forEach(token => {
        try {
          jwt.verify(token, this.jwtSecret);
        } catch (error) {
          if (error.name === 'TokenExpiredError') {
            tokensToRemove.push(token);
          }
        }
      });
      
      tokensToRemove.forEach(token => {
        this.invalidatedTokens.delete(token);
      });
      
      logger.info(`Cleaned up ${tokensToRemove.length} expired tokens`);
    } catch (error) {
      logger.error('Error during token cleanup:', error);
    }
  }

  // Get session info without verification
  decodeSession(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Error decoding session:', error);
      return null;
    }
  }
}

export default new SessionService();