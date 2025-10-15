// src/services/booking/bookingUpdate.js
import logger from '../../utils/logger.js';

class BookingUpdate {
  constructor(supabase, adminClient) {
    this.supabase = supabase;
    this.adminClient = adminClient;
  }

  async editBooking(bookingId, sessionId, updates, isAdmin = false) {
    try {
      logger.info('Editing booking:', { bookingId, sessionId, isAdmin, updates });

      // First check if booking exists
      const { data: existingBooking, error: fetchError } = await this.supabase
        .from('meeting_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError || !existingBooking) {
        logger.warn('Booking not found:', { bookingId });
        return {
          success: false,
          message: 'Booking not found'
        };
      }

      // Check authorization: admin can edit any booking, users can only edit their own
      if (!isAdmin && existingBooking.session_id !== parseInt(sessionId)) {
        logger.warn('Unauthorized edit attempt:', { bookingId, sessionId, bookingOwner: existingBooking.session_id });
        return {
          success: false,
          message: 'You are not authorized to edit this booking'
        };
      }

      // For regular users, check if booking is in the future
      if (!isAdmin) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().substring(0, 5);
        
        if (existingBooking.date < today || 
            (existingBooking.date === today && existingBooking.start_time <= now)) {
          return {
            success: false,
            message: 'Cannot edit past or ongoing bookings'
          };
        }
      }

      // Build update object - only include fields that are actually being changed
      const updateData = {};
      let hasChanges = false;

      // Add valid update fields only if they're different from current values
      if (updates.room_id !== undefined && parseInt(updates.room_id) !== existingBooking.room_id) {
        updateData.room_id = parseInt(updates.room_id);
        hasChanges = true;
      }
      if (updates.date !== undefined && updates.date !== existingBooking.date) {
        updateData.date = updates.date;
        hasChanges = true;
      }
      if (updates.start_time !== undefined && updates.start_time !== existingBooking.start_time) {
        updateData.start_time = updates.start_time;
        hasChanges = true;
      }
      if (updates.end_time !== undefined && updates.end_time !== existingBooking.end_time) {
        updateData.end_time = updates.end_time;
        hasChanges = true;
      }
      if (updates.purpose !== undefined && updates.purpose !== existingBooking.purpose) {
        updateData.purpose = updates.purpose;
        hasChanges = true;
      }
      
      // ADMIN-ONLY: Status updates
      if (isAdmin && updates.status !== undefined && updates.status !== existingBooking.status) {
        updateData.status = updates.status;
        hasChanges = true;
        
        // Add admin remarks if provided
        if (updates.admin_remarks !== undefined) {
          updateData.admin_remarks = updates.admin_remarks;
          hasChanges = true;
        }
        
        logger.info('Admin status update will be attempted:', { 
          currentStatus: existingBooking.status,
          newStatus: updates.status,
          adminRemarks: updates.admin_remarks 
        });
      }

      // If no changes detected, return success without updating
      if (!hasChanges) {
        logger.info('No changes detected for booking:', { bookingId });
        
        // Get room info for response
        const roomInfo = await this.getRoomInfo(existingBooking.room_id);
        
        return {
          success: true,
          message: 'No changes were made to the booking',
          data: {
            ...existingBooking,
            meeting_rooms: roomInfo
          }
        };
      }

      // If changing room, date, or time, check for conflicts (only for approved bookings)
      if ((updateData.room_id || updateData.date || updateData.start_time || updateData.end_time) && 
          (existingBooking.status === 'approved' || updateData.status === 'approved')) {
        
        const conflictCheckRoom = updateData.room_id || existingBooking.room_id;
        const conflictCheckDate = updateData.date || existingBooking.date;
        const conflictCheckStartTime = updateData.start_time || existingBooking.start_time;
        const conflictCheckEndTime = updateData.end_time || existingBooking.end_time;

        // Check for conflicts with approved bookings (exclude current booking)
        const { data: conflicts, error: conflictError } = await this.supabase
          .from('meeting_bookings')
          .select('id, start_time, end_time, status')
          .eq('room_id', conflictCheckRoom)
          .eq('date', conflictCheckDate)
          .eq('status', 'approved')
          .neq('id', bookingId)
          .or(`and(start_time.lt.${conflictCheckEndTime},end_time.gt.${conflictCheckStartTime})`);

        if (conflictError) {
          logger.error('Error checking conflicts:', conflictError);
          return {
            success: false,
            message: 'Error checking for booking conflicts'
          };
        }

        if (conflicts && conflicts.length > 0) {
          return {
            success: false,
            message: 'Time slot conflict with another approved booking',
            conflicts: true
          };
        }
      }

      // Update the booking
      const { data, error } = await this.supabase
        .from('meeting_bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select(`
          *,
          meeting_rooms (
            id,
            room_name
          )
        `)
        .single();

      if (error) {
        logger.error('Error updating booking:', error);
        return {
          success: false,
          message: 'Failed to update booking',
          error: error.message
        };
      }

      const action = isAdmin ? 'Admin edited' : 'User edited';
      logger.info(`${action} booking successfully:`, { bookingId, sessionId, changes: Object.keys(updateData) });

      return {
        success: true,
        message: 'Booking updated successfully',
        data: data,
        changes: Object.keys(updateData)
      };

    } catch (error) {
      logger.error('Error in editBooking:', error);
      return {
        success: false,
        message: 'Internal server error while editing booking'
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
}

export default BookingUpdate;