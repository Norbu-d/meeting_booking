// src/routes/auth.js
import { Hono } from 'hono';
import authService from '../services/authService.js';
import logger from '../utils/logger.js';

const auth = new Hono();

// Login endpoint
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return c.json({
        success: false,
        message: 'Username and password are required'
      }, 400);
    }

    // Authenticate user
    const result = await authService.authenticateUser(username, password);

    if (result.success) {
      logger.info('User login successful:', { username });
      return c.json(result, 200);
    } else {
      logger.warn('User login failed:', { username, reason: result.message });
      return c.json(result, 401);
    }
  } catch (error) {
    logger.error('Login endpoint error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

export default auth;