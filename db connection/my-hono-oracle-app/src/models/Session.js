import { supabase } from '../config/supabase.js'
import logger from '../utils/logger.js'

class Session {
  static async createWiFiSession({ employee_id, session_token, start_time, end_time }) {
    try {
      const { data, error } = await supabase
        .from('wifi_sessions')
        .insert([
          {
            employee_id,
            session_token,
            start_time,
            end_time,
            active: true
          }
        ])
        .select()
      
      if (error) throw error
      
      return data[0]
    } catch (error) {
      logger.error('Failed to create WiFi session:', error)
      throw error
    }
  }

  static async getActiveSession(session_token) {
    try {
      const { data, error } = await supabase
        .from('wifi_sessions')
        .select('*')
        .eq('session_token', session_token)
        .eq('active', true)
        .gt('end_time', new Date().toISOString())
        .single()
      
      if (error) throw error
      
      return data
    } catch (error) {
      logger.error('Failed to get active session:', error)
      return null
    }
  }

  static async invalidateSession(session_id) {
    try {
      const { error } = await supabase
        .from('wifi_sessions')
        .update({ active: false })
        .eq('id', session_id)
      
      if (error) throw error
      
      return true
    } catch (error) {
      logger.error('Failed to invalidate session:', error)
      throw error
    }
  }
}

export default Session