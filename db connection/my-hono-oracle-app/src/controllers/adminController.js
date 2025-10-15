// src/controllers/adminController.js
import bookingService from '../services/bookingService.js';
import logger from '../utils/logger.js';

class AdminController {
  async getPendingBookings(c) {
    try {
      const { page = 1, limit = 10 } = c.req.query();
      
      const result = await bookingService.getPendingBookings(parseInt(page), parseInt(limit));
      
      return c.json({
        success: true,
        ...result,
        message: 'Pending bookings retrieved successfully'
      });

    } catch (error) {
      logger.error('Error fetching pending bookings:', error);
      return c.json({
        success: false,
        message: 'Failed to fetch pending bookings'
      }, 500);
    }
  }

  async getAllBookings(c) {
    try {
      const { page = 1, limit = 10, status } = c.req.query();
      
      const result = await bookingService.getAllBookings({
        page: parseInt(page),
        limit: parseInt(limit),
        status: status || null
      });
      
      return c.json({
        success: true,
        ...result,
        message: 'Bookings retrieved successfully'
      });

    } catch (error) {
      logger.error('Error fetching all bookings:', error);
      return c.json({
        success: false,
        message: 'Failed to fetch bookings'
      }, 500);
    }
  }

  async approveBooking(c) {
    try {
      const bookingId = c.req.param('bookingId');
      const { remarks } = await c.req.json();
      const admin = c.get('admin');

      if (!bookingId) {
        return c.json({
          success: false,
          message: 'Booking ID is required'
        }, 400);
      }

      logger.info('Admin approving booking:', { bookingId, admin: admin.username });

      const result = await bookingService.updateBookingStatus(bookingId, 'approved', remarks);
      
      return c.json(result);

    } catch (error) {
      logger.error('Error approving booking:', error);
      return c.json({
        success: false,
        message: 'Failed to approve booking'
      }, 500);
    }
  }

  async rejectBooking(c) {
    try {
      const bookingId = c.req.param('bookingId');
      const { remarks } = await c.req.json();
      const admin = c.get('admin');

      if (!bookingId) {
        return c.json({
          success: false,
          message: 'Booking ID is required'
        }, 400);
      }

      logger.info('Admin rejecting booking:', { bookingId, admin: admin.username });

      const result = await bookingService.updateBookingStatus(bookingId, 'rejected', remarks);
      
      return c.json(result);

    } catch (error) {
      logger.error('Error rejecting booking:', error);
      return c.json({
        success: false,
        message: 'Failed to reject booking'
      }, 500);
    }
  }
}

export default new AdminController();