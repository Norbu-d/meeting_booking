import logger from '../../utils/logger.js';

class BookingRead {
  constructor(supabase, adminClient) {
    this.supabase = supabase;
    this.adminClient = adminClient;
  }

  // Helper function to convert time string to minutes
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper function to check if time ranges overlap
  doTimeRangesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
  }

  async getBookingsByRoom(roomId, date = null) {
    try {
      let query = this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name
          )
        `)
        .eq('room_id', roomId);

      if (date) {
        // FIXED: Better date filtering for multi-day bookings
        query = query.or(`date.eq.${date},and(is_multi_day.eq.true,date.lte.${date},end_date.gte.${date})`);
      }

      const { data, error } = await query.order('date', { ascending: true })
                                       .order('start_time', { ascending: true });

      if (error) {
        logger.error('Error fetching room bookings:', error);
        return {
          success: false,
          data: [],
          message: 'Failed to fetch bookings'
        };
      }

      return {
        success: true,
        data: data || [],
        message: 'Bookings retrieved successfully'
      };

    } catch (error) {
      logger.error('Error in getBookingsByRoom:', error);
      return {
        success: false,
        data: [],
        message: 'Internal server error while fetching bookings'
      };
    }
  }

  async getUserBookings(sessionId) {
    try {
      const { data, error } = await this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name
          )
        `)
        .eq('session_id', sessionId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        logger.error('Error fetching user bookings:', error);
        return {
          success: false,
          data: [],
          message: 'Failed to fetch your bookings'
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().substring(0, 5);
      
      const upcoming = data?.filter(booking => {
        const endDate = booking.is_multi_day ? booking.end_date : booking.date;
        return endDate > today || (booking.date === today && (!booking.start_time || booking.start_time > now));
      }) || [];
      
      const past = data?.filter(booking => {
        const endDate = booking.is_multi_day ? booking.end_date : booking.date;
        return endDate < today || (booking.date === today && (booking.start_time && booking.start_time <= now));
      }) || [];

      return {
        success: true,
        data: { all: data || [], upcoming, past },
        message: 'Your bookings retrieved successfully'
      };

    } catch (error) {
      logger.error('Error in getUserBookings:', error);
      return {
        success: false,
        data: [],
        message: 'Internal server error while fetching your bookings'
      };
    }
  }

  async getAvailableSlots(roomId, date) {
    try {
      const bookings = await this.getBookingsByRoom(roomId, date);
      if (!bookings.success) return bookings;

      // FIXED: Better filtering for multi-day bookings
      const approvedBookings = bookings.data.filter(booking => 
        booking.status === 'approved' && 
        // Check if the booking applies to this specific date
        (booking.date === date || 
         (booking.is_multi_day && booking.date <= date && booking.end_date >= date))
      );

      const workingHours = { start: 9, end: 18 };
      const availableSlots = [];
      
      // FIXED: Check for all-day conflicts including multi-day
      const hasAllDayConflict = approvedBookings.some(booking => 
        booking.all_day && 
        booking.status === 'approved' &&
        (booking.date === date || 
         (booking.is_multi_day && booking.date <= date && booking.end_date >= date))
      );
      
      if (hasAllDayConflict) {
        // Entire day is blocked by an approved all-day booking
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
          const slotStart = `${hour.toString().padStart(2, '0')}:00`;
          const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
          
          availableSlots.push({
            start_time: slotStart,
            end_time: slotEnd,
            available: false,
            reason: 'All-day booking approved'
          });
        }
      } else {
        // Check time-specific conflicts with approved bookings only
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
          const slotStart = `${hour.toString().padStart(2, '0')}:00`;
          const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
          
          const slotStartMinutes = this.timeToMinutes(slotStart);
          const slotEndMinutes = this.timeToMinutes(slotEnd);
          
          const hasConflict = approvedBookings.some(booking => {
            if (booking.all_day) return true;
            
            // Only check time conflict if the booking applies to this exact date
            const bookingAppliesToDate = booking.date === date || 
              (booking.is_multi_day && booking.date <= date && booking.end_date >= date);
            
            if (!bookingAppliesToDate) return false;
            
            const bookingStart = this.timeToMinutes(booking.start_time);
            const bookingEnd = this.timeToMinutes(booking.end_time);
            
            return this.doTimeRangesOverlap(slotStartMinutes, slotEndMinutes, bookingStart, bookingEnd);
          });

          availableSlots.push({
            start_time: slotStart,
            end_time: slotEnd,
            available: !hasConflict,
            reason: hasConflict ? 'Time slot already booked' : 'Available'
          });
        }
      }

      return {
        success: true,
        data: {
          date,
          roomId,
          slots: availableSlots,
          availableCount: availableSlots.filter(slot => slot.available).length,
          is_day_available: !hasAllDayConflict
        },
        message: 'Available slots retrieved successfully'
      };

    } catch (error) {
      logger.error('Error getting available slots:', error);
      return {
        success: false,
        message: 'Failed to get available slots'
      };
    }
  }

  async getRoomInfo(roomId) {
    try {
      const { data } = await this.supabase
        .from('meeting_rooms')
        .select('id, room_name')
        .eq('id', roomId)
        .single();
      
      return data;
    } catch (error) {
      logger.error('Error fetching room info:', error);
      return null;
    }
  }

  // New method to get multi-day availability
  async getMultiDayAvailability(roomId, startDate, endDate) {
    try {
      const availability = [];
      const currentDate = new Date(startDate);
      const finalEndDate = new Date(endDate);
      
      while (currentDate <= finalEndDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const slots = await this.getAvailableSlots(roomId, dateStr);
        
        availability.push({
          date: dateStr,
          is_available: slots.success && slots.data.is_day_available,
          available_slots: slots.success ? slots.data.availableCount : 0
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return {
        success: true,
        data: availability,
        message: 'Multi-day availability retrieved successfully'
      };
      
    } catch (error) {
      logger.error('Error getting multi-day availability:', error);
      return {
        success: false,
        message: 'Failed to get multi-day availability'
      };
    }
  }

  async getAllBookings(status = null, limit = null, offset = 0) {
    try {
      let query = this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name,
            location,
            capacity
          ),
          users (
            id,
            email,
            full_name
          )
        `);

      if (status) {
        query = query.eq('status', status);
      }

      query = query
        .order('created_at', { ascending: false })
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (limit) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching all bookings:', error);
        return {
          success: false,
          data: [],
          message: 'Failed to fetch bookings'
        };
      }

      return {
        success: true,
        data: data || [],
        message: 'All bookings retrieved successfully'
      };

    } catch (error) {
      logger.error('Error in getAllBookings:', error);
      return {
        success: false,
        data: [],
        message: 'Internal server error while fetching all bookings'
      };
    }
  }

  async getPendingBookings(limit = null, offset = 0) {
    try {
      let query = this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name,
            location,
            capacity
          ),
          users (
            id,
            email,
            full_name
          )
        `)
        .eq('status', 'pending');

      query = query
        .order('created_at', { ascending: true }) // Oldest pending first
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (limit) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching pending bookings:', error);
        return {
          success: false,
          data: [],
          message: 'Failed to fetch pending bookings'
        };
      }

      return {
        success: true,
        data: data || [],
        message: 'Pending bookings retrieved successfully'
      };

    } catch (error) {
      logger.error('Error in getPendingBookings:', error);
      return {
        success: false,
        data: [],
        message: 'Internal server error while fetching pending bookings'
      };
    }
  }

  async getBookingById(bookingId) {
    try {
      const { data, error } = await this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name,
            location,
            capacity
          ),
          users (
            id,
            email,
            full_name
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) {
        logger.error('Error fetching booking by ID:', error);
        return {
          success: false,
          data: null,
          message: 'Failed to fetch booking'
        };
      }

      return {
        success: true,
        data: data,
        message: 'Booking retrieved successfully'
      };

    } catch (error) {
      logger.error('Error in getBookingById:', error);
      return {
        success: false,
        data: null,
        message: 'Internal server error while fetching booking'
      };
    }
  }

  async getBookingsByStatus(status, roomId = null, userId = null) {
    try {
      let query = this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name,
            location,
            capacity
          )
        `) // Removed users table join
        .eq('status', status);

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      // If you want to filter by user, use session_id since that's what you have
      if (userId) {
        query = query.eq('session_id', userId);
      }

      const { data, error } = await query
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        logger.error('Error fetching bookings by status:', error);
        return {
          success: false,
          data: [],
          message: `Failed to fetch ${status} bookings`
        };
      }

      return {
        success: true,
        data: data || [],
        message: `${status.charAt(0).toUpperCase() + status.slice(1)} bookings retrieved successfully`
      };

    } catch (error) {
      logger.error('Error in getBookingsByStatus:', error);
      return {
        success: false,
        data: [],
        message: `Internal server error while fetching ${status} bookings`
      };
    }
  }

  // Enhanced method to get bookings with better filtering
  async getBookingsWithFilters({
    roomId = null,
    userId = null,
    status = null,
    startDate = null,
    endDate = null,
    limit = null,
    offset = 0
  }) {
    try {
      let query = this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name,
            location,
            capacity
          ),
          users (
            id,
            email,
            full_name
          )
        `);

      if (roomId) query = query.eq('room_id', roomId);
      if (userId) query = query.eq('user_id', userId);
      if (status) query = query.eq('status', status);
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      query = query
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (limit) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching bookings with filters:', error);
        return {
          success: false,
          data: [],
          message: 'Failed to fetch filtered bookings'
        };
      }

      return {
        success: true,
        data: data || [],
        message: 'Filtered bookings retrieved successfully'
      };

    } catch (error) {
      logger.error('Error in getBookingsWithFilters:', error);
      return {
        success: false,
        data: [],
        message: 'Internal server error while fetching filtered bookings'
      };
    }
  }

  // Add this method to your BookingRead class in bookingRead.js
  async getUserBookingsByStatuses(sessionId, statuses = ['pending', 'approved']) {
    try {
      const { data, error } = await this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name
          )
        `)
        .eq('session_id', sessionId)
        .in('status', statuses) // This filters for multiple statuses
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        logger.error('Error fetching user bookings by statuses:', error);
        return {
          success: false,
          data: [],
          message: 'Failed to fetch your bookings'
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().substring(0, 5);
      
      const upcoming = data?.filter(booking => {
        const endDate = booking.is_multi_day ? booking.end_date : booking.date;
        return endDate > today || (booking.date === today && (!booking.start_time || booking.start_time > now));
      }) || [];
      
      const past = data?.filter(booking => {
        const endDate = booking.is_multi_day ? booking.end_date : booking.date;
        return endDate < today || (booking.date === today && (booking.start_time && booking.start_time <= now));
      }) || [];

      return {
        success: true,
        data: { all: data || [], upcoming, past, statuses },
        message: 'Your pending and approved bookings retrieved successfully'
      };

    } catch (error) {
      logger.error('Error in getUserBookingsByStatuses:', error);
      return {
        success: false,
        data: [],
        message: 'Internal server error while fetching your bookings'
      };
    }
  }
}

export default BookingRead;