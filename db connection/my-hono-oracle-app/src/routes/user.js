import { Hono } from 'hono';
import userController from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';

const router = new Hono();

// Apply auth middleware to all user routes
router.use('*', authMiddleware);

// Get user profile
router.get('/profile', userController.getProfile);

// Get user permissions/roles
router.get('/permissions', userController.getPermissions);

// Update user profile
router.put('/profile', userController.updateProfile);

export default router;