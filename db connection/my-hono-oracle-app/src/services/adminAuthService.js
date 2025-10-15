// src/services/adminAuthService.js
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

class AdminAuthService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.jwtSecret = process.env.JWT_SECRET || 'your-fallback-secret';
  }

  /**
   * Authenticate admin user
   */
  async authenticateAdmin(username, password) {
    try {
      if (!username || !password) {
        return {
          success: false,
          message: 'Username and password are required'
        };
      }

      logger.info('Admin authentication attempt:', { username });

      // Check admin credentials in Supabase
      const { data: admin, error } = await this.supabase
        .from('admin_users')
        .select('*')
        .eq('login_id', username)
        .eq('password', password)
        .eq('is_active', true)
        .single();

      if (error || !admin) {
        logger.warn('Admin authentication failed:', { username });
        return {
          success: false,
          message: 'Invalid admin credentials'
        };
      }

      // Generate JWT token for admin
      const token = this.generateAdminToken({
        admin_id: admin.id,
        username: admin.login_id,
        role: admin.role
      });

      logger.info('Admin authentication successful:', { username: admin.login_id });

      return {
        success: true,
        message: 'Admin authentication successful',
        token,
        admin: {
          id: admin.id,
          username: admin.login_id,
          role: admin.role
        }
      };

    } catch (error) {
      logger.error('Admin authentication error:', error);
      return {
        success: false,
        message: 'Internal authentication error'
      };
    }
  }

  generateAdminToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '8h',
      issuer: 'meeting-booking-system',
      audience: 'admin-users'
    });
  }

  /**
   * Verify admin token
   */
  async verifyAdminToken(token) {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: 'meeting-booking-system',
        audience: 'admin-users'
      });

      return {
        valid: true,
        payload,
        message: 'Token is valid'
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Invalid token',
        payload: null
      };
    }
  }
}

export default new AdminAuthService();