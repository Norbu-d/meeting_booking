import { Hono } from 'hono';
import meetingRoomController from '../controllers/meetingRoomController.js';
import sessionMiddleware from '../middleware/sessionMiddleware.js';

const meetingRooms = new Hono();

meetingRooms.use('*', sessionMiddleware);

// Get all meeting rooms
meetingRooms.get('/', async (c) => {
  return meetingRoomController.getAllRooms(c);
});

// Get room availability
meetingRooms.get('/:roomId/availability', async (c) => {
  return meetingRoomController.getRoomAvailability(c);
});

export default meetingRooms;