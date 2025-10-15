// src/services/booking/bookingDelete.js
import logger from '../../utils/logger.js';

class BookingDelete {
  constructor(supabase, adminClient) {
    this.supabase = supabase;
    this.adminClient = adminClient;
  }

  async cancelBooking(bookingId, sessionId, isAdmin = false) {
    try {
      const { data: existingBooking, error: fetchError } = await this.supabase
        .from('meeting_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError || !existingBooking) {
        return { success: false, message: 'Booking not found' };
      }

      if (!isAdmin && existingBooking.session_id !== parseInt(sessionId)) {
        return { success: false, message: 'You are not authorized to cancel this booking' };
      }

      if (!isAdmin) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().substring(0, 5);
        
        if (existingBooking.date < today || 
            (existingBooking.date === today && existingBooking.start_time <= now)) {
          return { success: false, message: 'Cannot cancel past or ongoing bookings' };
        }
      }

      // ADMIN: Change status to 'rejected' for pending bookings
      if (isAdmin && existingBooking.status === 'pending') {
        const updateData = {
          status: 'rejected',
          admin_remarks: 'Booking rejected by admin'
        };

        const { data, error } = await this.supabase
          .from('meeting_bookings')
          .update(updateData)
          .eq('id', bookingId)
          .select()
          .single();

        if (error) {
          logger.error('Error rejecting booking:', error);
          return {
            success: false,
            message: 'Failed to reject booking',
            error: error.message
          };
        }

        return {
          success: true,
          message: 'Booking rejected successfully',
          data: {
            id: data.id,
            status: data.status,
            rejected_at: new Date().toISOString(),
            rejected_by: sessionId
          }
        };
      }

      // Regular cancellation (delete)
      let deleteQuery = this.supabase
        .from('meeting_bookings')
        .delete()
        .eq('id', bookingId);

      if (!isAdmin) {
        deleteQuery = deleteQuery.eq('session_id', sessionId);
      }

      const { data, error } = await deleteQuery.select().single();

      if (error) {
        logger.error('Error canceling booking:', error);
        return {
          success: false,
          message: 'Failed to cancel booking',
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          id: data.id,
          cancelled_at: new Date().toISOString(),
          cancelled_by: sessionId,
          is_admin_action: isAdmin
        }
      };

    } catch (error) {
      logger.error('Error in cancelBooking:', error);
      return {
        success: false,
        message: 'Internal server error while canceling booking'
      };
    }
  }
}

export default BookingDelete;