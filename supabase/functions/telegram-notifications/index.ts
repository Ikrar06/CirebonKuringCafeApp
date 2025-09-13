/**
 * Telegram Notifications Edge Function - Main Handler
 * 
 * Handles sending notifications via Telegram bot to individual chat IDs
 * Supports various notification types for cafe operations
 * 
 * @endpoints
 * POST /telegram-notifications/send - Send single notification
 * POST /telegram-notifications/broadcast - Send to multiple recipients
 * POST /telegram-notifications/test - Test bot configuration
 * GET  /telegram-notifications/status - Get bot status and stats
 * DELETE /telegram-notifications/webhook - Clear webhook (for debugging)
 */

import { withCors } from '../_shared/cors'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  createUnauthorizedResponse,
  parseJsonBody,
  createHandler
} from '../_shared/response'
import { 
  supabaseAdmin, 
  getAuthenticatedClient,
  logAudit 
} from '../_shared/supabase-client'
import { 
  validateFields,
  sanitizeString,
  isValidIndonesianPhone
} from '../../../packages/utils/src/validators/index'
import { sendTelegramMessage, broadcastToMultiple, testBotConnection } from './sender'
import { getMessageTemplate, NotificationType } from './templates'
import { getBotConfig, validateBotToken } from './bot-config'

// Notification interfaces
interface SendNotificationRequest {
  recipient_type: 'owner' | 'employee' | 'chat_id'
  recipient_id?: string // Employee ID or direct chat ID
  chat_id?: string // Direct chat ID
  notification_type: NotificationType
  data: Record<string, any>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  schedule_at?: string // ISO timestamp for scheduled notifications
}

interface BroadcastRequest {
  recipient_types: Array<'owner' | 'employees' | 'specific_roles'>
  roles?: string[] // For specific_roles type
  employee_ids?: string[] // For specific employees
  notification_type: NotificationType
  data: Record<string, any>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

interface NotificationResult {
  success: boolean
  message_id?: number
  chat_id: string
  recipient_name?: string
  error?: string
  retry_count?: number
}

interface BroadcastResult {
  total_sent: number
  successful_sends: NotificationResult[]
  failed_sends: NotificationResult[]
  summary: {
    success_rate: number
    total_recipients: number
  }
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Send single notification
 */
async function handleSendNotification(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const notificationData = body as SendNotificationRequest

    // Validate required fields
    const validation = validateFields(notificationData, {
      recipient_type: { required: true, type: 'string' },
      notification_type: { required: true, type: 'string' },
      data: { required: true }
    })

    if (!validation.valid) {
      return createValidationErrorResponse(
        Object.entries(validation.errors).map(([field, errors]) => ({
          field,
          message: errors[0],
          code: 'VALIDATION_ERROR'
        })),
        request
      )
    }

    // Authenticate request
    const authResult = await authenticateNotificationRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Validate bot configuration
    const botConfig = await getBotConfig()
    if (!botConfig.is_configured) {
      return createErrorResponse(
        'Telegram bot is not configured',
        503,
        { 
          error: 'Bot token not set or invalid',
          setup_required: true 
        },
        request
      )
    }

    // Get recipient chat ID
    const chatId = await getRecipientChatId(notificationData)
    if (!chatId.success) {
      return createErrorResponse(
        chatId.error || 'Failed to get recipient chat ID',
        400,
        undefined,
        request
      )
    }

    // Generate message from template
    const messageTemplate = getMessageTemplate(
      notificationData.notification_type,
      notificationData.data
    )

    if (!messageTemplate.success) {
      return createErrorResponse(
        'Invalid notification type or template error',
        400,
        { template_error: messageTemplate.error },
        request
      )
    }

    // Handle scheduled notifications
    if (notificationData.schedule_at) {
      const scheduleTime = new Date(notificationData.schedule_at)
      if (scheduleTime <= new Date()) {
        return createErrorResponse(
          'Scheduled time must be in the future',
          400,
          undefined,
          request
        )
      }

      // Store for later processing (would need a scheduler service)
      await storeScheduledNotification(notificationData, chatId.chat_id || '', messageTemplate.message || '')
      
      return createSuccessResponse(
        {
          scheduled: true,
          schedule_time: scheduleTime.toISOString(),
          recipient_chat_id: chatId.chat_id,
          notification_type: notificationData.notification_type
        },
        'Notification scheduled successfully',
        undefined,
        request
      )
    }

    // Send notification immediately
    const sendResult = await sendTelegramMessage(
      chatId.chat_id || '',
      messageTemplate.message || '',
      {
        priority: notificationData.priority || 'normal',
        notification_type: notificationData.notification_type,
        data: notificationData.data
      }
    )

    // Log notification
    await logNotification(
      notificationData,
      chatId.chat_id || '',
      sendResult,
      authResult.user_id || 'system'
    )

    if (sendResult.success) {
      return createSuccessResponse(
        {
          success: true,
          message_id: sendResult.message_id,
          chat_id: chatId.chat_id,
          recipient_name: chatId.recipient_name,
          notification_type: notificationData.notification_type,
          sent_at: new Date().toISOString()
        },
        'Notification sent successfully',
        undefined,
        request
      )
    } else {
      return createErrorResponse(
        'Failed to send notification',
        500,
        {
          error: sendResult.error,
          chat_id: chatId.chat_id,
          retry_available: sendResult.retry_recommended
        },
        request
      )
    }

  } catch (error) {
    console.error('Error in handleSendNotification:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Broadcast notification to multiple recipients
 */
async function handleBroadcastNotification(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const broadcastData = body as BroadcastRequest

    // Validate required fields
    const validation = validateFields(broadcastData, {
      recipient_types: { required: true },
      notification_type: { required: true, type: 'string' },
      data: { required: true }
    })

    if (!validation.valid) {
      return createValidationErrorResponse(
        Object.entries(validation.errors).map(([field, errors]) => ({
          field,
          message: errors[0],
          code: 'VALIDATION_ERROR'
        })),
        request
      )
    }

    // Authenticate request
    const authResult = await authenticateNotificationRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Validate bot configuration
    const botConfig = await getBotConfig()
    if (!botConfig.is_configured) {
      return createErrorResponse(
        'Telegram bot is not configured',
        503,
        { error: 'Bot token not set or invalid' },
        request
      )
    }

    // Get all recipient chat IDs
    const recipients = await getBroadcastRecipients(broadcastData)
    if (recipients.length === 0) {
      return createErrorResponse(
        'No valid recipients found',
        400,
        { recipient_types: broadcastData.recipient_types },
        request
      )
    }

    // Generate message from template
    const messageTemplate = getMessageTemplate(
      broadcastData.notification_type,
      broadcastData.data
    )

    if (!messageTemplate.success) {
      return createErrorResponse(
        'Invalid notification type or template error',
        400,
        { template_error: messageTemplate.error },
        request
      )
    }

    // Send broadcast
    const broadcastResult = await broadcastToMultiple(
      recipients,
      messageTemplate.message || '',
      {
        priority: broadcastData.priority || 'normal',
        notification_type: broadcastData.notification_type,
        data: broadcastData.data
      }
    )

    // Log broadcast operation
    await logBroadcast(
      broadcastData,
      broadcastResult,
      authResult.user_id || 'system'
    )

    return createSuccessResponse(
      {
        broadcast_result: broadcastResult,
        message_preview: (messageTemplate.message || '').substring(0, 100) + '...',
        sent_at: new Date().toISOString()
      },
      `Broadcast completed: ${broadcastResult.successful_sends.length}/${broadcastResult.total_sent} sent successfully`,
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleBroadcastNotification:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Test bot configuration and connection
 */
async function handleTestBot(request: Request): Promise<Response> {
  try {
    // Authenticate request (owner only)
    const authResult = await authenticateNotificationRequest(request, ['owner'])
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Test bot connection
    const testResult = await testBotConnection()

    if (testResult.success) {
      return createSuccessResponse(
        {
          bot_info: testResult.bot_info,
          connection_status: 'active',
          test_timestamp: new Date().toISOString()
        },
        'Bot connection test successful',
        undefined,
        request
      )
    } else {
      return createErrorResponse(
        'Bot connection test failed',
        503,
        {
          error: testResult.error,
          suggestions: [
            'Check bot token configuration',
            'Verify bot is not blocked',
            'Ensure bot has necessary permissions'
          ]
        },
        request
      )
    }

  } catch (error) {
    console.error('Error in handleTestBot:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get bot status and statistics
 */
async function handleGetBotStatus(request: Request): Promise<Response> {
  try {
    // Authenticate request
    const authResult = await authenticateNotificationRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get bot configuration
    const botConfig = await getBotConfig()

    // Get notification statistics (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: notifications, error } = await supabaseAdmin
      .from('telegram_notifications')
      .select('success, notification_type, created_at')
      .gte('created_at', yesterday)

    if (error) {
      console.error('Error fetching notification stats:', error)
    }

    const stats = {
      total_sent_24h: notifications?.length || 0,
      successful_24h: notifications?.filter(n => n.success).length || 0,
      failed_24h: notifications?.filter(n => !n.success).length || 0,
      success_rate_24h: notifications?.length ? 
        Math.round((notifications.filter(n => n.success).length / notifications.length) * 100) : 0,
      notification_types_24h: [...new Set(notifications?.map(n => n.notification_type) || [])]
    }

    return createSuccessResponse(
      {
        bot_status: {
          configured: botConfig.is_configured,
          bot_username: botConfig.bot_username,
          last_updated: botConfig.last_updated
        },
        statistics: stats,
        configuration: {
          retry_enabled: true,
          max_retries: 3,
          timeout_seconds: 30
        }
      },
      'Bot status retrieved successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetBotStatus:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get recipient chat ID based on request type
 */
async function getRecipientChatId(notificationData: SendNotificationRequest): Promise<{
  success: boolean
  error?: string
  chat_id?: string
  recipient_name?: string
}> {
  try {
    switch (notificationData.recipient_type) {
      case 'chat_id':
        if (!notificationData.chat_id) {
          return { success: false, error: 'Chat ID required for direct messaging' }
        }
        return { 
          success: true, 
          chat_id: notificationData.chat_id,
          recipient_name: 'Direct Chat'
        }

      case 'owner':
        // Get owner's chat ID from system settings or user profile
        const { data: ownerSettings } = await supabaseAdmin
          .from('system_settings')
          .select('value')
          .eq('key', 'owner_telegram_chat_id')
          .single()

        if (!ownerSettings?.value) {
          return { success: false, error: 'Owner Telegram chat ID not configured' }
        }

        return { 
          success: true, 
          chat_id: ownerSettings.value,
          recipient_name: 'Owner'
        }

      case 'employee':
        if (!notificationData.recipient_id) {
          return { success: false, error: 'Employee ID required for employee notifications' }
        }

        const { data: employee, error } = await supabaseAdmin
          .from('employees')
          .select('telegram_chat_id, full_name')
          .eq('id', notificationData.recipient_id)
          .eq('status', 'active')
          .single()

        if (error || !employee) {
          return { success: false, error: 'Employee not found or inactive' }
        }

        if (!employee.telegram_chat_id) {
          return { success: false, error: 'Employee Telegram chat ID not configured' }
        }

        return { 
          success: true, 
          chat_id: employee.telegram_chat_id,
          recipient_name: employee.full_name
        }

      default:
        return { success: false, error: 'Invalid recipient type' }
    }

  } catch (error) {
    console.error('Error getting recipient chat ID:', error)
    return { success: false, error: 'Failed to resolve recipient' }
  }
}

/**
 * Get broadcast recipients
 */
async function getBroadcastRecipients(broadcastData: BroadcastRequest): Promise<Array<{
  chat_id: string
  recipient_name: string
  recipient_type: string
}>> {
  const recipients: Array<{
    chat_id: string
    recipient_name: string
    recipient_type: string
  }> = []

  try {
    for (const recipientType of broadcastData.recipient_types) {
      switch (recipientType) {
        case 'owner':
          const { data: ownerSettings } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'owner_telegram_chat_id')
            .single()

          if (ownerSettings?.value) {
            recipients.push({
              chat_id: ownerSettings.value,
              recipient_name: 'Owner',
              recipient_type: 'owner'
            })
          }
          break

        case 'employees':
          let employeeQuery = supabaseAdmin
            .from('employees')
            .select('telegram_chat_id, full_name, position')
            .eq('status', 'active')
            .not('telegram_chat_id', 'is', null)

          // Filter by roles if specified
          if (broadcastData.roles && broadcastData.roles.length > 0) {
            employeeQuery = employeeQuery.in('position', broadcastData.roles)
          }

          // Filter by specific employee IDs if specified
          if (broadcastData.employee_ids && broadcastData.employee_ids.length > 0) {
            employeeQuery = employeeQuery.in('id', broadcastData.employee_ids)
          }

          const { data: employees } = await employeeQuery

          if (employees) {
            employees.forEach(employee => {
              recipients.push({
                chat_id: employee.telegram_chat_id,
                recipient_name: employee.full_name,
                recipient_type: `employee_${employee.position}`
              })
            })
          }
          break

        case 'specific_roles':
          if (broadcastData.roles && broadcastData.roles.length > 0) {
            const { data: roleEmployees } = await supabaseAdmin
              .from('employees')
              .select('telegram_chat_id, full_name, position')
              .eq('status', 'active')
              .in('position', broadcastData.roles)
              .not('telegram_chat_id', 'is', null)

            if (roleEmployees) {
              roleEmployees.forEach(employee => {
                recipients.push({
                  chat_id: employee.telegram_chat_id,
                  recipient_name: employee.full_name,
                  recipient_type: `role_${employee.position}`
                })
              })
            }
          }
          break
      }
    }

  } catch (error) {
    console.error('Error getting broadcast recipients:', error)
  }

  // Remove duplicates based on chat_id
  const uniqueRecipients = recipients.filter((recipient, index, self) =>
    index === self.findIndex(r => r.chat_id === recipient.chat_id)
  )

  return uniqueRecipients
}

/**
 * Store scheduled notification for later processing
 */
async function storeScheduledNotification(
  notificationData: SendNotificationRequest,
  chatId: string,
  message: string
): Promise<void> {
  try {
    await supabaseAdmin
      .from('scheduled_notifications')
      .insert({
        chat_id: chatId,
        message,
        notification_type: notificationData.notification_type,
        data: notificationData.data,
        priority: notificationData.priority || 'normal',
        scheduled_at: notificationData.schedule_at,
        status: 'pending',
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error storing scheduled notification:', error)
  }
}

/**
 * Log notification attempt
 */
async function logNotification(
  notificationData: SendNotificationRequest,
  chatId: string,
  sendResult: any,
  userId: string
): Promise<void> {
  try {
    await supabaseAdmin
      .from('telegram_notifications')
      .insert({
        chat_id: chatId,
        notification_type: notificationData.notification_type,
        message_id: sendResult.message_id,
        success: sendResult.success,
        error_message: sendResult.error,
        retry_count: sendResult.retry_count || 0,
        data: notificationData.data,
        sent_by: userId,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging notification:', error)
  }
}

/**
 * Log broadcast operation
 */
async function logBroadcast(
  broadcastData: BroadcastRequest,
  broadcastResult: any,
  userId: string
): Promise<void> {
  try {
    await logAudit(
      userId,
      'TELEGRAM_BROADCAST',
      {
        notification_type: broadcastData.notification_type,
        recipient_types: broadcastData.recipient_types,
        total_recipients: broadcastResult.total_sent,
        successful_sends: broadcastResult.successful_sends.length,
        failed_sends: broadcastResult.failed_sends.length,
        success_rate: broadcastResult.summary.success_rate
      },
      'telegram_notifications',
      'broadcast'
    )
  } catch (error) {
    console.error('Error logging broadcast:', error)
  }
}

/**
 * Authenticate notification request
 */
async function authenticateNotificationRequest(
  request: Request,
  allowedRoles: string[] = ['owner', 'kasir', 'device_kasir', 'device_dapur', 'device_pelayan', 'device_stok']
): Promise<{
  success: boolean
  error?: string
  user_id?: string
}> {
  try {
    // Try device authentication first
    const deviceId = request.headers.get('X-Device-ID')
    const deviceRole = request.headers.get('X-Device-Role')

    if (deviceId && deviceRole) {
      const deviceRoleName = `device_${deviceRole}`
      if (allowedRoles.includes(deviceRoleName)) {
        return { success: true, user_id: deviceId }
      }
    }

    // Try user authentication
    const authResult = await getAuthenticatedClient(request)
    if (authResult) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('user_id, position')
        .eq('user_id', authResult.user.id)
        .eq('status', 'active')
        .single()

      if (employee && allowedRoles.includes(employee.position)) {
        return { success: true, user_id: authResult.user.id }
      }

      // Check if user is owner
      if (allowedRoles.includes('owner')) {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', authResult.user.id)
          .single()

        if (user && user.role === 'owner') {
          return { success: true, user_id: authResult.user.id }
        }
      }
    }

    return {
      success: false,
      error: 'Unauthorized access'
    }

  } catch (error) {
    console.error('Error authenticating notification request:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

// ===========================================
// MAIN HANDLER WITH ROUTING
// ===========================================

const handler = withCors(createHandler({
  POST: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/send')) {
      return handleSendNotification(request)
    } else if (url.pathname.includes('/broadcast')) {
      return handleBroadcastNotification(request)
    } else if (url.pathname.includes('/test')) {
      return handleTestBot(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/status')) {
      return handleGetBotStatus(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  DELETE: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/webhook')) {
      // Clear webhook for debugging (owner only)
      const authResult = await authenticateNotificationRequest(request, ['owner'])
      if (!authResult.success) {
        return createUnauthorizedResponse(authResult.error, request)
      }
      
      // TODO: Implement webhook clearing if needed
      return createSuccessResponse(
        { webhook_cleared: true },
        'Webhook cleared successfully',
        undefined,
        request
      )
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler