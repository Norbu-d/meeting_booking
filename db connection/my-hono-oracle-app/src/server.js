// src/server.js
import { serve } from '@hono/node-server';
import { initializeDatabase } from './config/database.js';
import app from './app.js';

const port = process.env.PORT || 3000;

/**
 * Test Supabase connection
 */
async function testSupabaseConnection() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  console.log('🔍 Debug: Checking environment variables...');
  console.log('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log(
    '   SUPABASE_KEY:',
    supabaseKey ? '✅ Set (' + supabaseKey.substring(0, 20) + '...)' : '❌ Missing'
  );

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Supabase: Missing environment variables');
    return false;
  }

  try {
    console.log('🔍 Debug: Testing REST endpoint...');
    const testUrl = `${supabaseUrl}/rest/v1/`;

    const response = await fetch(testUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    console.log('🔍 Debug: REST response status:', response.status, response.statusText);

    if (response.ok || response.status === 404) {
      console.log('✅ Supabase: Connected successfully');
      return true;
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  } catch (error) {
    console.log('❌ Supabase: Connection failed');
    console.log('   Error:', error.message);
    return false;
  }
}

/**
 * Start the server
 */
async function startServer() {
  try {
    console.log('🔄 Initializing RICB EIS API Server...');

    // Test connections
    console.log('🔗 Testing Supabase connection...');
    const supabaseConnected = await testSupabaseConnection();

    console.log('📊 Connecting to database...');
    await initializeDatabase();
    console.log('✅ Database connected successfully');

    // Start server
    serve(
      {
        fetch: app.fetch,
        port,
      },
      (info) => {
        console.log('\n' + '='.repeat(50));
        console.log('🚀 Server Status Summary');
        console.log('='.repeat(50));
        console.log('📡 Server running on: http://localhost:' + info.port);
        console.log('🔗 Supabase Status:', supabaseConnected ? '✅ Connected' : '❌ Disconnected');
        console.log('💾 Database Status: ✅ Connected');
        console.log('🏥 Health check: http://localhost:' + info.port + '/api/test/health');
        console.log('📚 API documentation: http://localhost:' + info.port + '/');
        console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
        console.log('='.repeat(50) + '\n');
      }
    );
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();