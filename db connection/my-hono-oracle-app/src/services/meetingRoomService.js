// src/services/meetingRoomService.js
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

class MeetingRoomService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get all meeting rooms from Supabase
   * @returns {Object} Result with meeting rooms data
   */
  async getAllRooms() {
    try {
      logger.info('Fetching all meeting rooms from Supabase');
      
      // Simple query matching your exact table structure
      const { data, error } = await this.supabase
        .from('meeting_rooms')
        .select('id, room_name')
        .order('id');

      if (error) {
        logger.error('Supabase error fetching rooms:', error);
        return {
          success: false,
          data: [],
          message: `Supabase error: ${error.message}`,
          error: error
        };
      }

      logger.info(`Successfully fetched ${data?.length || 0} meeting rooms`, { data });
      
      return {
        success: true,
        data: data || [],
        message: 'Meeting rooms retrieved successfully',
        count: data?.length || 0
      };
    } catch (error) {
      logger.error('Error fetching meeting rooms:', {
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        data: [],
        message: `Failed to fetch meeting rooms: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get room availability for a specific date
   * @param {string} roomId - The room ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object} Result with availability data
   */
  async getRoomAvailability(roomId, date) {
    try {
      logger.info('Fetching room availability:', { roomId, date });
      
      // Validate date format
      if (!this.isValidDate(date)) {
        return {
          success: false,
          data: null,
          message: 'Invalid date format. Use YYYY-MM-DD'
        };
      }

      // First check if room exists (flexible column selection)
      const { data: room, error: roomError } = await this.supabase
        .from('meeting_rooms')
        .select('*') // Select all columns to be flexible
        .eq('id', roomId)
        .single();

      if (roomError || !room) {
        logger.warn('Room not found:', { roomId, error: roomError });
        return {
          success: false,
          data: null,
          message: 'Meeting room not found'
        };
      }

      // Get bookings for the specified date
      const startDate = `${date}T00:00:00Z`;
      const endDate = `${date}T23:59:59Z`;
      
      const { data: bookings, error: bookingsError } = await this.supabase
        .from('room_bookings')
        .select(`
          id,
          start_time,
          end_time,
          purpose,
          status,
          booked_by
        `)
        .eq('room_id', roomId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .in('status', ['confirmed', 'pending'])
        .order('start_time');

      if (bookingsError) {
        logger.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      logger.info(`Found ${bookings?.length || 0} bookings for room ${roomId} on ${date}`);

      return {
        success: true,
        data: {
          room,
          date,
          bookings: bookings || [],
          availableSlots: this.calculateAvailableSlots(bookings || [], date)
        },
        message: 'Room availability retrieved successfully'
      };
    } catch (error) {
      logger.error('Error fetching room availability:', {
        roomId,
        date,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        data: null,
        message: 'Failed to fetch room availability'
      };
    }
  }

  /**
   * Calculate available time slots based on existing bookings
   * @param {Array} bookings - Array of existing bookings
   * @param {string} date - Date string
   * @returns {Array} Array of available time slots
   */
  calculateAvailableSlots(bookings, date) {
    try {
      // Define working hours (9 AM to 6 PM)
      const workingHours = {
        start: 9,
        end: 18
      };

      const availableSlots = [];
      const bookedSlots = bookings.map(booking => ({
        start: new Date(booking.start_time).getHours(),
        end: new Date(booking.end_time).getHours()
      }));

      // Generate hourly slots
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        const isBooked = bookedSlots.some(slot => 
          hour >= slot.start && hour < slot.end
        );

        if (!isBooked) {
          availableSlots.push({
            start_time: `${hour.toString().padStart(2, '0')}:00`,
            end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
            available: true
          });
        }
      }

      return availableSlots;
    } catch (error) {
      logger.error('Error calculating available slots:', error);
      return [];
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param {string} dateString - Date string to validate
   * @returns {boolean} True if valid
   */
  isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Book a meeting room (for future implementation)
   * @param {Object} bookingData - Booking details
   * @returns {Object} Result of booking operation
   */
  async bookRoom(bookingData) {
    // Implementation for booking rooms
    // This is a placeholder for future functionality
    try {
      logger.info('Booking room:', bookingData);
      
      const { data, error } = await this.supabase
        .from('room_bookings')
        .insert([bookingData])
        .select();

      if (error) {
        logger.error('Error booking room:', error);
        throw error;
      }

      return {
        success: true,
        data: data[0],
        message: 'Room booked successfully'
      };
    } catch (error) {
      logger.error('Error booking room:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to book room'
      };
    }
  }
}

export default new MeetingRoomService();