// src/services/bookingService.js
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import logger from '../utils/logger.js';

// Import modular functionality
import BookingCreate from './booking/bookingCreate.js';
import BookingRead from './booking/bookingRead.js';
import BookingUpdate from './booking/bookingUpdate.js';
import BookingDelete from './booking/bookingDelete.js';
import BookingValidation from './booking/bookingValidation.js';
import BookingAdmin from './booking/bookingAdmin.js';

// FIXED: Helper function to get today's date in YYYY-MM-DD format without timezone issues
const getTodayInLocalTimezone = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// FIXED: Helper function to get current time in HH:MM format
const getCurrentTimeInLocalTimezone = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

class BookingService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }
    
    // Regular client for user operations
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Admin client for admin operations
    this.adminClient = supabaseAdmin;

    // Initialize modular services
    this.createService = new BookingCreate(this.supabase, this.adminClient);
    this.readService = new BookingRead(this.supabase, this.adminClient);
    this.updateService = new BookingUpdate(this.supabase, this.adminClient);
    this.deleteService = new BookingDelete(this.supabase, this.adminClient);
    this.validationService = new BookingValidation(this.supabase, this.adminClient);
    this.adminService = new BookingAdmin(this.supabase, this.adminClient);
  }

  // Delegate methods to appropriate services
  createBooking = (bookingData) => this.createService.createBooking(bookingData);
  getBookingsByRoom = (roomId, date) => this.readService.getBookingsByRoom(roomId, date);
  getUserBookings = (sessionId) => this.readService.getUserBookings(sessionId);
  cancelBooking = (bookingId, sessionId, isAdmin) => this.deleteService.cancelBooking(bookingId, sessionId, isAdmin);
  editBooking = (bookingId, sessionId, updates, isAdmin) => this.updateService.editBooking(bookingId, sessionId, updates, isAdmin);
  getAllBookings = (filters) => this.adminService.getAllBookings(filters);
  validateRoom = (roomId) => this.validationService.validateRoom(roomId);
  checkBookingConflicts = (roomId, date, startTime, endTime) => this.validationService.checkBookingConflicts(roomId, date, startTime, endTime);
  getAvailableSlots = (roomId, date) => this.readService.getAvailableSlots(roomId, date);
  getRoomInfo = (roomId) => this.readService.getRoomInfo(roomId);
  getPendingBookings = (page, limit) => this.adminService.getPendingBookings(page, limit);
  updateBookingStatus = (bookingId, status, remarks) => this.adminService.updateBookingStatus(bookingId, status, remarks);

  // FIXED: Get all bookings that users should see with better error handling and consistent date handling
  async getAllUserVisibleBookings(sessionId) {
    try {
      logger.info('Getting ALL bookings for user:', { sessionId });

      // Increase timeout to 30 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout after 30 seconds')), 30000);
      });

      // Get ALL bookings regardless of status
      const queryPromise = () => this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name
          )
        `)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      let retries = 3;
      let lastError;
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          logger.info(`Query attempt ${attempt} for user ${sessionId}`);
          
          const { data: allBookings, error } = await Promise.race([queryPromise(), timeoutPromise]);

          if (error) {
            throw error;
          }

          // Success - process the data
          logger.info('=== DEBUG: All Bookings Found ===', {
            totalBookings: allBookings?.length || 0,
            statusBreakdown: allBookings?.reduce((acc, booking) => {
              acc[booking.status] = (acc[booking.status] || 0) + 1;
              return acc;
            }, {}),
            sampleBookings: allBookings?.slice(0, 3).map(b => ({
              id: b.id,
              date: b.date,
              purpose: b.purpose,
              status: b.status
            }))
          });

          // FIXED: Use local timezone date comparison instead of ISO string
          const today = getTodayInLocalTimezone();
          const now = getCurrentTimeInLocalTimezone();
          
          logger.info('Date comparison using:', { today, now });
          
          const upcoming = allBookings?.filter(booking => {
            const endDate = booking.is_multi_day ? booking.end_date : booking.date;
            const isUpcoming = endDate > today || (booking.date === today && (!booking.start_time || booking.start_time > now));
            
            // Debug logging for date comparisons
            if (booking.date >= today) {
              logger.debug('Booking date comparison:', {
                bookingId: booking.id,
                bookingDate: booking.date,
                endDate: endDate,
                today: today,
                isUpcoming: isUpcoming,
                purpose: booking.purpose
              });
            }
            
            return isUpcoming;
          }) || [];
          
          const past = allBookings?.filter(booking => {
            const endDate = booking.is_multi_day ? booking.end_date : booking.date;
            return endDate < today || (booking.date === today && (booking.start_time && booking.start_time <= now));
          }) || [];

          logger.info(`Retrieved ${allBookings?.length || 0} total bookings for user ${sessionId}`, {
            upcoming: upcoming.length,
            past: past.length,
            todaysDate: today
          });

          return {
            success: true,
            data: { 
              all: allBookings || [], 
              upcoming, 
              past,
              stats: {
                total: allBookings?.length || 0,
                byStatus: allBookings?.reduce((acc, booking) => {
                  acc[booking.status] = (acc[booking.status] || 0) + 1;
                  return acc;
                }, {})
              }
            },
            message: 'All bookings retrieved successfully'
          };

        } catch (error) {
          lastError = error;
          logger.warn(`Query attempt ${attempt} failed:`, {
            error: error.message,
            attempt: attempt,
            sessionId: sessionId
          });
          
          if (attempt < retries) {
            // Wait before retrying (exponential backoff)
            const waitTime = 1000 * attempt; // 1s, 2s, 3s
            logger.info(`Waiting ${waitTime}ms before retry ${attempt + 1}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
      }

      // All retries failed
      logger.error('All query attempts failed for user:', {
        sessionId: sessionId,
        finalError: lastError.message
      });
      
      throw lastError;

    } catch (error) {
      logger.error('Error in getAllUserVisibleBookings after retries:', {
        error: error.message,
        stack: error.stack,
        sessionId: sessionId
      });
      
      if (error.message.includes('timeout')) {
        return {
          success: false,
          data: { all: [], upcoming: [], past: [] },
          message: 'Database is temporarily busy. Please try again in a moment.'
        };
      } else if (error.message.includes('fetch failed') || error.message.includes('network')) {
        return {
          success: false,
          data: { all: [], upcoming: [], past: [] },
          message: 'Network connection issue. Please check your internet connection.'
        };
      } else if (error.message.includes('JWT')) {
        return {
          success: false,
          data: { all: [], upcoming: [], past: [] },
          message: 'Authentication error. Please log in again.'
        };
      } else {
        return {
          success: false,
          data: { all: [], upcoming: [], past: [] },
          message: 'Temporary database issue. Please try again.'
        };
      }
    }
  }

  // Add this method to your BookingService class
  async checkDatabaseHealth() {
    try {
      const { data, error } = await this.supabase
        .from('meeting_bookings')
        .select('id')
        .limit(1)
        .single();
      
      return { 
        healthy: !error,
        error: error ? error.message : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        healthy: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Test database connection
  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('meeting_bookings')
        .select('id')
        .limit(1);
      
      if (error) {
        logger.error('Database connection test failed:', error);
        return { connected: false, error: error.message };
      }
      
      return { connected: true };
    } catch (error) {
      logger.error('Database connection test error:', error);
      return { connected: false, error: error.message };
    }
  }
}

// Export the instance directly for your controller
export default new BookingService();