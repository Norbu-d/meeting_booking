// src/services/booking/bookingAdmin.js
import logger from '../../utils/logger.js';

class BookingAdmin {
  constructor(supabase, adminClient) {
    this.supabase = supabase;
    this.adminClient = adminClient;
  }

  async getAllBookings(filters = {}) {
    try {
      let query = this.adminClient
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name
          )
        `, { count: 'exact' });

      if (filters.date) query = query.eq('date', filters.date);
      if (filters.room_id) query = query.eq('room_id', filters.room_id);
      if (filters.user_id) query = query.eq('session_id', filters.user_id);
      if (filters.status) query = query.eq('status', filters.status);

      const { data, error, count } = await query
        .order('date', { ascending: false })
        .order('start_time', { ascending: true });

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
        message: 'All bookings retrieved successfully',
        count: count || 0
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

  async getPendingBookings(page = 1, limit = 10) {
    try {
      const startIndex = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_rooms (
            id,
            room_name
          )
        `, { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(startIndex, startIndex + limit - 1);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };

    } catch (error) {
      logger.error('Error fetching pending bookings:', error);
      return {
        success: false,
        message: 'Failed to fetch pending bookings'
      };
    }
  }

  async updateBookingStatus(bookingId, status, remarks = null) {
    try {
      const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
      
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: 'Invalid status. Must be: pending, approved, rejected, or cancelled'
        };
      }

      const updateData = { status: status };
      if (remarks) updateData.admin_remarks = remarks;

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

      if (error) throw error;

      return {
        success: true,
        message: `Booking ${status} successfully`,
        data: data
      };

    } catch (error) {
      logger.error('Error updating booking status:', error);
      return {
        success: false,
        message: 'Failed to update booking status'
      };
    }
  }
}

export default BookingAdmin;