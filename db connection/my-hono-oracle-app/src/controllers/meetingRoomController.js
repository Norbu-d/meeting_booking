// src/controllers/meetingRoomController.js
import meetingRoomService from '../services/meetingRoomService.js'; // FIXED: Import correct service
import logger from '../utils/logger.js';

class MeetingRoomController {
  /**
   * Get all meeting rooms
   * @param {Object} c - Hono context
   * @returns {Response} JSON response with meeting rooms
   */
  async getAllRooms(c) {
    try {
      // Get user info from session (set by sessionMiddleware)
      const session = c.get('session');
      const user = c.get('user');
      
      logger.info('Getting all rooms for user:', { 
        userId: user?.employee_id || user?.user_id,
        loginId: session?.login_id,
        sessionExists: !!session,
        userExists: !!user
      });

      // Add debugging for Supabase connection
      logger.info('Supabase config check:', {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
        supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 30) + '...'
      });

      const result = await meetingRoomService.getAllRooms();
      
      logger.info('Meeting room service result:', {
        success: result.success,
        dataLength: result.data?.length,
        message: result.message,
        hasError: !!result.error
      });
      
      if (result.success) {
        logger.info(`Successfully retrieved ${result.data.length} meeting rooms`);
      } else {
        logger.warn('Failed to retrieve meeting rooms:', result);
      }
      
      return c.json(result);
    } catch (error) {
      logger.error('Failed to get meeting rooms:', {
        error: error.message,
        stack: error.stack
      });
      
      return c.json({
        success: false,
        data: [],
        message: 'Failed to get meeting rooms',
        error: error.message
      }, 500);
    }
  }

  /**
   * Get room availability for a specific date
   * @param {Object} c - Hono context
   * @returns {Response} JSON response with room availability
   */
  async getRoomAvailability(c) {
    try {
      const roomId = c.req.param('roomId');
      const { date } = c.req.query();
      
      // Get user info from session
      const session = c.get('session');
      const user = c.get('user');
      
      logger.info('Getting room availability:', { 
        roomId, 
        date,
        userId: user?.employee_id || user?.user_id,
        loginId: session?.login_id 
      });
      
      // Validate required parameters
      if (!roomId) {
        return c.json({
          success: false,
          data: null,
          message: 'Room ID is required'
        }, 400);
      }
      
      if (!date) {
        return c.json({
          success: false,
          data: null,
          message: 'Date parameter is required'
        }, 400);
      }
      
      const result = await meetingRoomService.getRoomAvailability(roomId, date);
      
      if (result.success) {
        logger.info(`Successfully retrieved availability for room ${roomId} on ${date}`);
      }
      
      return c.json(result);
    } catch (error) {
      logger.error('Failed to get room availability:', {
        error: error.message,
        stack: error.stack,
        roomId: c.req.param('roomId'),
        date: c.req.query('date')
      });
      
      return c.json({
        success: false,
        data: null,
        message: 'Failed to get room availability'
      }, 500);
    }
  }

  /**
   * Book a meeting room (for future implementation)
   * @param {Object} c - Hono context
   * @returns {Response} JSON response with booking result
   */
  async bookRoom(c) {
    try {
      const session = c.get('session');
      const user = c.get('user');
      const bookingData = await c.req.json();
      
      logger.info('Booking room request:', { 
        bookingData,
        userId: user?.employee_id || user?.user_id,
        loginId: session?.login_id 
      });

      // Add user info to booking data
      const enrichedBookingData = {
        ...bookingData,
        booked_by: session?.login_id || user?.employee_id,
        created_at: new Date().toISOString(),
        status: 'pending' // Default status
      };

      const result = await meetingRoomService.bookRoom(enrichedBookingData);
      return c.json(result);
    } catch (error) {
      logger.error('Failed to book room:', {
        error: error.message,
        stack: error.stack
      });
      
      return c.json({
        success: false,
        data: null,
        message: 'Failed to book room'
      }, 500);
    }
  }
}

export default new MeetingRoomController();