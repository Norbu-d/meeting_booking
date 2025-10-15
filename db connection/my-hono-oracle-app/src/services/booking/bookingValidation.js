import logger from '../../utils/logger.js';

class BookingValidation {
  constructor(supabase, adminClient) {
    this.supabase = supabase;
    this.adminClient = adminClient;
  }

  // Helper function to format date consistently (same as in BookingCreate)
  formatDateForStorage(dateString) {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If it's a Date object or other format, convert it
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateString}`);
    }
    
    // Format as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  // Helper function to create date without timezone issues
  createDateWithoutTimezone(dateString) {
    // Parse date string as local date to avoid timezone shifts
    const formattedDate = this.formatDateForStorage(dateString);
    return new Date(formattedDate + 'T00:00:00'); // Force local timezone
  }

  // Helper function to compare dates without timezone issues
  compareDates(date1String, date2String) {
    const date1 = this.formatDateForStorage(date1String);
    const date2 = this.formatDateForStorage(date2String);
    
    if (date1 < date2) return -1;
    if (date1 > date2) return 1;
    return 0;
  }

  // Helper function to check if date ranges overlap
  datesOverlap(start1, end1, start2, end2) {
    const formattedStart1 = this.formatDateForStorage(start1);
    const formattedEnd1 = this.formatDateForStorage(end1);
    const formattedStart2 = this.formatDateForStorage(start2);
    const formattedEnd2 = this.formatDateForStorage(end2);
    
    return formattedStart1 <= formattedEnd2 && formattedEnd1 >= formattedStart2;
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

  async validateRoom(roomId) {
    try {
      const { data, error } = await this.supabase
        .from('meeting_rooms')
        .select('id, room_name')
        .eq('id', roomId)
        .single();

      if (error || !data) {
        return {
          success: false,
          message: 'Meeting room not found'
        };
      }

      return {
        success: true,
        room: data
      };

    } catch (error) {
      return {
        success: false,
        message: 'Error validating room'
      };
    }
  }

  async checkBookingConflicts(roomId, date, startTime, endTime, isMultiDay = false, endDate = null, allDay = false) {
    try {
      // Format dates consistently before using them
      const formattedDate = this.formatDateForStorage(date);
      const formattedEndDate = endDate ? this.formatDateForStorage(endDate) : null;

      logger.info('Checking booking conflicts with formatted dates:', {
        roomId, 
        originalDate: date, 
        formattedDate,
        originalEndDate: endDate,
        formattedEndDate,
        startTime, 
        endTime, 
        isMultiDay, 
        allDay
      });

      // Get all APPROVED bookings for THIS SPECIFIC ROOM that might conflict
      let query = this.supabase
        .from('meeting_bookings')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'approved')
        .neq('status', 'cancelled')
        .neq('status', 'rejected');

      // For multi-day bookings: check bookings that overlap with our date range
      if (isMultiDay && formattedEndDate) {
        query = query.or(`and(date.lte.${formattedEndDate},end_date.gte.${formattedDate})`);
      } else {
        // For single-day bookings: check bookings that include our date
        query = query.or(`date.eq.${formattedDate},and(is_multi_day.eq.true,date.lte.${formattedDate},end_date.gte.${formattedDate})`);
      }

      const { data: existingBookings, error } = await query;

      if (error) {
        logger.error('Error checking conflicts:', error);
        return {
          success: false,
          message: 'Error checking booking availability'
        };
      }

      logger.info(`Found ${existingBookings?.length || 0} approved bookings for room ${roomId} to check against`);

      if (!existingBookings || existingBookings.length === 0) {
        return { success: true, conflicts: [] };
      }

      const conflicts = [];
      const newBookingStart = startTime ? this.timeToMinutes(startTime) : 0;
      const newBookingEnd = endTime ? this.timeToMinutes(endTime) : 24 * 60;

      for (const existingBooking of existingBookings) {
        // Skip if not approved (shouldn't happen due to query, but safe)
        if (existingBooking.status !== 'approved') continue;

        // Check date overlap using consistent date formatting
        const existingStartDate = existingBooking.date;
        const existingEndDate = existingBooking.is_multi_day ? 
          existingBooking.end_date : existingStartDate;
        
        const newStartDate = formattedDate;
        const newEndDate = isMultiDay && formattedEndDate ? formattedEndDate : newStartDate;

        // Use string comparison for dates (YYYY-MM-DD format)
        const datesOverlap = this.datesOverlap(newStartDate, newEndDate, existingStartDate, existingEndDate);
        
        if (!datesOverlap) {
          continue; // No date overlap, no conflict
        }

        // TIME CONFLICT LOGIC (only if dates overlap)
        if (allDay && existingBooking.all_day) {
          conflicts.push({
            type: 'all_day_conflict',
            existing_booking: existingBooking,
            message: `Room ${roomId} already booked for all day on ${existingBooking.date}${existingBooking.is_multi_day ? ` to ${existingBooking.end_date}` : ''}`,
            conflict_type: 'all_day'
          });
        } else if (allDay && !existingBooking.all_day) {
          // New booking is all-day, existing has specific times
          conflicts.push({
            type: 'all_day_conflict',
            existing_booking: existingBooking,
            message: `Room ${roomId} already has timed bookings on overlapping dates`,
            conflict_type: 'all_day_override'
          });
        } else if (!allDay && existingBooking.all_day) {
          // New booking has specific times, existing is all-day
          conflicts.push({
            type: 'time_conflict',
            existing_booking: existingBooking,
            message: `Room ${roomId} is fully booked for all day on overlapping dates`,
            conflict_type: 'blocked_by_all_day'
          });
        } else {
          // Both have specific times - check time overlap
          const existingStart = this.timeToMinutes(existingBooking.start_time);
          const existingEnd = this.timeToMinutes(existingBooking.end_time);

          if (this.doTimeRangesOverlap(newBookingStart, newBookingEnd, existingStart, existingEnd)) {
            conflicts.push({
              type: 'time_conflict',
              existing_booking: existingBooking,
              message: `Time slot ${existingBooking.start_time}-${existingBooking.end_time} conflicts in room ${roomId}`,
              conflict_type: 'time_slot'
            });
          }
        }
      }

      if (conflicts.length > 0) {
        logger.warn('Booking conflicts found:', conflicts);
        return {
          success: false,
          message: `Room ${roomId} not available for the requested time`,
          conflicts: conflicts,
          room_id: roomId
        };
      }

      logger.info('No conflicts found for room ' + roomId);
      return { success: true, conflicts: [] };

    } catch (error) {
      logger.error('Error in checkBookingConflicts:', error);
      return {
        success: false,
        message: 'Error checking booking availability'
      };
    }
  }

  validateBookingData(bookingData) {
    const { room_id, date, start_time, end_time, is_multi_day, end_date, all_day } = bookingData;

    // Basic required fields
    if (!room_id || !date) {
      return {
        success: false,
        message: 'Missing required fields: room_id and date are required'
      };
    }

    // For multi-day bookings, require end_date
    if (is_multi_day && !end_date) {
      return {
        success: false,
        message: 'Missing required field: end_date is required for multi-day bookings'
      };
    }

    // Validate end_date is after start date for multi-day using consistent date comparison
    if (is_multi_day && end_date && this.compareDates(end_date, date) <= 0) {
      return {
        success: false,
        message: 'End date must be after start date for multi-day bookings'
      };
    }

    // For non-all-day bookings, require start_time and end_time
    if (!all_day && (!start_time || !end_time)) {
      return {
        success: false,
        message: 'Missing required fields: start_time and end_time are required for non-all-day bookings'
      };
    }

    // Validate time format if provided
    if (start_time && !this.isValidTime(start_time)) {
      return {
        success: false,
        message: 'Invalid start_time format. Use HH:MM format (e.g., 09:00)'
      };
    }

    if (end_time && !this.isValidTime(end_time)) {
      return {
        success: false,
        message: 'Invalid end_time format. Use HH:MM format (e.g., 17:00)'
      };
    }

    // Validate end time is after start time for time-specific bookings
    if (!all_day && start_time && end_time && !this.isEndTimeAfterStartTime(start_time, end_time)) {
      return {
        success: false,
        message: 'End time must be after start time'
      };
    }

    return {
      success: true,
      message: 'Booking data is valid'
    };
  }

  isValidTime(time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  isEndTimeAfterStartTime(startTime, endTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    if (endHours > startHours) return true;
    if (endHours === startHours && endMinutes > startMinutes) return true;
    return false;
  }
}

export default BookingValidation;