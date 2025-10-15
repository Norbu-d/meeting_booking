// src/routes/admin.js
import { Hono } from 'hono';
import adminController from '../controllers/adminController.js';
import adminAuthService from '../services/adminAuthService.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const admin = new Hono();

// Admin login (no middleware needed)
admin.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({
        success: false,
        message: 'Username and password are required'
      }, 400);
    }

    const result = await adminAuthService.authenticateAdmin(username, password);

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 401);
    }
  } catch (error) {
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

// Apply admin middleware to all routes below
admin.use('*', adminMiddleware);

// Get pending bookings
admin.get('/bookings/pending', async (c) => {
  return adminController.getPendingBookings(c);
});

// Get all bookings with optional status filter
admin.get('/bookings', async (c) => {
  return adminController.getAllBookings(c);
});

// Approve booking
admin.patch('/bookings/:bookingId/approve', async (c) => {
  return adminController.approveBooking(c);
});

// Reject booking
admin.patch('/bookings/:bookingId/reject', async (c) => {
  return adminController.rejectBooking(c);
});

export default admin;