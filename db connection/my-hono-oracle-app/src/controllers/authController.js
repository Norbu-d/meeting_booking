import authService from '../services/sessionService.js';
import sessionService from '../services/sessionService.js';
import logger from '../utils/logger.js';

class AuthController {
  // Common response handler for authentication success
  #handleAuthSuccess(c, userId, authResult, financialYear, sessionData) {
    logger.info(`Authentication successful for user: ${userId}`);
    
    return c.json({
      success: true,
      message: 'Authentication successful',
      data: {
        token: sessionData.token,
        user: authResult.user,
        branch: authResult.branch,
        company: authResult.company,
        designation: authResult.designation,
        financialYear: financialYear,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuedAt: new Date().toISOString()
      }
    });
  }

  // Common error handler
  #handleError(c, error, context) {
    logger.error(`${context} error:`, error);
    return c.json({ 
      success: false, 
      message: 'Internal server error' 
    }, 500);
  }

  // WiFi-based authentication
  async wifiAuthentication(c) {
    try {
      const { userId, financialYear, password } = await c.req.json();
      
      // Input validation
      if (!userId || !password || !financialYear) {
        return c.json({
          success: false,
          message: 'userId, password, and financialYear are required'
        }, 400);
      }

      logger.info(`WiFi authentication attempt for user: ${userId}, FY: ${financialYear}`);

      const authResult = await authService.authenticateUser(userId, password, financialYear);
      
      if (!authResult.success) {
        logger.warn(`Authentication failed for user: ${userId} - ${authResult.message}`);
        return c.json({ 
          success: false, 
          message: authResult.message 
        }, 401);
      }

      const sessionData = await sessionService.createSession(authResult.user, financialYear);
      return this.#handleAuthSuccess(c, userId, authResult, financialYear, sessionData);

    } catch (error) {
      return this.#handleError(c, error, 'WiFi authentication');
    }
  }

  // Manual login (fallback method)
  async manualLogin(c) {
    try {
      const { userId, password, financialYear } = await c.req.json();
      
      // Input validation
      if (!userId || !password || !financialYear) {
        return c.json({
          success: false,
          message: 'userId, password, and financialYear are required'
        }, 400);
      }

      logger.info(`Manual login attempt for user: ${userId}`);

      const authResult = await authService.authenticateUser(userId, password, financialYear, true);
      
      if (!authResult.success) {
        logger.warn(`Manual login failed for user: ${userId} - ${authResult.message}`);
        return c.json({ 
          success: false, 
          message: authResult.message 
        }, 401);
      }

      const sessionData = await sessionService.createSession(authResult.user, financialYear);
      return this.#handleAuthSuccess(c, userId, authResult, financialYear, sessionData);

    } catch (error) {
      return this.#handleError(c, error, 'Manual login');
    }
  }

  // Verify JWT token
  async verifyToken(c) {
    try {
      const token = c.req.header('Authorization')?.split(' ')[1]; // Safer token extraction
      
      if (!token) {
        return c.json({ 
          success: false, 
          message: 'Authorization token required' 
        }, 401);
      }

      const verification = await sessionService.verifySession(token);
      
      if (!verification.valid) {
        logger.warn(`Token verification failed: ${verification.message}`);
        return c.json({ 
          success: false, 
          message: verification.message 
        }, 401);
      }

      return c.json({
        success: true,
        message: 'Token is valid',
        data: {
          ...verification.payload,
          expiresIn: verification.expiresIn
        }
      });

    } catch (error) {
      return this.#handleError(c, error, 'Token verification');
    }
  }

  // Get session status
  async getSessionStatus(c) {
    try {
      const token = c.req.header('Authorization')?.split(' ')[1];
      
      if (!token) {
        return c.json({ 
          success: false, 
          message: 'No active session' 
        }, 401);
      }

      const verification = await sessionService.verifySession(token);
      
      return c.json({
        success: true,
        data: {
          isActive: verification.valid,
          user: verification.valid ? verification.payload : null,
          expiresIn: verification.expiresIn
        }
      });

    } catch (error) {
      return this.#handleError(c, error, 'Session status check');
    }
  }

  // Logout
  async logout(c) {
    try {
      const token = c.req.header('Authorization')?.split(' ')[1];
      
      if (!token) {
        return c.json({ 
          success: false, 
          message: 'No active session to logout' 
        }, 400);
      }

      await sessionService.invalidateSession(token);
      logger.info(`User logged out successfully for token: ${token.substring(0, 10)}...`);

      return c.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      return this.#handleError(c, error, 'Logout');
    }
  }
}

export default new AuthController();