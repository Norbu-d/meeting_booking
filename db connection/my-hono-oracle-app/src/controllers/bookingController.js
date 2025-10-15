// src/controllers/bookingController.js
import bookingService from '../services/bookingService.js';
import BookingValidation from '../services/booking/bookingValidation.js';
import logger from '../utils/logger.js';

class BookingController {
  constructor() {
    this.bookingValidation = new BookingValidation();
  }

  async createBooking(c) {
    try {
      const session = c.get('session');
      const user = c.get('user');
      const bookingData = await c.req.json();

      // Add session_id from authenticated user
      bookingData.session_id = session.login_id || session.userId || session.employee_id;

      if (!bookingData.session_id) {
        logger.error('No valid session identifier found:', { session });
        return c.json({
          success: false,
          message: 'Invalid session'
        }, 401);
      }

      // Validate booking data using the new validation service
      const validationResult = this.bookingValidation.validateBookingData(bookingData);
      if (!validationResult.success) {
        return c.json(validationResult, 400);
      }

      logger.info('Creating booking for user:', { 
        sessionId: bookingData.session_id, 
        room_id: bookingData.room_id, 
        date: bookingData.date,
        is_multi_day: bookingData.is_multi_day,
        all_day: bookingData.all_day,
        isAdmin: session.isAdmin || false
      });

      const result = await bookingService.createBooking(bookingData);
      
      if (!result.success) {
        const statusCode = result.conflicts ? 409 : 400;
        logger.warn('Booking creation failed:', { result, sessionId: bookingData.session_id });
        return c.json(result, statusCode);
      }

      logger.info(`Booking created successfully by ${bookingData.session_id}:`, { 
        bookingId: result.data.id 
      });
      return c.json(result, 201);

    } catch (error) {
      logger.error('Booking creation failed:', {
        error: error.message,
        stack: error.stack
      });
      return c.json({
        success: false,
        message: 'Failed to create booking'
      }, 500);
    }
  }

  async getRoomBookings(c) {
    try {
      const roomId = c.req.param('roomId');
      const { date } = c.req.query();

      if (!roomId) {
        return c.json({
          success: false,
          message: 'Room ID is required'
        }, 400);
      }

      logger.info('Getting room bookings:', { roomId, date });

      const result = await bookingService.getBookingsByRoom(roomId, date);
      
      if (result.success) {
        logger.info(`Retrieved ${result.data.length} bookings for room ${roomId}`);
      }

      return c.json(result);

    } catch (error) {
      logger.error('Failed to get room bookings:', {
        error: error.message,
        roomId: c.req.param('roomId'),
        date: c.req.query('date')
      });
      return c.json({
        success: false,
        message: 'Failed to get bookings'
      }, 500);
    }
  }

  async getUserBookings(c) {
    try {
      const session = c.get('session');
      const sessionId = session.login_id || session.userId || session.employee_id;

      if (!sessionId) {
        return c.json({
          success: false,
          message: 'Invalid session'
        }, 401);
      }

      logger.info('Getting user bookings:', { sessionId });

      const result = await bookingService.getUserBookings(sessionId);
      
      if (result.success) {
        logger.info(`Retrieved ${result.data.all.length} bookings for user ${sessionId}`);
      }

      return c.json(result);

    } catch (error) {
      logger.error('Failed to get user bookings:', {
        error: error.message,
        stack: error.stack
      });
      return c.json({
        success: false,
          message: 'Failed to get your bookings'
      }, 500);
    }
  }

  // NEW METHOD: Get all bookings that users should see (approved + their own pending)
  async getAllUserVisibleBookings(c) {
    try {
      const session = c.get('session');
      const sessionId = session.login_id || session.userId || session.employee_id;

      if (!sessionId) {
        return c.json({
          success: false,
          message: 'Invalid session'
        }, 401);
      }

      logger.info('Getting all user-visible bookings:', { sessionId });

      // Get ALL approved bookings + current user's pending bookings
      const result = await bookingService.getAllUserVisibleBookings(sessionId);
      
      if (!result.success) {
        return c.json(result, 400);
      }

      // Log the results for debugging
      console.log('All user-visible bookings result:', {
        totalBookings: result.data.all?.length || 0,
        approvedBookings: result.data.all?.filter(b => b.status === 'approved').length || 0,
        userPendingBookings: result.data.all?.filter(b => b.status === 'pending' && b.session_id === sessionId).length || 0
      });

      logger.info(`Retrieved ${result.data.all?.length || 0} user-visible bookings for user ${sessionId}`);
      return c.json(result);

    } catch (error) {
      logger.error('Failed to get all user-visible bookings:', {
        error: error.message,
        stack: error.stack
      });
      return c.json({
        success: false,
        message: 'Failed to get bookings'
      }, 500);
    }
  }

  async getUserPendingApprovedBookings(c) {
    try {
      const session = c.get('session');
      const sessionId = session.login_id || session.userId || session.employee_id;

      if (!sessionId) {
        return c.json({
          success: false,
          message: 'Invalid session'
        }, 401);
      }

      logger.info('Getting user pending and approved bookings:', { sessionId });

      // Get ALL user bookings first (this should work with your existing service)
      const result = await bookingService.getUserBookings(sessionId);
      
      if (!result.success) {
        return c.json(result, 400);
      }

      // Log the original data to see what we're getting
      console.log('Original getUserBookings result:', {
        totalBookings: result.data.all?.length || 0,
        sampleBookings: result.data.all?.slice(0, 3) || []
      });

      // Filter for only pending and approved bookings
      const allBookings = result.data.all || [];
      const pendingApprovedBookings = allBookings.filter(booking => 
        booking.status === 'pending' || booking.status === 'approved'
      );

      // Log filtered results
      console.log('Filtered results:', {
        originalCount: allBookings.length,
        filteredCount: pendingApprovedBookings.length,
        statuses: [...new Set(allBookings.map(b => b.status))]
      });

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().substring(0, 5);
      
      const upcoming = pendingApprovedBookings.filter(booking => {
        const endDate = booking.is_multi_day ? booking.end_date : booking.date;
        return endDate > today || (booking.date === today && (!booking.start_time || booking.start_time > now));
      });
      
      const past = pendingApprovedBookings.filter(booking => {
        const endDate = booking.is_multi_day ? booking.end_date : booking.date;
        return endDate < today || (booking.date === today && (booking.start_time && booking.start_time <= now));
      });

      const filteredResult = {
        success: true,
        data: {
          all: pendingApprovedBookings,
          upcoming,
          past,
          statuses: ['pending', 'approved']
        },
        message: 'Your pending and approved bookings retrieved successfully'
      };

      logger.info(`Retrieved ${pendingApprovedBookings.length} pending/approved bookings out of ${allBookings.length} total for user ${sessionId}`);
      return c.json(filteredResult);

    } catch (error) {
      logger.error('Failed to get user pending/approved bookings:', {
        error: error.message,
        stack: error.stack
      });
      return c.json({
        success: false,
        message: 'Failed to get your bookings'
      }, 500);
    }
  }

  async getAllBookings(c) {
    try {
      const session = c.get('session');
      const { date, room_id, user_id, status } = c.req.query();

      logger.info('Admin getting all bookings:', { 
        adminId: session.login_id,
        filters: { date, room_id, user_id, status }
      });

      const result = await bookingService.getAllBookings({ date, room_id, user_id, status });
      
      if (result.success) {
        logger.info(`Admin retrieved ${result.data.length} total bookings`);
      }

      return c.json(result);

    } catch (error) {
      logger.error('Failed to get all bookings:', {
        error: error.message,
        stack: error.stack
      });
      return c.json({
        success: false,
        message: 'Failed to get all bookings'
      }, 500);
    }
  }

  async cancelBooking(c) {
    try {
      const session = c.get('session');
      const bookingId = c.req.param('bookingId');
      const sessionId = session.login_id || session.userId || session.employee_id;

      if (!sessionId) {
        return c.json({
          success: false,
          message: 'Invalid session'
        }, 401);
      }

      if (!bookingId) {
        return c.json({
          success: false,
          message: 'Booking ID is required'
        }, 400);
      }

      logger.info('Canceling booking:', { 
        bookingId, 
        sessionId,
        isAdmin: session.isAdmin || false
      });

      // Pass admin status to service
      const result = await bookingService.cancelBooking(bookingId, sessionId, session.isAdmin);
      
      if (result.success) {
        const action = session.isAdmin ? 'Admin cancelled' : 'User cancelled';
        logger.info(`${action} booking ${bookingId} by ${sessionId}`);
      }

      return c.json(result);

    } catch (error) {
      logger.error('Failed to cancel booking:', {
        error: error.message,
        bookingId: c.req.param('bookingId'),
        stack: error.stack
      });
      return c.json({
        success: false,
        message: 'Failed to cancel booking'
      }, 500);
    }
  }

  async editBooking(c) {
    try {
      const session = c.get('session');
      const bookingId = c.req.param('bookingId');
      const sessionId = session.login_id || session.userId || session.employee_id;
      const updateData = await c.req.json();

      if (!sessionId) {
        return c.json({
          success: false,
          message: 'Invalid session'
        }, 401);
      }

      if (!bookingId) {
        return c.json({
          success: false,
          message: 'Booking ID is required'
        }, 400);
      }

      // Validate time format if provided
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (updateData.start_time && !timeRegex.test(updateData.start_time)) {
        return c.json({
          success: false,
          message: 'Invalid start_time format. Use HH:MM format'
        }, 400);
      }

      if (updateData.end_time && !timeRegex.test(updateData.end_time)) {
        return c.json({
          success: false,
          message: 'Invalid end_time format. Use HH:MM format'
        }, 400);
      }

      // Validate date format if provided
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (updateData.date && !dateRegex.test(updateData.date)) {
        return c.json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD format'
        }, 400);
      }

      // Validate end_date format if provided
      if (updateData.end_date && !dateRegex.test(updateData.end_date)) {
        return c.json({
          success: false,
          message: 'Invalid end_date format. Use YYYY-MM-DD format'
        }, 400);
      }

      // Validate status if provided (admin only)
      if (updateData.status && !session.isAdmin) {
        return c.json({
          success: false,
          message: 'Only admins can change booking status'
        }, 403);
      }

      if (updateData.status) {
        const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
        if (!validStatuses.includes(updateData.status)) {
          return c.json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          }, 400);
        }
      }

      logger.info('Editing booking:', { 
        bookingId, 
        sessionId,
        isAdmin: session.isAdmin || false,
        updates: updateData
      });

      const result = await bookingService.editBooking(
        bookingId, 
        sessionId, 
        updateData,
        session.isAdmin
      );
      
      if (result.success) {
        const action = session.isAdmin ? 'Admin edited' : 'User edited';
        logger.info(`${action} booking ${bookingId} by ${sessionId}`);
      }

      return c.json(result);

    } catch (error) {
      logger.error('Failed to edit booking:', {
        error: error.message,
        bookingId: c.req.param('bookingId'),
        stack: error.stack
      });
      return c.json({
        success: false,
        message: 'Failed to edit booking'
      }, 500);
    }
  }

  async getAvailableSlots(c) {
    try {
      const roomId = c.req.param('roomId');
      const { date } = c.req.query();

      if (!roomId || !date) {
        return c.json({
          success: false,
          message: 'Room ID and date are required'
        }, 400);
      }

      logger.info('Getting available slots:', { roomId, date });

      const result = await bookingService.getAvailableSlots(roomId, date);
      return c.json(result);

    } catch (error) {
      logger.error('Failed to get available slots:', {
        error: error.message,
        roomId: c.req.param('roomId'),
        date: c.req.query('date')
      });
      return c.json({
        success: false,
        message: 'Failed to get available slots'
      }, 500);
    }
  }

  async getMultiDayAvailability(c) {
    try {
      const roomId = c.req.param('roomId');
      const { start_date, end_date } = c.req.query();

      if (!roomId || !start_date || !end_date) {
        return c.json({
          success: false,
          message: 'Room ID, start_date, and end_date are required'
        }, 400);
      }

      // Validate date formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
        return c.json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD format'
        }, 400);
      }

      if (new Date(end_date) <= new Date(start_date)) {
        return c.json({
          success: false,
          message: 'End date must be after start date'
        }, 400);
      }

      logger.info('Getting multi-day availability:', { roomId, start_date, end_date });

      const result = await bookingService.getMultiDayAvailability(roomId, start_date, end_date);
      return c.json(result);

    } catch (error) {
      logger.error('Failed to get multi-day availability:', {
        error: error.message,
        roomId: c.req.param('roomId'),
        start_date: c.req.query('start_date'),
        end_date: c.req.query('end_date')
      });
      return c.json({
        success: false,
        message: 'Failed to get multi-day availability'
      }, 500);
    }
  }

  /**
   * Get pending bookings for admin approval
   */
  async getPendingBookings(c) {
    try {
      const session = c.get('session');
      const { page = 1, limit = 10 } = c.req.query();

      logger.info('Admin getting pending bookings:', { 
        adminId: session.login_id,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      const result = await bookingService.getPendingBookings(
        parseInt(page), 
        parseInt(limit)
      );
      
      if (result.success) {
        logger.info(`Admin retrieved ${result.data.length} pending bookings`);
      }

      return c.json(result);

    } catch (error) {
      logger.error('Failed to get pending bookings:', {
        error: error.message,
        stack: error.stack
      });
      return c.json({
        success: false,
        message: 'Failed to get pending bookings'
      }, 500);
    }
  }

  /**
   * Update booking status (admin only)
   */
// In your bookingController.js - update the updateBookingStatus method
/**
 * Update booking status (admin only) - Fixed version
 */
async updateBookingStatus(c) {
  try {
    const bookingId = c.req.param('bookingId');
    const { status, admin_remarks } = await c.req.json();
    
    // Get admin info from context (set by requireAdmin middleware)
    const user = c.get('user');
    const session = c.get('session');
    const isAdmin = c.get('isAdmin');
    const sessionId = c.get('sessionId'); // Set by middleware
    const loginId = c.get('loginId'); // Set by middleware

    if (!isAdmin) {
      return c.json({
        success: false,
        message: 'Admin privileges required'
      }, 403);
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return c.json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, 400);
    }

    logger.info('Admin updating booking status:', {
      bookingId,
      status,
      admin_remarks,
      adminId: sessionId,
      adminLogin: loginId
    });

    const result = await bookingService.updateBookingStatus(bookingId, status, admin_remarks);

    if (result.success) {
      logger.info(`Booking ${bookingId} ${status} successfully by admin ${loginId}`);
      return c.json({
        success: true,
        message: `Booking ${status} successfully`,
        data: result.data
      });
    } else {
      logger.warn('Failed to update booking status:', result);
      return c.json({
        success: false,
        message: result.message || 'Failed to update booking status'
      }, 400);
    }

  } catch (error) {
    logger.error('Error updating booking status:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
}
}

export default new BookingController();