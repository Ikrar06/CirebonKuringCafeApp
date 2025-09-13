/**
 * Telegram Sender - Send Logic with Retry Mechanism
 * 
 * Handles actual message sending to Telegram API with retry logic,
 * error handling, and delivery confirmation
 */

import { getBotConfig, testBotConfiguration } from './bot-config'
import { supabaseAdmin } from '../_shared/supabase-client'

// Telegram API endpoint
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

// Send options interface
interface SendOptions {
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  notification_type?: string
  data?: Record<string, any>
  parse_mode?: 'Markdown' | 'HTML'
  disable_notification?: boolean
  reply_markup?: any
}

// Send result interface
interface SendResult {
  success: boolean
  message_id?: number
  error?: string
  retry_count?: number
  retry_recommended?: boolean
  rate_limited?: boolean
  chat_blocked?: boolean
}

// Broadcast recipient interface
interface BroadcastRecipient {
  chat_id: string
  recipient_name: string
  recipient_type: string
}

// Broadcast result interface
interface BroadcastResult {
  total_sent: number
  successful_sends: Array<{
    chat_id: string
    message_id: number
    recipient_name: string
  }>
  failed_sends: Array<{
    chat_id: string
    error: string
    recipient_name: string
  }>
  summary: {
    success_rate: number
    total_recipients: number
  }
}

// Rate limiting configuration
const RATE_LIMITS = {
  messages_per_second: 30,
  messages_per_minute: 20,
  burst_limit: 5
}

// Retry configuration
const RETRY_CONFIG = {
  max_retries: 3,
  initial_delay: 1000, // 1 second
  max_delay: 30000,    // 30 seconds
  backoff_factor: 2
}

// Error classifications
const ERROR_TYPES = {
  RATE_LIMITED: 'rate_limited',
  CHAT_BLOCKED: 'chat_blocked',
  INVALID_TOKEN: 'invalid_token',
  NETWORK_ERROR: 'network_error',
  API_ERROR: 'api_error',
  UNKNOWN: 'unknown'
}

// ===========================================
// CORE SENDING FUNCTIONS
// ===========================================

/**
 * Send message to single Telegram chat
 */
export async function sendTelegramMessage(
  chatId: string,
  message: string,
  options: SendOptions = {}
): Promise<SendResult> {
  let retryCount = 0
  let lastError: string | undefined

  while (retryCount <= RETRY_CONFIG.max_retries) {
    try {
      // Get bot token
      const botConfig = await getBotConfig()
      if (!botConfig.is_configured || !botConfig.bot_token) {
        return {
          success: false,
          error: 'Bot not configured',
          retry_recommended: false
        }
      }

      // Check rate limiting
      const rateLimitCheck = await checkRateLimit(chatId)
      if (!rateLimitCheck.allowed) {
        await sleep(rateLimitCheck.retry_after || 1000)
        retryCount++
        continue
      }

      // Prepare message data
      const messageData = {
        chat_id: chatId,
        text: message,
        parse_mode: options.parse_mode || 'Markdown',
        disable_notification: options.disable_notification || false,
        ...(options.reply_markup && { reply_markup: options.reply_markup })
      }

      // Send request to Telegram API
      const response = await fetch(`${TELEGRAM_API_BASE}${botConfig.bot_token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      })

      const responseData = await response.json()

      // Handle successful response
      if (response.ok && responseData.ok) {
        // Log successful send
        await logMessageSent(chatId, responseData.result.message_id, options)
        
        return {
          success: true,
          message_id: responseData.result.message_id,
          retry_count: retryCount
        }
      }

      // Handle API errors
      const errorResult = handleTelegramError(responseData, response.status)
      lastError = errorResult.error

      // Check if retry is recommended
      if (!errorResult.retry_recommended) {
        return {
          success: false,
          error: errorResult.error,
          retry_recommended: false,
          rate_limited: errorResult.error_type === ERROR_TYPES.RATE_LIMITED,
          chat_blocked: errorResult.error_type === ERROR_TYPES.CHAT_BLOCKED
        }
      }

      // Wait before retry
      if (errorResult.retry_after) {
        await sleep(errorResult.retry_after * 1000)
      } else {
        const delay = Math.min(
          RETRY_CONFIG.initial_delay * Math.pow(RETRY_CONFIG.backoff_factor, retryCount),
          RETRY_CONFIG.max_delay
        )
        await sleep(delay)
      }

      retryCount++

    } catch (error) {
      console.error(`Telegram send attempt ${retryCount + 1} failed:`, error)
      lastError = error instanceof Error ? error.message : 'Network error'
      
      // Wait before retry
      const delay = Math.min(
        RETRY_CONFIG.initial_delay * Math.pow(RETRY_CONFIG.backoff_factor, retryCount),
        RETRY_CONFIG.max_delay
      )
      await sleep(delay)
      
      retryCount++
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError || 'Max retries exceeded',
    retry_count: retryCount,
    retry_recommended: true
  }
}

/**
 * Send messages to multiple recipients (broadcast)
 */
export async function broadcastToMultiple(
  recipients: BroadcastRecipient[],
  message: string,
  options: SendOptions = {}
): Promise<BroadcastResult> {
  const results: BroadcastResult = {
    total_sent: 0,
    successful_sends: [],
    failed_sends: [],
    summary: {
      success_rate: 0,
      total_recipients: recipients.length
    }
  }

  // Send to each recipient with controlled concurrency
  const concurrency = 5 // Send to 5 recipients at a time
  
  for (let i = 0; i < recipients.length; i += concurrency) {
    const batch = recipients.slice(i, i + concurrency)
    
    const batchPromises = batch.map(async (recipient) => {
      try {
        const sendResult = await sendTelegramMessage(
          recipient.chat_id,
          message,
          options
        )

        if (sendResult.success) {
          results.successful_sends.push({
            chat_id: recipient.chat_id,
            message_id: sendResult.message_id!,
            recipient_name: recipient.recipient_name
          })
        } else {
          results.failed_sends.push({
            chat_id: recipient.chat_id,
            error: sendResult.error || 'Unknown error',
            recipient_name: recipient.recipient_name
          })
        }

        results.total_sent++

      } catch (error) {
        console.error(`Broadcast error for ${recipient.chat_id}:`, error)
        results.failed_sends.push({
          chat_id: recipient.chat_id,
          error: error instanceof Error ? error.message : 'Unknown error',
          recipient_name: recipient.recipient_name
        })
        results.total_sent++
      }
    })

    // Wait for batch to complete
    await Promise.all(batchPromises)

    // Add delay between batches to respect rate limits
    if (i + concurrency < recipients.length) {
      await sleep(200) // 200ms delay between batches
    }
  }

  // Calculate success rate
  results.summary.success_rate = results.total_sent > 0 
    ? Math.round((results.successful_sends.length / results.total_sent) * 100)
    : 0

  // Log broadcast summary
  await logBroadcastSummary(results, options)

  return results
}

/**
 * Test bot connection and sending capability
 */
export async function testBotConnection(): Promise<{
  success: boolean
  bot_info?: any
  error?: string
  response_time?: number
}> {
  try {
    const startTime = Date.now()
    
    // Test bot configuration
    const configTest = await testBotConfiguration()
    
    const responseTime = Date.now() - startTime

    if (configTest.success) {
      return {
        success: true,
        bot_info: configTest.bot_info,
        response_time: responseTime
      }
    } else {
      return {
        success: false,
        error: configTest.error
      }
    }

  } catch (error) {
    console.error('Bot connection test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed'
    }
  }
}

/**
 * Send test message to specific chat
 */
export async function sendTestMessage(chatId: string): Promise<SendResult> {
  const testMessage = `🤖 *Test Message*

Ini adalah pesan test dari Cafe Management System.

✅ Bot berfungsi dengan baik!
⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })}

📱 Jika Anda menerima pesan ini, berarti notifikasi Telegram sudah aktif.`

  return await sendTelegramMessage(chatId, testMessage, {
    priority: 'normal',
    notification_type: 'test_message'
  })
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Check rate limiting for chat
 */
async function checkRateLimit(chatId: string): Promise<{
  allowed: boolean
  retry_after?: number
}> {
  try {
    // Get recent message count for this chat
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    
    const { data: recentMessages, error } = await supabaseAdmin
      .from('telegram_notifications')
      .select('created_at')
      .eq('chat_id', chatId)
      .gte('created_at', oneMinuteAgo)
      .eq('success', true)

    if (error) {
      console.error('Error checking rate limit:', error)
      return { allowed: true } // Allow on error
    }

    const messageCount = recentMessages?.length || 0

    // Check if under rate limit
    if (messageCount < RATE_LIMITS.messages_per_minute) {
      return { allowed: true }
    }

    // Calculate retry after
    const oldestMessage = recentMessages?.[0]?.created_at
    if (oldestMessage) {
      const retryAfter = Math.ceil((new Date(oldestMessage).getTime() + 60000 - Date.now()) / 1000)
      return { 
        allowed: false, 
        retry_after: Math.max(retryAfter, 1) 
      }
    }

    return { allowed: false, retry_after: 60 }

  } catch (error) {
    console.error('Rate limit check error:', error)
    return { allowed: true } // Allow on error
  }
}

/**
 * Handle Telegram API errors
 */
function handleTelegramError(responseData: any, status: number): {
  error: string
  error_type: string
  retry_recommended: boolean
  retry_after?: number
} {
  const errorCode = responseData.error_code || status
  const description = responseData.description || 'Unknown error'

  switch (errorCode) {
    case 429: // Too Many Requests
      return {
        error: 'Rate limited by Telegram',
        error_type: ERROR_TYPES.RATE_LIMITED,
        retry_recommended: true,
        retry_after: responseData.parameters?.retry_after || 30
      }

    case 403: // Forbidden - Bot blocked by user
      if (description.includes('blocked') || description.includes('kicked')) {
        return {
          error: 'Chat blocked or bot removed',
          error_type: ERROR_TYPES.CHAT_BLOCKED,
          retry_recommended: false
        }
      }
      return {
        error: 'Bot access forbidden',
        error_type: ERROR_TYPES.API_ERROR,
        retry_recommended: false
      }

    case 401: // Unauthorized - Invalid token
      return {
        error: 'Invalid bot token',
        error_type: ERROR_TYPES.INVALID_TOKEN,
        retry_recommended: false
      }

    case 400: // Bad Request
      if (description.includes('chat not found')) {
        return {
          error: 'Chat not found',
          error_type: ERROR_TYPES.CHAT_BLOCKED,
          retry_recommended: false
        }
      }
      return {
        error: `Bad request: ${description}`,
        error_type: ERROR_TYPES.API_ERROR,
        retry_recommended: false
      }

    case 500:
    case 502:
    case 503:
    case 504: // Server errors
      return {
        error: `Telegram server error: ${description}`,
        error_type: ERROR_TYPES.NETWORK_ERROR,
        retry_recommended: true
      }

    default:
      return {
        error: `Telegram API error: ${description}`,
        error_type: ERROR_TYPES.UNKNOWN,
        retry_recommended: true
      }
  }
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Log successful message send
 */
async function logMessageSent(
  chatId: string,
  messageId: number,
  options: SendOptions
): Promise<void> {
  try {
    await supabaseAdmin
      .from('telegram_notifications')
      .insert({
        chat_id: chatId,
        message_id: messageId,
        notification_type: options.notification_type || 'manual',
        success: true,
        data: options.data || {},
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging message send:', error)
  }
}

/**
 * Log broadcast summary
 */
async function logBroadcastSummary(
  results: BroadcastResult,
  options: SendOptions
): Promise<void> {
  try {
    await supabaseAdmin
      .from('telegram_broadcasts')
      .insert({
        notification_type: options.notification_type || 'broadcast',
        total_recipients: results.summary.total_recipients,
        successful_sends: results.successful_sends.length,
        failed_sends: results.failed_sends.length,
        success_rate: results.summary.success_rate,
        data: options.data || {},
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging broadcast summary:', error)
  }
}

// ===========================================
// ADVANCED SENDING FEATURES
// ===========================================

/**
 * Send message with inline keyboard
 */
export async function sendMessageWithKeyboard(
  chatId: string,
  message: string,
  keyboard: any[][],
  options: SendOptions = {}
): Promise<SendResult> {
  const keyboardMarkup = {
    inline_keyboard: keyboard
  }

  return await sendTelegramMessage(chatId, message, {
    ...options,
    reply_markup: keyboardMarkup
  })
}

/**
 * Send photo with caption
 */
export async function sendPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string,
  options: SendOptions = {}
): Promise<SendResult> {
  try {
    const botConfig = await getBotConfig()
    if (!botConfig.is_configured || !botConfig.bot_token) {
      return {
        success: false,
        error: 'Bot not configured',
        retry_recommended: false
      }
    }

    const photoData = {
      chat_id: chatId,
      photo: photoUrl,
      ...(caption && { caption }),
      parse_mode: options.parse_mode || 'Markdown',
      disable_notification: options.disable_notification || false
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${botConfig.bot_token}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(photoData)
    })

    const responseData = await response.json()

    if (response.ok && responseData.ok) {
      await logMessageSent(chatId, responseData.result.message_id, options)
      
      return {
        success: true,
        message_id: responseData.result.message_id
      }
    }

    const errorResult = handleTelegramError(responseData, response.status)
    return {
      success: false,
      error: errorResult.error,
      retry_recommended: errorResult.retry_recommended
    }

  } catch (error) {
    console.error('Error sending photo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send photo',
      retry_recommended: true
    }
  }
}

/**
 * Send document/file
 */
export async function sendDocument(
  chatId: string,
  documentUrl: string,
  caption?: string,
  options: SendOptions = {}
): Promise<SendResult> {
  try {
    const botConfig = await getBotConfig()
    if (!botConfig.is_configured || !botConfig.bot_token) {
      return {
        success: false,
        error: 'Bot not configured',
        retry_recommended: false
      }
    }

    const documentData = {
      chat_id: chatId,
      document: documentUrl,
      ...(caption && { caption }),
      parse_mode: options.parse_mode || 'Markdown',
      disable_notification: options.disable_notification || false
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${botConfig.bot_token}/sendDocument`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(documentData)
    })

    const responseData = await response.json()

    if (response.ok && responseData.ok) {
      await logMessageSent(chatId, responseData.result.message_id, options)
      
      return {
        success: true,
        message_id: responseData.result.message_id
      }
    }

    const errorResult = handleTelegramError(responseData, response.status)
    return {
      success: false,
      error: errorResult.error,
      retry_recommended: errorResult.retry_recommended
    }

  } catch (error) {
    console.error('Error sending document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send document',
      retry_recommended: true
    }
  }
}

/**
 * Delete message
 */
export async function deleteMessage(
  chatId: string,
  messageId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const botConfig = await getBotConfig()
    if (!botConfig.is_configured || !botConfig.bot_token) {
      return {
        success: false,
        error: 'Bot not configured'
      }
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${botConfig.bot_token}/deleteMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId
      })
    })

    const responseData = await response.json()

    if (response.ok && responseData.ok) {
      return { success: true }
    }

    return {
      success: false,
      error: responseData.description || 'Failed to delete message'
    }

  } catch (error) {
    console.error('Error deleting message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete message'
    }
  }
}

/**
 * Get chat member info
 */
export async function getChatMember(
  chatId: string,
  userId: number
): Promise<{
  success: boolean
  member_info?: any
  error?: string
}> {
  try {
    const botConfig = await getBotConfig()
    if (!botConfig.is_configured || !botConfig.bot_token) {
      return {
        success: false,
        error: 'Bot not configured'
      }
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${botConfig.bot_token}/getChatMember`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId
      })
    })

    const responseData = await response.json()

    if (response.ok && responseData.ok) {
      return {
        success: true,
        member_info: responseData.result
      }
    }

    return {
      success: false,
      error: responseData.description || 'Failed to get chat member'
    }

  } catch (error) {
    console.error('Error getting chat member:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chat member'
    }
  }
}

/**
 * Send bulk messages with smart batching
 */
export async function sendBulkMessages(
  messages: Array<{
    chat_id: string
    message: string
    options?: SendOptions
  }>
): Promise<{
  total_processed: number
  successful_sends: number
  failed_sends: number
  results: SendResult[]
}> {
  const results: SendResult[] = []
  let successful = 0
  let failed = 0

  // Process in batches to respect rate limits
  const batchSize = 3
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(async (msg) => {
        const result = await sendTelegramMessage(
          msg.chat_id,
          msg.message,
          msg.options || {}
        )
        
        if (result.success) {
          successful++
        } else {
          failed++
        }
        
        return result
      })
    )

    results.push(...batchResults)

    // Add delay between batches
    if (i + batchSize < messages.length) {
      await sleep(1000) // 1 second delay
    }
  }

  return {
    total_processed: messages.length,
    successful_sends: successful,
    failed_sends: failed,
    results
  }
}