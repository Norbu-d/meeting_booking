// src/routes/bookings.js
import { Hono } from 'hono';
import bookingController from '../controllers/bookingController.js';
import sessionMiddleware from '../middleware/sessionMiddleware.js';
import { requireAdmin, canEditBooking } from '../middleware/adminMiddleware.js';
import { createClient } from '@supabase/supabase-js';

const bookings = new Hono();

// Initialize Supabase client for debug routes
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ===== DEBUG ROUTES (No authentication) =====
// These should come BEFORE the session middleware
bookings.get('/debug/all-data', async (c) => {
  try {
    const { data: bookings, error } = await supabase
      .from('meeting_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // Get room names for better readability
    const { data: rooms } = await supabase
      .from('meeting_rooms')
      .select('id, room_name');

    const roomMap = {};
    rooms?.forEach(room => {
      roomMap[room.id] = room.room_name;
    });

    const enhancedBookings = bookings?.map(booking => ({
      ...booking,
      room_name: roomMap[booking.room_id] || 'Unknown'
    }));

    return c.json({
      totalBookings: bookings?.length || 0,
      statusBreakdown: bookings?.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {}),
      bookings: enhancedBookings
    });

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

bookings.get('/debug/user-bookings/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    
    const { data: userBookings, error } = await supabase
      .from('meeting_bookings')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      employeeId,
      totalBookings: userBookings?.length || 0,
      statusBreakdown: userBookings?.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {}),
      bookings: userBookings
    });

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

bookings.get('/debug/approved-bookings', async (c) => {
  try {
    const { data: approvedBookings, error } = await supabase
      .from('meeting_bookings')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      totalApproved: approvedBookings?.length || 0,
      approvedBookings: approvedBookings
    });

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== AUTHENTICATED ROUTES =====
// Apply authentication middleware to all booking routes EXCEPT debug routes
bookings.use('*', (c, next) => {
  // Skip middleware for debug routes
  if (c.req.path.includes('/debug/')) {
    return next();
  }
  return sessionMiddleware(c, next);
});

// ===== USER ACCESSIBLE ROUTES =====
// Basic booking operations
bookings.post('/', (c) => bookingController.createBooking(c));
bookings.get('/my-bookings', (c) => bookingController.getUserBookings(c));
bookings.get('/my-bookings/pending-approved', (c) => bookingController.getUserPendingApprovedBookings(c));
bookings.get('/all-bookings', (c) => bookingController.getAllUserVisibleBookings(c));
bookings.get('/room/:roomId', (c) => bookingController.getRoomBookings(c));
bookings.get('/room/:roomId/available-slots', (c) => bookingController.getAvailableSlots(c));
bookings.get('/room/:roomId/availability/multi-day', (c) => bookingController.getMultiDayAvailability(c));

// User's own booking management
bookings.get('/my-bookings/status/:status', (c) => bookingController.getUserBookingsByStatus(c));
bookings.get('/my-booking/:bookingId', canEditBooking, (c) => bookingController.getUserBookingById(c));
bookings.get('/my-bookings/filtered', (c) => bookingController.getUserBookingsFiltered(c));

// Individual booking management
bookings.delete('/:bookingId', canEditBooking, (c) => bookingController.cancelBooking(c));
bookings.put('/:bookingId', canEditBooking, (c) => bookingController.editBooking(c));
bookings.delete('/recurring/:recurring_group_id', (c) => bookingController.cancelRecurringBookings(c));

// ===== ADMIN ONLY ROUTES =====
bookings.get('/admin/all', requireAdmin, (c) => bookingController.getAllBookings(c));
bookings.get('/admin/pending', requireAdmin, (c) => bookingController.getPendingBookings(c));
bookings.get('/admin/by-status/:status', requireAdmin, (c) => bookingController.getBookingsByStatus(c));
bookings.get('/admin/booking/:bookingId', requireAdmin, (c) => bookingController.getBookingById(c));
bookings.get('/admin/filtered', requireAdmin, (c) => bookingController.getBookingsWithFilters(c));
bookings.patch('/admin/:bookingId/status', requireAdmin, (c) => bookingController.updateBookingStatus(c));

export default bookings;