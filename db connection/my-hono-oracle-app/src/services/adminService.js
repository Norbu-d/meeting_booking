// src/services/adminService.js
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if a user has admin access using employee_id/login_id
 * @param {string} identifier - User's employee ID, login ID, or any identifier
 * @returns {boolean} Whether the user has admin access
 */
async function checkAdminAccess(identifier) {
  try {
    logger.info('Checking admin access for identifier:', identifier);
    
    if (!identifier) {
      logger.warn('No identifier provided for admin check');
      return false;
    }

    // Clean up the identifier if it looks mangled
    let cleanIdentifier = identifier.toString().trim();
    
    // Log the original and cleaned identifier for debugging
    logger.info('Original identifier:', identifier);
    logger.info('Cleaned identifier:', cleanIdentifier);

    // For testing/development purposes, check test admin IDs first
    const testAdminIds = ['115437', 'admin', 'testadmin'];
    if (testAdminIds.includes(cleanIdentifier)) {
      logger.info('Using test admin ID:', cleanIdentifier);
      return true;
    }

    // Try to find the user in wifi_sessions table using multiple approaches
    let userData = null;
    const searchFields = ['login_id', 'employee_id', 'user_id'];
    
    for (const field of searchFields) {
      try {
        logger.info(`Searching wifi_sessions by ${field}:`, cleanIdentifier);
        
        const { data, error } = await supabase
          .from('wifi_sessions')
          .select('*')
          .eq(field, cleanIdentifier)
          .single();
        
        if (data && !error) {
          userData = data;
          logger.info(`Found user data via ${field}:`, { 
            loginId: data.login_id,
            employeeId: data.employee_id,
            isAdmin: data.is_admin,
            userRole: data.user_role 
          });
          break;
        }
      } catch (err) {
        logger.debug(`Search by ${field} failed:`, err.message);
      }
    }

    // If user data found, check admin status
    if (userData) {
      const isAdmin = userData.is_admin === true || 
                    userData.user_role === 'admin' ||
                    userData.role === 'admin' ||
                    userData.status === 'admin' ||
                    userData.user_type === 'admin';
      
      logger.info('Admin check result from user data:', { 
        identifier: cleanIdentifier, 
        loginId: userData.login_id,
        isAdmin 
      });
      return isAdmin;
    }
    
    // If no user data found, check admin_users table
    logger.info('No user session found, checking admin_users table...');
    
    try {
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('login_id', cleanIdentifier)
        .eq('is_active', true)
        .single();

      if (adminUser && !error) {
        logger.info('Admin user found in admin_users table:', cleanIdentifier);
        return true;
      }
    } catch (err) {
      logger.debug('No admin user found in admin_users table');
    }
    
    logger.info('No admin access found for:', cleanIdentifier);
    return false;
    
  } catch (error) {
    logger.error('Error in checkAdminAccess:', error);
    
    // Emergency fallback for development
    const testAdminIds = ['115437', 'admin', 'testadmin'];
    const cleanIdentifier = identifier?.toString().trim();
    if (testAdminIds.includes(cleanIdentifier)) {
      logger.info('Using emergency fallback admin check:', cleanIdentifier);
      return true;
    }
    
    return false;
  }
}

/**
 * Get all admin users
 */
async function getAllAdmins() {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching admin users:', error);
      return { success: false, data: [], message: 'Failed to fetch admin users' };
    }

    return { success: true, data: data || [], message: 'Admin users fetched successfully' };
  } catch (error) {
    logger.error('Error in getAllAdmins:', error);
    return { success: false, data: [], message: 'Internal server error' };
  }
}

/**
 * Create a new admin user
 */
async function createAdmin(adminData) {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .insert([{
        login_id: adminData.login_id,
        password: adminData.password, // In production, hash this!
        role: adminData.role || 'admin',
        is_active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error creating admin user:', error);
      return { success: false, message: 'Failed to create admin user' };
    }

    logger.info('Admin user created:', adminData.login_id);
    return { success: true, data, message: 'Admin user created successfully' };
  } catch (error) {
    logger.error('Error in createAdmin:', error);
    return { success: false, message: 'Internal server error' };
  }
}

/**
 * Update admin user status
 */
async function updateAdminStatus(loginId, isActive) {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .update({ is_active: isActive })
      .eq('login_id', loginId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating admin status:', error);
      return { success: false, message: 'Failed to update admin status' };
    }

    logger.info(`Admin status updated: ${loginId} -> ${isActive ? 'active' : 'inactive'}`);
    return { success: true, data, message: 'Admin status updated successfully' };
  } catch (error) {
    logger.error('Error in updateAdminStatus:', error);
    return { success: false, message: 'Internal server error' };
  }
}

export default {
  checkAdminAccess,
  getAllAdmins,
  createAdmin,
  updateAdminStatus,
  supabase
};