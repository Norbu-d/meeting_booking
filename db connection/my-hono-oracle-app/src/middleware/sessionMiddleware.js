// middleware/sessionMiddleware.js
import sessionService from '../services/sessionService.js';
import logger from '../utils/logger.js';

const sessionMiddleware = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Session middleware - no token provided', {
        headers: Object.fromEntries(c.req.raw.headers)
      });
      return c.json({ 
        success: false, 
        message: 'Authorization token required' 
      }, 401);
    }

    const token = authHeader.split(' ')[1];
    
    if (!token || token.trim() === '') {
      logger.warn('Session middleware - empty token');
      return c.json({ 
        success: false, 
        message: 'Invalid authorization token format' 
      }, 401);
    }

    // Add timeout for session verification
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Session verification timeout')), 10000);
    });

    const verificationPromise = sessionService.verifyWiFiSession(token);

    // Use verifyWiFiSession for consistent return format
    const { valid, session, message } = await Promise.race([verificationPromise, timeoutPromise]);

    if (!valid) {
      logger.warn(`Session middleware - token validation failed: ${message}`, {
        tokenPreview: token.substring(0, 20) + '...',
        error: message
      });
      return c.json({ 
        success: false, 
        message: message || 'Invalid session' 
      }, 401);
    }

    // Attach session and user to context
    c.set('session', session);
    c.set('user', { 
      employee_id: session.employee_id,
      login_id: session.login_id,
      branch_code: session.branch_code,
      user_id: session.user_id,
      session_id: session.id || session.session_id // Ensure session_id is available
    });
    
    logger.debug(`Session middleware - valid token for user: ${session.login_id}`, {
      sessionId: session.id,
      userId: session.user_id
    });
    
    await next();
  } catch (error) {
    logger.error('Session middleware error:', {
      error: error.message,
      stack: error.stack,
      url: c.req.url,
      method: c.req.method
    });
    
    if (error.message.includes('timeout')) {
      return c.json({ 
        success: false, 
        message: 'Session verification timeout. Please try again.' 
      }, 408);
    }
    
    return c.json({ 
      success: false, 
      message: 'Session validation error' 
    }, 500);
  }
};

export default sessionMiddleware;