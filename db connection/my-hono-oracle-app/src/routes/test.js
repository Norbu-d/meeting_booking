// src/routes/test.js
import { Hono } from 'hono';
import { executeQuery, getPoolStatistics } from '../config/database.js';
import logger from '../utils/logger.js';

const test = new Hono();

// Health check endpoint
test.get('/health', async (c) => {
  try {
    const result = await executeQuery('SELECT SYSDATE, USER FROM DUAL');
    const poolStats = getPoolStatistics();
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: result.rows[0].SYSDATE,
        connectedUser: result.rows[0].USER,
        poolStats
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    return c.json({
      status: 'unhealthy',
      error: error.message
    }, 500);
  }
});

// Test EMPMAS table connection
test.get('/test-empmas', async (c) => {
  try {
    const result = await executeQuery(`
      SELECT COUNT(*) as TOTAL_USERS
      FROM EMPMAS 
      WHERE ROWNUM <= 10
    `);
    
    return c.json({
      status: 'success',
      message: 'EMPMAS table accessible',
      totalUsers: result.rows[0].TOTAL_USERS,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('EMPMAS test failed:', error);
    return c.json({
      status: 'error',
      message: 'Failed to access EMPMAS table',
      error: error.message
    }, 500);
  }
});

// Test user lookup and password info (for debugging - REMOVE IN PRODUCTION)
test.get('/debug-user/:username', async (c) => {
  try {
    const username = c.req.param('username');
    
    const result = await executeQuery(`
      SELECT LOGIN_ID, 
             LENGTH(PASSWORD) as PASSWORD_LENGTH,
             SUBSTR(PASSWORD, 1, 3) || '...' as PASSWORD_PREVIEW,
             ASCII(SUBSTR(PASSWORD, 1, 1)) as FIRST_CHAR_ASCII,
             ROWID as USER_ID
      FROM EMPMAS 
      WHERE UPPER(LOGIN_ID) = UPPER(:username)
      AND ROWNUM = 1
    `, { username });
    
    if (result.rows.length === 0) {
      return c.json({
        status: 'not_found',
        message: 'User not found',
        username
      }, 404);
    }
    
    const user = result.rows[0];
    
    return c.json({
      status: 'found',
      user: {
        id: user.USER_ID,
        username: user.LOGIN_ID,
        passwordLength: user.PASSWORD_LENGTH,
        passwordPreview: user.PASSWORD_PREVIEW,
        firstCharAscii: user.FIRST_CHAR_ASCII
      },
      warning: "⚠️ This endpoint exposes password info - REMOVE IN PRODUCTION!"
    });
  } catch (error) {
    logger.error('Debug user lookup failed:', error);
    return c.json({
      status: 'error',
      message: 'Failed to lookup user',
      error: error.message
    }, 500);
  }
});

// Test password verification endpoint (REMOVE IN PRODUCTION)
test.post('/debug-password', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return c.json({
        status: 'error',
        message: 'Username and password required'
      }, 400);
    }
    
    const result = await executeQuery(`
      SELECT LOGIN_ID, PASSWORD, ROWID as USER_ID
      FROM EMPMAS 
      WHERE UPPER(LOGIN_ID) = UPPER(:username)
      AND ROWNUM = 1
    `, { username });
    
    if (result.rows.length === 0) {
      return c.json({
        status: 'user_not_found',
        message: 'User not found'
      }, 404);
    }
    
    const user = result.rows[0];
    
    return c.json({
      status: 'comparison_result',
      provided: {
        password: `"${password}"`,
        length: password.length,
        trimmed: `"${password.trim()}"`,
        trimmedLength: password.trim().length
      },
      stored: {
        password: `"${user.PASSWORD}"`,
        length: user.PASSWORD?.length || 0,
        trimmed: `"${user.PASSWORD?.trim() || ''}"`,
        trimmedLength: user.PASSWORD?.trim()?.length || 0
      },
      comparisons: {
        exact: password === user.PASSWORD,
        trimmed: password.trim() === user.PASSWORD?.trim(),
        caseInsensitive: password.toLowerCase() === user.PASSWORD?.toLowerCase(),
        trimmedCaseInsensitive: password.trim().toLowerCase() === user.PASSWORD?.trim()?.toLowerCase()
      },
      warning: "⚠️ This endpoint exposes passwords - REMOVE IN PRODUCTION!"
    });
  } catch (error) {
    logger.error('Debug password test failed:', error);
    return c.json({
      status: 'error',
      message: 'Failed to test password',
      error: error.message
    }, 500);
  }
});

export default test;