import logger from './logger.js';

class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

const validateWifiAuth = async (c, next) => {
  try {
    const body = await c.req.json();
    const errors = [];

    // Validate required fields
    if (!body.userId || typeof body.userId !== 'string' || body.userId.trim() === '') {
      errors.push({ field: 'userId', message: 'User ID is required and must be a non-empty string' });
    }

    if (!body.financialYear || typeof body.financialYear !== 'string' || body.financialYear.trim() === '') {
      errors.push({ field: 'financialYear', message: 'Financial Year is required and must be a non-empty string' });
    }

    // Password is optional for WiFi auth but validate format if provided
    if (body.password !== undefined && (typeof body.password !== 'string')) {
      errors.push({ field: 'password', message: 'Password must be a string if provided' });
    }

    // Validate userId format (basic alphanumeric check)
    if (body.userId && !/^[a-zA-Z0-9_-]+$/.test(body.userId.trim())) {
      errors.push({ field: 'userId', message: 'User ID contains invalid characters' });
    }

    // Validate financial year format (assuming YYYY format)
    if (body.financialYear && !/^\d{4}$/.test(body.financialYear.trim())) {
      errors.push({ field: 'financialYear', message: 'Financial Year must be in YYYY format' });
    }

    if (errors.length > 0) {
      logger.warn('Validation failed for WiFi auth:', errors);
      return c.json({
        success: false,
        message: 'Validation failed',
        errors
      }, 400);
    }

    // Sanitize inputs
    body.userId = body.userId.trim();
    body.financialYear = body.financialYear.trim();
    if (body.password) {
      body.password = body.password.trim();
    }

    await next();
  } catch (error) {
    logger.error('Validation middleware error:', error);
    return c.json({
      success: false,
      message: 'Invalid request body'
    }, 400);
  }
};

const validateManualLogin = async (c, next) => {
  try {
    const body = await c.req.json();
    const errors = [];

    // All fields are required for manual login
    if (!body.userId || typeof body.userId !== 'string' || body.userId.trim() === '') {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }

    if (!body.password || typeof body.password !== 'string' || body.password.trim() === '') {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    if (!body.financialYear || typeof body.financialYear !== 'string' || body.financialYear.trim() === '') {
      errors.push({ field: 'financialYear', message: 'Financial Year is required' });
    }

    // Validate formats
    if (body.userId && !/^[a-zA-Z0-9_-]+$/.test(body.userId.trim())) {
      errors.push({ field: 'userId', message: 'User ID contains invalid characters' });
    }

    if (body.financialYear && !/^\d{4}$/.test(body.financialYear.trim())) {
      errors.push({ field: 'financialYear', message: 'Financial Year must be in YYYY format' });
    }

    // Password strength validation
    if (body.password && body.password.trim().length < 3) {
      errors.push({ field: 'password', message: 'Password must be at least 3 characters long' });
    }

    if (errors.length > 0) {
      logger.warn('Validation failed for manual login:', errors);
      return c.json({
        success: false,
        message: 'Validation failed',
        errors
      }, 400);
    }

    // Sanitize inputs
    body.userId = body.userId.trim();
    body.password = body.password.trim();
    body.financialYear = body.financialYear.trim();

    await next();
  } catch (error) {
    logger.error('Manual login validation error:', error);
    return c.json({
      success: false,
      message: 'Invalid request body'
    }, 400);
  }
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .trim()
    .replace(/[<>'"&]/g, '') // Remove potentially harmful characters
    .substring(0, 255); // Limit length
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
};

export {  // Change module.exports to export
  validateWifiAuth,
  validateManualLogin,
  sanitizeInput,
  validateEmail,
  validatePhoneNumber,
  ValidationError
};