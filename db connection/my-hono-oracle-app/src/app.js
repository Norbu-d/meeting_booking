// src/app.js
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Import routes
import authRoutes from './routes/auth.js';
import testRoutes from './routes/test.js';
import sessionRoutes from './routes/sessions.js';
import meetingRoomRoutes from './routes/meetingRooms.js';
import bookingRoutes from './routes/bookings.js';

const app = new Hono();

// Enhanced CORS configuration - FIXED
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  credentials: true,
  maxAge: 86400,
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision']
}));

// Debug middleware - to see incoming requests
app.use('*', async (c, next) => {
  console.log('=== Incoming Request ===');
  console.log('Method:', c.req.method);
  console.log('URL:', c.req.url);
  console.log('Path:', c.req.path);
  console.log('Origin:', c.req.header('Origin'));
  console.log('=======================');
  await next();
});

// Other middleware
app.use('*', honoLogger());
app.use('*', prettyJSON());

// Health check endpoint with detailed CORS headers
app.get('/', (c) => {
  // Set CORS headers manually for root endpoint
  c.header('Access-Control-Allow-Origin', c.req.header('Origin') || 'http://localhost:5173');
  c.header('Access-Control-Allow-Credentials', 'true');
  
  return c.json({
    message: 'RICB EIS API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth/*',
      sessions: '/api/sessions/*',
      meetingRooms: '/api/meeting-rooms/*',
      bookings: '/api/bookings/*',
      test: '/api/test/*',
      health: '/api/test/health'
    },
    cors: {
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });
});

// Handle OPTIONS requests for all routes
app.options('*', (c) => {
  const origin = c.req.header('Origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
  } else {
    c.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  }
  
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Max-Age', '86400');
  
  return c.status(204);
});

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/sessions', sessionRoutes);
app.route('/api/meeting-rooms', meetingRoomRoutes);
app.route('/api/bookings', bookingRoutes);
app.route('/api/test', testRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    message: 'Endpoint not found',
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString()
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    success: false,
    message: 'Internal server error',
    error: err.message,
    timestamp: new Date().toISOString()
  }, 500);
});

export default app;