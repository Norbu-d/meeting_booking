// src/middleware/adminMiddleware.js
import adminService from '../services/adminService.js';
import bookingService from '../services/bookingService.js';
import logger from '../utils/logger.js';

/**
 * Middleware to require admin privileges
 */
export const requireAdmin = async (c, next) => {
  try {
    // Get user and session from context
    const user = c.get('user');
    const session = c.get('session');
    
    if (!user && !session) {
      logger.warn('requireAdmin - no user or session found in context');
      return c.json({
        success: false,
        message: 'Authentication required'
      }, 401);
    }

    // Try multiple ways to get the identifier - prioritize login_id over employee_id
    const identifier = user?.login_id || 
                      session?.login_id || 
                      user?.employee_id || 
                      session?.employee_id || 
                      user?.user_id;
    
    if (!identifier) {
      logger.warn('requireAdmin - no identifier found:', { user, session });
      return c.json({
        success: false,
        message: 'User identification missing'
      }, 401);
    }

    logger.info('Checking admin access for identifier:', { 
      identifier, 
      loginId: user?.login_id || session?.login_id,
      employeeId: user?.employee_id || session?.employee_id 
    });

    const isAdmin = await adminService.checkAdminAccess(identifier);
    
    if (!isAdmin) {
      logger.warn('Admin access denied:', { 
        identifier, 
        user: user?.login_id || session?.login_id,
        employeeId: user?.employee_id || session?.employee_id
      });
      return c.json({
        success: false,
        message: 'Administrator privileges required'
      }, 403);
    }

    // Set admin flag and identifiers for use in controllers
    c.set('isAdmin', true);
    c.set('sessionId', identifier);
    c.set('loginId', user?.login_id || session?.login_id);
    
    logger.info('Admin access granted:', { 
      identifier,
      loginId: user?.login_id || session?.login_id
    });
    
    await next();
  } catch (error) {
    logger.error('Error in requireAdmin middleware:', error);
    return c.json({
      success: false,
      message: 'Authentication error'
    }, 500);
  }
};

/**
 * Middleware to check if user can edit a booking
 * Allows users to edit their own bookings, admins can edit any booking
 */
export const canEditBooking = async (c, next) => {
  try {
    const bookingId = c.req.param('bookingId');
    const user = c.get('user');
    const session = c.get('session');
    
    if (!user && !session) {
      return c.json({
        success: false,
        message: 'Authentication required'
      }, 401);
    }

    if (!bookingId) {
      return c.json({
        success: false,
        message: 'Booking ID required'
      }, 400);
    }

    const identifier = user?.login_id || 
                      session?.login_id || 
                      user?.employee_id || 
                      session?.employee_id;

    // Check if user is admin
    const isAdmin = await adminService.checkAdminAccess(identifier);
    
    if (isAdmin) {
      logger.info('Admin can edit any booking:', { identifier, bookingId });
      c.set('isAdmin', true);
      c.set('canEdit', true);
      await next();
      return;
    }

    // If not admin, check if user owns the booking
    try {
      const booking = await bookingService.getBookingById(bookingId);
      
      if (!booking) {
        return c.json({
          success: false,
          message: 'Booking not found'
        }, 404);
      }

      // Check ownership using both session_id and employee_id
      const userOwnsBooking = booking.session_id === identifier ||
                            booking.session_id === (user?.login_id || session?.login_id) ||
                            booking.employee_id === identifier ||
                            booking.employee_id === (user?.employee_id || session?.employee_id);

      if (!userOwnsBooking) {
        logger.warn('User cannot edit booking they do not own:', { 
          identifier,
          bookingId,
          bookingSessionId: booking.session_id,
          bookingEmployeeId: booking.employee_id
        });
        return c.json({
          success: false,
          message: 'You can only edit your own bookings'
        }, 403);
      }

      logger.info('User can edit their own booking:', { identifier, bookingId });
      c.set('isAdmin', false);
      c.set('canEdit', true);
      c.set('booking', booking);
      
      await next();
    } catch (error) {
      logger.error('Error checking booking ownership:', error);
      return c.json({
        success: false,
        message: 'Error validating booking access'
      }, 500);
    }
  } catch (error) {
    logger.error('Error in canEditBooking middleware:', error);
    return c.json({
      success: false,
      message: 'Authentication error'
    }, 500);
  }
};

/**
 * Middleware to check if user can view booking details
 * Similar to canEditBooking but for read access
 */
export const canViewBooking = async (c, next) => {
  try {
    const bookingId = c.req.param('bookingId');
    const user = c.get('user');
    const session = c.get('session');
    
    if (!user && !session) {
      return c.json({
        success: false,
        message: 'Authentication required'
      }, 401);
    }

    const identifier = user?.login_id || 
                      session?.login_id || 
                      user?.employee_id || 
                      session?.employee_id;

    // Check if user is admin (can view all)
    const isAdmin = await adminService.checkAdminAccess(identifier);
    
    if (isAdmin) {
      c.set('isAdmin', true);
      c.set('canView', true);
      await next();
      return;
    }

    // If not admin, check if user owns the booking
    try {
      const booking = await bookingService.getBookingById(bookingId);
      
      if (!booking) {
        return c.json({
          success: false,
          message: 'Booking not found'
        }, 404);
      }

      const userOwnsBooking = booking.session_id === identifier ||
                            booking.session_id === (user?.login_id || session?.login_id) ||
                            booking.employee_id === identifier ||
                            booking.employee_id === (user?.employee_id || session?.employee_id);

      if (!userOwnsBooking) {
        return c.json({
          success: false,
          message: 'You can only view your own bookings'
        }, 403);
      }

      c.set('isAdmin', false);
      c.set('canView', true);
      c.set('booking', booking);
      
      await next();
    } catch (error) {
      logger.error('Error checking booking access:', error);
      return c.json({
        success: false,
        message: 'Error validating booking access'
      }, 500);
    }
  } catch (error) {
    logger.error('Error in canViewBooking middleware:', error);
    return c.json({
      success: false,
      message: 'Authentication error'
    }, 500);
  }
};