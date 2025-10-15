import { Hono } from 'hono';
import sessionController from '../controllers/sessionController.js';
import authMiddleware from '../middleware/sessionMiddleware.js';

const sessions = new Hono();

// Create WiFi session (after Oracle auth)
sessions.post('/wifi', authMiddleware, async (c) => {
  return sessionController.createWiFiSession(c);
});

// Check WiFi session status
sessions.get('/wifi/status', authMiddleware, async (c) => {
  return sessionController.getSessionStatus(c);
});

// Logout from WiFi
sessions.post('/wifi/logout', authMiddleware, async (c) => {
  return sessionController.logoutWiFi(c);
});

export default sessions;