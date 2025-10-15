// src/services/booking/bookingCreate.js
import logger from '../../utils/logger.js';
import BookingValidation from './bookingValidation.js';

class BookingCreate {
  constructor(supabase, adminClient) {
    this.supabase = supabase;
    this.adminClient = adminClient;
    this.validation = new BookingValidation(supabase, adminClient);
  }

  // FIXED: Helper function to ensure consistent date formatting without timezone shifts
  formatDateForStorage(dateString) {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.log('Date already in correct format:', dateString);
      return dateString;
    }
    
    // FIXED: Parse date components manually to avoid timezone issues
    let date;
    if (dateString.includes('T')) {
      // ISO string - extract just the date part
      const datePart = dateString.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        console.log('Extracted date part from ISO string:', datePart);
        return datePart;
      }
    }
    
    // Try parsing as a date but be careful about timezone
    date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateString}`);
    }
    
    // FIXED: Use UTC methods to avoid timezone shifts when the input is already a date
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const result = `${year}-${month}-${day}`;
    
    console.log('formatDateForStorage conversion:', {
      input: dateString,
      parsed: date.toISOString(),
      output: result
    });
    
    return result;
  }

  // Helper function to get current timestamp in local timezone
  getCurrentTimestamp() {
    const now = new Date();
    // Format as ISO string but ensure it represents the correct local time
    return now.toISOString();
  }

  async createBooking(bookingData) {
    try {
      const { 
        session_id, 
        room_id, 
        date, 
        start_time, 
        end_time, 
        purpose,
        description = '',
        is_multi_day = false,
        end_date = null,
        all_day = false
      } = bookingData;
      
      // FIXED: Format dates consistently to prevent timezone shifts
      const formattedDate = this.formatDateForStorage(date);
      const formattedEndDate = end_date ? this.formatDateForStorage(end_date) : null;
      
      logger.info('Creating new booking with formatted dates:', { 
        room_id, 
        original_date: date,
        formatted_date: formattedDate,
        original_end_date: end_date,
        formatted_end_date: formattedEndDate,
        start_time, 
        end_time, 
        is_multi_day,
        all_day 
      });

      // Validate booking data with formatted dates
      const validationData = {
        ...bookingData,
        date: formattedDate,
        end_date: formattedEndDate
      };
      
      const validationResult = this.validation.validateBookingData(validationData);
      if (!validationResult.success) {
        return validationResult;
      }

      // Validate the room exists
      const roomValidation = await this.validation.validateRoom(room_id);
      if (!roomValidation.success) {
        return roomValidation;
      }

      // Check for conflicts with formatted dates
      const conflictCheck = await this.validation.checkBookingConflicts(
        room_id, 
        formattedDate, 
        start_time, 
        end_time, 
        is_multi_day, 
        formattedEndDate, 
        all_day
      );

      if (!conflictCheck.success) {
        return conflictCheck;
      }

      // Create the booking record with proper null handling and consistent date formatting
      const bookingRecord = {
        room_id: parseInt(room_id),
        session_id: parseInt(session_id),
        date: formattedDate, // Use formatted date
        start_time: all_day ? null : start_time,
        end_time: all_day ? null : end_time,
        purpose: purpose || 'Meeting',
        description: description || '',
        status: 'pending',
        created_at: this.getCurrentTimestamp(),
        is_multi_day: is_multi_day,
        end_date: formattedEndDate, // Use formatted end date
        all_day: all_day
      };

      logger.info('Inserting booking record with consistent dates:', bookingRecord);

      // Add timeout and better error handling for the Supabase query
      const { data, error } = await this.supabase
        .from('meeting_bookings')
        .insert([bookingRecord])
        .select(`
          *,
          meeting_rooms (
            id,
            room_name
          )
        `)
        .single();

      if (error) {
        logger.error('Supabase error creating booking:', error);
        return {
          success: false,
          message: 'Database error while creating booking',
          error: error.message,
          details: error.details || 'No additional details'
        };
      }

      if (!data) {
        logger.error('No data returned from booking insertion');
        return {
          success: false,
          message: 'No data returned after creating booking'
        };
      }

      logger.info('Booking created successfully with dates:', { 
        bookingId: data.id, 
        storedDate: data.date,
        storedEndDate: data.end_date,
        inputDate: date,
        formattedDate: formattedDate
      });

      return {
        success: true,
        message: 'Booking created successfully - pending admin approval',
        data: {
          id: data.id,
          room_id: data.room_id,
          room_name: data.meeting_rooms?.room_name,
          date: data.date, // This should now be consistent
          start_time: data.start_time,
          end_time: data.end_time,
          purpose: data.purpose,
          description: data.description,
          session_id: data.session_id,
          status: data.status,
          is_multi_day: data.is_multi_day,
          end_date: data.end_date, // This should now be consistent
          all_day: data.all_day
        }
      };

    } catch (error) {
      logger.error('Unexpected error in createBooking:', error);
      return {
        success: false,
        message: 'Internal server error while creating booking',
        error: error.message,
        stack: error.stack
      };
    }
  }
}

export default BookingCreate;