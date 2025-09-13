/**
 * Authentication Webhook Edge Function - Main Handler
 * 
 * Handles Supabase authentication lifecycle events
 * Manages user creation, profile updates, and role assignments
 * 
 * @endpoints
 * POST /auth-webhook - Handle authentication events from Supabase
 */

import { withCors } from '../_shared/cors'
import { 
  createSuccessResponse, 
  createErrorResponse,
  parseJsonBody,
  createHandler
} from '../_shared/response'
import { 
  supabaseAdmin,
  logAudit 
} from '../_shared/supabase-client'

// Webhook event types from Supabase Auth
type AuthEvent = 
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.confirmed'
  | 'user.recovery'
  | 'user.invited'

// Webhook payload interface
interface AuthWebhookPayload {
  type: AuthEvent
  table: string
  record: {
    id: string
    email?: string
    phone?: string
    email_confirmed_at?: string
    phone_confirmed_at?: string
    created_at: string
    updated_at: string
    user_metadata?: Record<string, any>
    app_metadata?: Record<string, any>
    role?: string
    aud: string
  }
  schema: string
  old_record?: any
}

// User profile creation interface
interface UserProfileData {
  id: string
  email?: string
  phone?: string
  role: 'owner' | 'employee' | 'customer'
  full_name?: string
  created_at: string
  email_confirmed: boolean
  phone_confirmed: boolean
  is_active: boolean
}

// ===========================================
// MAIN WEBHOOK HANDLER
// ===========================================

/**
 * Main authentication webhook handler
 */
async function handleAuthWebhook(request: Request): Promise<Response> {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-supabase-signature')
    if (!signature) {
      return createErrorResponse('Missing webhook signature', 401, undefined, request)
    }

    // Parse webhook payload
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid webhook payload', 400, undefined, request)
    }

    const payload = body as AuthWebhookPayload

    // Verify webhook authenticity
    const isValidWebhook = await verifyWebhookSignature(request, signature)
    if (!isValidWebhook) {
      console.error('Invalid webhook signature')
      return createErrorResponse('Invalid webhook signature', 401, undefined, request)
    }

    console.log(`Processing auth webhook event: ${payload.type} for user: ${payload.record.id}`)

    // Route to appropriate handler based on event type
    let result
    switch (payload.type) {
      case 'user.created':
        result = await handleUserCreated(payload)
        break
      case 'user.updated':
        result = await handleUserUpdated(payload)
        break
      case 'user.deleted':
        result = await handleUserDeleted(payload)
        break
      case 'user.confirmed':
        result = await handleUserConfirmed(payload)
        break
      case 'user.recovery':
        result = await handleUserRecovery(payload)
        break
      case 'user.invited':
        result = await handleUserInvited(payload)
        break
      default:
        console.log(`Unhandled auth event: ${payload.type}`)
        result = { success: true, action: 'ignored', message: 'Event type not handled' }
    }

    // Log webhook processing
    await logWebhookEvent(payload, result)

    return createSuccessResponse(
      {
        event_type: payload.type,
        user_id: payload.record.id,
        processed: result.success,
        action_taken: result.action,
        message: result.message
      },
      'Webhook processed successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error processing auth webhook:', error)
    return createErrorResponse(
      'Webhook processing failed',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

// ===========================================
// EVENT HANDLERS
// ===========================================

/**
 * Handle user creation event
 */
async function handleUserCreated(payload: AuthWebhookPayload): Promise<{
  success: boolean
  action: string
  message: string
}> {
  try {
    const user = payload.record

    // Determine user role from metadata or email domain
    const userRole = determineUserRole(user)

    // Create user profile in custom users table
    const profileData: UserProfileData = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: userRole,
      full_name: user.user_metadata?.full_name || extractNameFromEmail(user.email),
      created_at: user.created_at,
      email_confirmed: !!user.email_confirmed_at,
      phone_confirmed: !!user.phone_confirmed_at,
      is_active: true
    }

    // Insert user profile
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert(profileData)

    if (insertError) {
      console.error('Error creating user profile:', insertError)
      return {
        success: false,
        action: 'profile_creation_failed',
        message: `Failed to create user profile: ${insertError.message}`
      }
    }

    // Handle role-specific setup
    await handleRoleSpecificSetup(user.id, userRole, user)

    // Send welcome notification
    await sendWelcomeNotification(profileData)

    return {
      success: true,
      action: 'profile_created',
      message: `User profile created with role: ${userRole}`
    }

  } catch (error) {
    console.error('Error in handleUserCreated:', error)
    return {
      success: false,
      action: 'error',
      message: error instanceof Error ? error.message : 'User creation handling failed'
    }
  }
}

/**
 * Handle user update event
 */
async function handleUserUpdated(payload: AuthWebhookPayload): Promise<{
  success: boolean
  action: string
  message: string
}> {
  try {
    const user = payload.record
    const oldUser = payload.old_record

    // Check what changed
    const changes = detectUserChanges(oldUser, user)
    
    if (changes.length === 0) {
      return {
        success: true,
        action: 'no_changes',
        message: 'No significant changes detected'
      }
    }

    // Update user profile in custom users table
    const updateData: Partial<UserProfileData> = {
      email: user.email,
      phone: user.phone,
      full_name: user.user_metadata?.full_name,
      email_confirmed: !!user.email_confirmed_at,
      phone_confirmed: !!user.phone_confirmed_at
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UserProfileData] === undefined) {
        delete updateData[key as keyof UserProfileData]
      }
    })

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return {
        success: false,
        action: 'profile_update_failed',
        message: `Failed to update user profile: ${updateError.message}`
      }
    }

    // Handle specific change events
    for (const change of changes) {
      await handleSpecificChange(user.id, change, user)
    }

    return {
      success: true,
      action: 'profile_updated',
      message: `User profile updated. Changes: ${changes.join(', ')}`
    }

  } catch (error) {
    console.error('Error in handleUserUpdated:', error)
    return {
      success: false,
      action: 'error',
      message: error instanceof Error ? error.message : 'User update handling failed'
    }
  }
}

/**
 * Handle user deletion event
 */
async function handleUserDeleted(payload: AuthWebhookPayload): Promise<{
  success: boolean
  action: string
  message: string
}> {
  try {
    const userId = payload.record.id

    // Soft delete user profile (don't physically delete for audit purposes)
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error soft deleting user:', updateError)
      return {
        success: false,
        action: 'soft_delete_failed',
        message: `Failed to soft delete user: ${updateError.message}`
      }
    }

    // Handle role-specific cleanup
    await handleUserDeletionCleanup(userId)

    // Log deletion for audit
    await logAudit(
      'system',
      'USER_DELETED',
      {
        deleted_user_id: userId,
        deletion_timestamp: new Date().toISOString()
      },
      'users',
      userId
    )

    return {
      success: true,
      action: 'user_soft_deleted',
      message: 'User profile soft deleted successfully'
    }

  } catch (error) {
    console.error('Error in handleUserDeleted:', error)
    return {
      success: false,
      action: 'error',
      message: error instanceof Error ? error.message : 'User deletion handling failed'
    }
  }
}

/**
 * Handle email/phone confirmation
 */
async function handleUserConfirmed(payload: AuthWebhookPayload): Promise<{
  success: boolean
  action: string
  message: string
}> {
  try {
    const user = payload.record

    // Update confirmation status
    const updateData: any = {
      email_confirmed: !!user.email_confirmed_at,
      phone_confirmed: !!user.phone_confirmed_at,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating confirmation status:', updateError)
      return {
        success: false,
        action: 'confirmation_update_failed',
        message: 'Failed to update confirmation status'
      }
    }

    // Send confirmation welcome message
    await sendConfirmationNotification(user)

    return {
      success: true,
      action: 'confirmation_updated',
      message: 'User confirmation status updated'
    }

  } catch (error) {
    console.error('Error in handleUserConfirmed:', error)
    return {
      success: false,
      action: 'error',
      message: 'Confirmation handling failed'
    }
  }
}

/**
 * Handle password recovery
 */
async function handleUserRecovery(payload: AuthWebhookPayload): Promise<{
  success: boolean
  action: string
  message: string
}> {
  try {
    const user = payload.record

    // Log recovery attempt for security audit
    await logAudit(
      user.id,
      'PASSWORD_RECOVERY_INITIATED',
      {
        email: user.email,
        timestamp: new Date().toISOString()
      },
      'users',
      user.id
    )

    // Send security notification
    await sendSecurityNotification(user, 'password_recovery')

    return {
      success: true,
      action: 'recovery_logged',
      message: 'Password recovery logged successfully'
    }

  } catch (error) {
    console.error('Error in handleUserRecovery:', error)
    return {
      success: false,
      action: 'error',
      message: 'Recovery handling failed'
    }
  }
}

/**
 * Handle user invitation
 */
async function handleUserInvited(payload: AuthWebhookPayload): Promise<{
  success: boolean
  action: string
  message: string
}> {
  try {
    const user = payload.record

    // Create pending user profile
    const profileData: UserProfileData = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'employee',
      full_name: user.user_metadata?.full_name || extractNameFromEmail(user.email),
      created_at: user.created_at,
      email_confirmed: false,
      phone_confirmed: false,
      is_active: false // Inactive until they confirm
    }

    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert(profileData)

    if (insertError) {
      console.error('Error creating invited user profile:', insertError)
      return {
        success: false,
        action: 'invited_profile_failed',
        message: 'Failed to create invited user profile'
      }
    }

    return {
      success: true,
      action: 'invited_profile_created',
      message: 'Invited user profile created'
    }

  } catch (error) {
    console.error('Error in handleUserInvited:', error)
    return {
      success: false,
      action: 'error',
      message: 'Invitation handling failed'
    }
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Verify webhook signature from Supabase
 */
async function verifyWebhookSignature(request: Request, signature: string): Promise<boolean> {
  try {
    const webhookSecret = Deno.env.get('SUPABASE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('SUPABASE_WEBHOOK_SECRET not configured')
      return false
    }

    // Get request body for signature verification
    const body = await request.text()
    
    // Create expected signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')

    return signature === `sha256=${expectedSignature}`

  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

/**
 * Determine user role based on metadata and email
 */
function determineUserRole(user: any): 'owner' | 'employee' | 'customer' {
  // Check app metadata first (set by admin)
  if (user.app_metadata?.role) {
    return user.app_metadata.role
  }

  // Check user metadata (set during signup)
  if (user.user_metadata?.role) {
    return user.user_metadata.role
  }

  // Default to customer for public signups
  return 'customer'
}

/**
 * Extract name from email address
 */
function extractNameFromEmail(email?: string): string {
  if (!email) return 'User'
  
  const localPart = email.split('@')[0]
  return localPart.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ')
}

/**
 * Handle role-specific setup after user creation
 */
async function handleRoleSpecificSetup(userId: string, role: string, user: any): Promise<void> {
  try {
    switch (role) {
      case 'owner':
        // Setup owner-specific configurations
        await setupOwnerAccount(userId, user)
        break
        
      case 'employee':
        // Create employee record if invited
        await setupEmployeeAccount(userId, user)
        break
        
      case 'customer':
        // Setup customer preferences
        await setupCustomerAccount(userId, user)
        break
    }
  } catch (error) {
    console.error(`Error setting up ${role} account:`, error)
  }
}

/**
 * Setup owner account with system access
 */
async function setupOwnerAccount(userId: string, user: any): Promise<void> {
  // Owner gets full system access
  // Could setup default cafe settings, etc.
  console.log(`Setting up owner account for: ${user.email}`)
  
  // Initialize default cafe settings
  const defaultSettings = [
    { key: 'cafe_name', value: 'My Cafe' },
    { key: 'cafe_location', value: JSON.stringify({ lat: -6.2088, lng: 106.8456 }) },
    { key: 'operating_hours', value: JSON.stringify({ open: '07:00', close: '22:00' }) },
    { key: 'tax_rate', value: '11' }, // PPN 11%
    { key: 'service_charge', value: '5' }
  ]

  for (const setting of defaultSettings) {
    await supabaseAdmin
      .from('system_settings')
      .upsert({
        key: setting.key,
        value: setting.value,
        created_by: userId,
        created_at: new Date().toISOString()
      })
  }
}

/**
 * Setup employee account
 */
async function setupEmployeeAccount(userId: string, user: any): Promise<void> {
  // Check if employee record already exists (from invitation)
  const { data: existingEmployee } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existingEmployee) {
    // Activate existing employee record
    await supabaseAdmin
      .from('employees')
      .update({
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
  }
}

/**
 * Setup customer account
 */
async function setupCustomerAccount(userId: string, user: any): Promise<void> {
  // Customer preferences would be handled by application if needed
}

/**
 * Detect what changed in user update
 */
function detectUserChanges(oldUser: any, newUser: any): string[] {
  const changes: string[] = []
  
  if (oldUser.email !== newUser.email) changes.push('email')
  if (oldUser.phone !== newUser.phone) changes.push('phone')
  if (oldUser.email_confirmed_at !== newUser.email_confirmed_at) changes.push('email_confirmed')
  if (oldUser.phone_confirmed_at !== newUser.phone_confirmed_at) changes.push('phone_confirmed')
  if (JSON.stringify(oldUser.user_metadata) !== JSON.stringify(newUser.user_metadata)) changes.push('metadata')
  
  return changes
}

/**
 * Handle specific change events
 */
async function handleSpecificChange(userId: string, change: string, user: any): Promise<void> {
  switch (change) {
    case 'email':
      await logAudit(userId, 'EMAIL_CHANGED', { new_email: user.email })
      break
    case 'phone':
      await logAudit(userId, 'PHONE_CHANGED', { new_phone: user.phone })
      break
    case 'email_confirmed':
      await logAudit(userId, 'EMAIL_CONFIRMED', {})
      break
  }
}

/**
 * Handle user deletion cleanup
 */
async function handleUserDeletionCleanup(userId: string): Promise<void> {
  // Deactivate employee record if exists
  await supabaseAdmin
    .from('employees')
    .update({ status: 'inactive' })
    .eq('user_id', userId)

  // Customer data cleanup would be handled by application if needed
  console.log(`User ${userId} deletion cleanup completed`)
}

/**
 * Send welcome notification
 */
async function sendWelcomeNotification(profile: UserProfileData): Promise<void> {
  // Integration with Telegram notification system
  console.log(`Sending welcome notification to: ${profile.email}`)
  
  // Could integrate with email service or Telegram bot
}

/**
 * Send confirmation notification
 */
async function sendConfirmationNotification(user: any): Promise<void> {
  console.log(`Sending confirmation notification to: ${user.email}`)
}

/**
 * Send security notification
 */
async function sendSecurityNotification(user: any, eventType: string): Promise<void> {
  console.log(`Sending security notification (${eventType}) to: ${user.email}`)
}

/**
 * Log webhook event for audit
 */
async function logWebhookEvent(payload: AuthWebhookPayload, result: any): Promise<void> {
  try {
    await logAudit(
      'system',
      'AUTH_WEBHOOK_PROCESSED',
      {
        event_type: payload.type,
        user_id: payload.record.id,
        success: result.success,
        action: result.action,
        message: result.message
      },
      'auth_webhooks',
      payload.record.id
    )
  } catch (error) {
    console.error('Error logging webhook event:', error)
  }
}

// ===========================================
// MAIN HANDLER WITH ROUTING
// ===========================================

const handler = withCors(createHandler({
  POST: async (request: Request) => {
    return handleAuthWebhook(request)
  }
}))

export default handler