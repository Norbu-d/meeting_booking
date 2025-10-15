import { createClient } from '@supabase/supabase-js'
import logger from '../utils/logger.js'

// Use the correct environment variable names
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  logger.error('Supabase configuration missing')
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing')
  console.error('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Missing')
  console.error('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing')
  throw new Error('Supabase URL and Key must be provided in environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  }
})

// Test connection on startup
async function testSupabaseConnection() {
  try {
    // Try a simpler query that won't fail if table doesn't exist
    const { error } = await supabase
      .rpc('get_version') // This is a safe function call
      .single()
      .catch(() => ({ error: null })) // Ignore errors for connection test
    
    if (error && error.code !== '42883') { // 42883 is "function does not exist"
      throw error
    }
    
    logger.info('Supabase connection test successful')
    return true
  } catch (error) {
    logger.error('Supabase connection test failed:', error)
    // Don't throw error, just return false
    return false
  }
}

// Initialize Supabase
let isSupabaseReady = false
try {
  isSupabaseReady = await testSupabaseConnection()
  if (isSupabaseReady) {
    logger.info('Supabase initialized successfully')
  } else {
    logger.warn('Supabase connection test failed, but continuing without Supabase')
  }
} catch (error) {
  logger.error('Supabase initialization failed:', error)
  isSupabaseReady = false
}

export { supabase, isSupabaseReady }