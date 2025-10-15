import sessionService from '../services/sessionService.js';
import logger from '../utils/logger.js';

class SessionController {
  async createWiFiSession(c) {
    try {
      const user = c.get('user');
      const result = await sessionService.createWiFiSession(user.userId);
      
      if (!result.success) {
        return c.json(result, 500);
      }
      
      return c.json(result);
    } catch (error) {
      logger.error('Failed to create WiFi session:', error);
      return c.json({
        success: false,
        message: 'Failed to create WiFi session'
      }, 500);
    }
  }

  async getSessionStatus(c) {
    try {
      const token = c.get('token');
      const result = await sessionService.verifyWiFiSession(token);
      
      if (!result.valid) {
        return c.json(result, 401);
      }
      
      return c.json({
        active: true,
        expires_at: result.session.end_time,
        employee_id: result.session.employee_id
      });
    } catch (error) {
      logger.error('Failed to verify session:', error);
      return c.json({
        success: false,
        message: 'Failed to verify session'
      }, 500);
    }
  }

  async logoutWiFi(c) {
    try {
      const token = c.get('token');
      const result = await sessionService.invalidateWiFiSession(token);
      
      if (!result.success) {
        return c.json(result, 500);
      }
      
      return c.json(result);
    } catch (error) {
      logger.error('Failed to logout:', error);
      return c.json({
        success: false,
        message: 'Failed to logout'
      }, 500);
    }
  }
}

export default new SessionController();