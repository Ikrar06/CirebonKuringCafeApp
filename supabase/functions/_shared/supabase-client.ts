/**
 * Shared Supabase Client for Edge Functions
 * 
 * Provides configured Supabase clients with service role access
 * Used across all Edge Functions for admin operations
 */

/// <reference path="./deno.d.ts" />
/// <reference path="./supabase-js.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import type { Database } from '../../../packages/shared-types/src/database.ts'

// Supabase configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables')
}

/**
 * Supabase client with anon key (for user operations)
 * Use this for operations that should respect RLS policies
 */
export const supabaseAnon = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'User-Agent': 'cafe-management-system/1.0',
      },
    },
  }
)

/**
 * Supabase client with service role key (for admin operations)
 * Use this for operations that need to bypass RLS policies
 * ⚠️ Use with caution - has full database access
 */
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'User-Agent': 'cafe-management-system-admin/1.0',
      },
    },
  }
)

/**
 * Get Supabase client with user authentication
 * Extracts JWT token from Authorization header and sets user context
 * 
 * @param request - Request object containing Authorization header
 * @returns Authenticated Supabase client or null if no valid token
 */
export async function getAuthenticatedClient(request: Request) {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    // Set the user's JWT token
    await supabaseAnon.auth.setSession({
      access_token: token,
      refresh_token: '', // Not needed for Edge Functions
    })

    // Verify the token is valid
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token)
    
    if (error || !user) {
      return null
    }

    return {
      client: supabaseAnon,
      user,
    }
  } catch (error) {
    console.error('Failed to authenticate user:', error)
    return null
  }
}

/**
 * Get user from JWT token without setting session
 * Useful for token validation without client state changes
 * 
 * @param token - JWT access token
 * @returns User object or null if invalid
 */
export async function getUserFromToken(token: string) {
  try {
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token)
    
    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Failed to get user from token:', error)
    return null
  }
}

/**
 * Validate device authentication for tablet applications
 * Checks device credentials against device_accounts table
 * 
 * @param deviceId - Device identifier
 * @param deviceRole - Device role (kasir, dapur, pelayan, stok)
 * @returns Device account info or null if invalid
 */
export async function validateDeviceAuth(
  deviceId: string, 
  deviceRole: 'kasir' | 'dapur' | 'pelayan' | 'stok'
) {
  try {
    const { data: deviceAccount, error } = await supabaseAdmin
      .from('device_accounts')
      .select('*')
      .eq('device_id', deviceId)
      .eq('device_role', deviceRole)
      .eq('is_active', true)
      .single()

    if (error || !deviceAccount) {
      return null
    }

    return deviceAccount
  } catch (error) {
    console.error('Failed to validate device auth:', error)
    return null
  }
}

/**
 * Get employee info with user details
 * Used for employee-specific operations
 * 
 * @param userId - User ID from auth
 * @returns Employee with user info or null if not found
 */
export async function getEmployeeByUserId(userId: string) {
  try {
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        user:users(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !employee) {
      return null
    }

    return employee
  } catch (error) {
    console.error('Failed to get employee:', error)
    return null
  }
}

/**
 * Check if user has specific role
 * 
 * @param userId - User ID to check
 * @param requiredRole - Required role
 * @returns True if user has the required role
 */
export async function hasRole(userId: string, requiredRole: string) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return false
    }

    return user.role === requiredRole
  } catch (error) {
    console.error('Failed to check user role:', error)
    return false
  }
}

/**
 * Check if user is owner (has admin privileges)
 * 
 * @param userId - User ID to check
 * @returns True if user is owner
 */
export async function isOwner(userId: string) {
  return await hasRole(userId, 'owner')
}

/**
 * Get cafe settings
 * Retrieves system settings like GPS coordinates, business hours, etc.
 * 
 * @returns Cafe configuration settings
 */
export async function getCafeSettings() {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')

    if (error) {
      throw error
    }

    // Convert array to key-value object
    const settingsMap = settings.reduce((acc: Record<string, any>, setting: any) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, any>)

    return settingsMap
  } catch (error) {
    console.error('Failed to get cafe settings:', error)
    return {}
  }
}

/**
 * Update cafe setting
 * 
 * @param key - Setting key
 * @param value - Setting value
 * @returns Success status
 */
export async function updateCafeSetting(key: string, value: any) {
  try {
    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      })

    return !error
  } catch (error) {
    console.error('Failed to update cafe setting:', error)
    return false
  }
}

/**
 * Log audit trail for important operations
 * 
 * @param userId - User performing the action
 * @param action - Action performed
 * @param details - Additional details
 * @param tableName - Table affected (optional)
 * @param recordId - Record ID affected (optional)
 */
export async function logAudit(
  userId: string,
  action: string,
  details: Record<string, any>,
  tableName?: string,
  recordId?: string
) {
  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        table_name: tableName,
        record_id: recordId,
        details,
        created_at: new Date().toISOString(),
      })
  } catch (error) {
    console.error('Failed to log audit:', error)
  }
}

// Export types for convenience
export type { Database }
export type AuthenticatedClient = {
  client: typeof supabaseAnon
  user: any
}