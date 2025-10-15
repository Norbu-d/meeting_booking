// src/services/authService.js
import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/database.js';
import logger from '../utils/logger.js';

class AuthService {
  constructor() {
    // Use consistent JWT configuration with SessionService
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    // Define admin users - Option 2: Code-Level Admin Array
    this.adminUsers = ['115437', '115558']; // Martshala@806 and Footballer@576
    
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /**
   * Check if a user is an admin
   * @param {string} loginId 
   * @returns {boolean}
   */
  isAdmin(loginId) {
    return this.adminUsers.includes(loginId);
  }

  /**
   * Authenticate user with Oracle password encryption
   * @param {string} username 
   * @param {string} password 
   * @returns {Object} Authentication result
   */
  async authenticateUser(username, password) {
    try {
      // Validate input
      if (!username || !password) {
        return {
          success: false,
          message: 'Username and password are required'
        };
      }

      logger.info('Authentication attempt for:', { username });

      // Query with Oracle password format matching
      const query = `
        SELECT 
          ROWID as USER_ID,
          LOGIN_ID,
          PASSWORD AS ENCRYPTED_PASSWORD
        FROM EMPMAS
        WHERE UPPER(LOGIN_ID) = UPPER(:username)
        AND PASSWORD = UTL_I18N.STRING_TO_RAW(UPPER(:password), 'AL32UTF8')
        AND USER_IND = 'Y'
        AND ROWNUM = 1
      `;

      const result = await executeQuery(query, { 
        username: username.trim(),
        password: password.trim()
      });

      if (!result.rows || result.rows.length === 0) {
        logger.warn('Authentication failed - invalid credentials:', { username });
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      const user = result.rows[0];
      
      // Check if user is admin
      const isAdminUser = this.isAdmin(user.LOGIN_ID);
      
      logger.info('Authentication successful for user:', { 
        username: user.LOGIN_ID,
        isAdmin: isAdminUser 
      });

      // Generate JWT token with CONSISTENT configuration matching SessionService
      const token = this.generateToken({
        userId: user.USER_ID,        // Keep original field for backward compatibility
        username: user.LOGIN_ID,     // Keep original field for backward compatibility
        employee_id: user.USER_ID,   // Add fields expected by SessionService
        login_id: user.LOGIN_ID,     // Add fields expected by SessionService
        user_id: user.USER_ID,       // Add fields expected by SessionService
        isAdmin: isAdminUser,        // Add admin flag
        login_time: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Authentication successful',
        token,
        user: {
          id: user.USER_ID,
          username: user.LOGIN_ID,
          employeeId: user.USER_ID,
          loginId: user.LOGIN_ID,
          isAdmin: isAdminUser
        }
      };

    } catch (error) {
      logger.error('Authentication error:', {
        username,
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        message: 'Internal authentication error'
      };
    }
  }

  /**
   * Alternative method to verify password if direct query approach doesn't work
   */
  async authenticateUserAlternative(username, password) {
    try {
      // Validate input
      if (!username || !password) {
        return {
          success: false,
          message: 'Username and password are required'
        };
      }

      logger.info('Alternative authentication attempt for:', { username });

      // First get user data
      const userQuery = `
        SELECT 
          ROWID as USER_ID,
          LOGIN_ID,
          PASSWORD AS ENCRYPTED_PASSWORD
        FROM EMPMAS
        WHERE UPPER(LOGIN_ID) = UPPER(:username)
        AND USER_IND = 'Y'
        AND ROWNUM = 1
      `;

      const userResult = await executeQuery(userQuery, { username: username.trim() });

      if (!userResult.rows || userResult.rows.length === 0) {
        logger.warn('User not found:', { username });
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Now verify password using Oracle function
      const passwordQuery = `
        SELECT 
          CASE 
            WHEN UTL_I18N.STRING_TO_RAW(UPPER(:password), 'AL32UTF8') = :storedPassword 
            THEN 1 
            ELSE 0 
          END AS PASSWORD_MATCH
        FROM DUAL
      `;

      const user = userResult.rows[0];
      const passwordResult = await executeQuery(passwordQuery, { 
        password: password.trim(),
        storedPassword: user.ENCRYPTED_PASSWORD
      });

      const passwordMatch = passwordResult.rows[0]?.PASSWORD_MATCH === 1;

      if (!passwordMatch) {
        logger.warn('Password mismatch for user:', { username });
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Check if user is admin
      const isAdminUser = this.isAdmin(user.LOGIN_ID);

      logger.info('Alternative authentication successful for user:', { 
        username: user.LOGIN_ID,
        isAdmin: isAdminUser 
      });

      // Generate JWT token with consistent configuration
      const token = this.generateToken({
        userId: user.USER_ID,
        username: user.LOGIN_ID,
        employee_id: user.USER_ID,
        login_id: user.LOGIN_ID,
        user_id: user.USER_ID,
        isAdmin: isAdminUser,
        login_time: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Authentication successful',
        token,
        user: {
          id: user.USER_ID,
          username: user.LOGIN_ID,
          employeeId: user.USER_ID,
          loginId: user.LOGIN_ID,
          isAdmin: isAdminUser
        }
      };

    } catch (error) {
      logger.error('Alternative authentication error:', {
        username,
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        message: 'Internal authentication error'
      };
    }
  }

  generateToken(payload) {
    // IMPORTANT: Use SAME issuer/audience as SessionService
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'wifi-auth-backend',      // MUST match SessionService
      audience: 'wifi-auth-frontend'    // MUST match SessionService
    });
  }

  // Method to verify token (for testing/debugging)
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'wifi-auth-backend',
        audience: 'wifi-auth-frontend'
      });
    } catch (error) {
      logger.error('Token verification failed:', error.message);
      return null;
    }
  }
}

export default new AuthService();