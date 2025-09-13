/**
 * Telegram Bot Configuration
 * 
 * Manages bot token, configuration validation, and bot information
 * Provides utilities for bot setup and health checking
 */

import { supabaseAdmin } from '../_shared/supabase-client'

// Bot configuration interfaces
export interface BotConfig {
  is_configured: boolean
  bot_token?: string
  bot_username?: string
  bot_id?: number
  last_updated?: string
  webhook_url?: string
  webhook_configured: boolean
}

export interface BotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username: string
  can_join_groups: boolean
  can_read_all_group_messages: boolean
  supports_inline_queries: boolean
}

// Telegram API endpoints
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

/**
 * Get bot configuration from environment and database
 */
export async function getBotConfig(): Promise<BotConfig> {
  try {
    // Get bot token from environment
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!botToken) {
      return {
        is_configured: false,
        webhook_configured: false
      }
    }

    // Get additional config from database
    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', ['telegram_bot_username', 'telegram_bot_id', 'telegram_webhook_url', 'telegram_last_updated'])

    const settingsMap = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, any>) || {}

    // Validate token format
    const isValidToken = validateBotToken(botToken)

    return {
      is_configured: isValidToken,
      bot_token: botToken,
      bot_username: settingsMap.telegram_bot_username,
      bot_id: settingsMap.telegram_bot_id ? parseInt(settingsMap.telegram_bot_id) : undefined,
      last_updated: settingsMap.telegram_last_updated,
      webhook_url: settingsMap.telegram_webhook_url,
      webhook_configured: !!settingsMap.telegram_webhook_url
    }

  } catch (error) {
    console.error('Error getting bot config:', error)
    return {
      is_configured: false,
      webhook_configured: false
    }
  }
}

/**
 * Validate bot token format
 */
export function validateBotToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  // Telegram bot token format: {bot_id}:{token}
  // Example: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
  const tokenPattern = /^\d{8,10}:[A-Za-z0-9_-]{35}$/
  return tokenPattern.test(token)
}

/**
 * Get bot information from Telegram API
 */
export async function getBotInfo(botToken?: string): Promise<{
  success: boolean
  bot_info?: BotInfo
  error?: string
}> {
  try {
    const token = botToken || Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!token) {
      return {
        success: false,
        error: 'Bot token not configured'
      }
    }

    if (!validateBotToken(token)) {
      return {
        success: false,
        error: 'Invalid bot token format'
      }
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getMe`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.description || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()

    if (!data.ok) {
      return {
        success: false,
        error: data.description || 'Telegram API error'
      }
    }

    const botInfo: BotInfo = {
      id: data.result.id,
      is_bot: data.result.is_bot,
      first_name: data.result.first_name,
      username: data.result.username,
      can_join_groups: data.result.can_join_groups,
      can_read_all_group_messages: data.result.can_read_all_group_messages,
      supports_inline_queries: data.result.supports_inline_queries
    }

    // Update bot info in database
    await updateBotInfo(botInfo)

    return {
      success: true,
      bot_info: botInfo
    }

  } catch (error) {
    console.error('Error getting bot info:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get bot info'
    }
  }
}

/**
 * Update bot information in database
 */
async function updateBotInfo(botInfo: BotInfo): Promise<void> {
  try {
    const updates = [
      { key: 'telegram_bot_username', value: botInfo.username },
      { key: 'telegram_bot_id', value: botInfo.id.toString() },
      { key: 'telegram_last_updated', value: new Date().toISOString() }
    ]

    for (const update of updates) {
      await supabaseAdmin
        .from('system_settings')
        .upsert({
          key: update.key,
          value: update.value,
          updated_at: new Date().toISOString()
        })
    }

  } catch (error) {
    console.error('Error updating bot info:', error)
  }
}

/**
 * Set webhook URL for the bot
 */
export async function setWebhook(webhookUrl: string, botToken?: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const token = botToken || Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!token) {
      return {
        success: false,
        error: 'Bot token not configured'
      }
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    })

    const data = await response.json()

    if (!data.ok) {
      return {
        success: false,
        error: data.description || 'Failed to set webhook'
      }
    }

    // Update webhook URL in database
    await supabaseAdmin
      .from('system_settings')
      .upsert({
        key: 'telegram_webhook_url',
        value: webhookUrl,
        updated_at: new Date().toISOString()
      })

    return { success: true }

  } catch (error) {
    console.error('Error setting webhook:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Webhook setup failed'
    }
  }
}

/**
 * Remove webhook (use polling instead)
 */
export async function deleteWebhook(botToken?: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const token = botToken || Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!token) {
      return {
        success: false,
        error: 'Bot token not configured'
      }
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/deleteWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        drop_pending_updates: true
      })
    })

    const data = await response.json()

    if (!data.ok) {
      return {
        success: false,
        error: data.description || 'Failed to delete webhook'
      }
    }

    // Remove webhook URL from database
    await supabaseAdmin
      .from('system_settings')
      .delete()
      .eq('key', 'telegram_webhook_url')

    return { success: true }

  } catch (error) {
    console.error('Error deleting webhook:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Webhook deletion failed'
    }
  }
}

/**
 * Get webhook info
 */
export async function getWebhookInfo(botToken?: string): Promise<{
  success: boolean
  webhook_info?: any
  error?: string
}> {
  try {
    const token = botToken || Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!token) {
      return {
        success: false,
        error: 'Bot token not configured'
      }
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getWebhookInfo`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!data.ok) {
      return {
        success: false,
        error: data.description || 'Failed to get webhook info'
      }
    }

    return {
      success: true,
      webhook_info: data.result
    }

  } catch (error) {
    console.error('Error getting webhook info:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get webhook info'
    }
  }
}

/**
 * Validate bot permissions and capabilities
 */
export async function validateBotPermissions(botToken?: string): Promise<{
  success: boolean
  permissions: {
    can_send_messages: boolean
    can_send_photos: boolean
    can_send_documents: boolean
    can_use_inline_keyboard: boolean
  }
  warnings: string[]
  error?: string
}> {
  try {
    const token = botToken || Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!token) {
      return {
        success: false,
        permissions: {
          can_send_messages: false,
          can_send_photos: false,
          can_send_documents: false,
          can_use_inline_keyboard: false
        },
        warnings: [],
        error: 'Bot token not configured'
      }
    }

    // Get bot info to check basic capabilities
    const botInfoResult = await getBotInfo(token)
    
    if (!botInfoResult.success) {
      return {
        success: false,
        permissions: {
          can_send_messages: false,
          can_send_photos: false,
          can_send_documents: false,
          can_use_inline_keyboard: false
        },
        warnings: [],
        error: botInfoResult.error
      }
    }

    const warnings: string[] = []
    
    // Check if bot can join groups (useful for future features)
    if (!botInfoResult.bot_info?.can_join_groups) {
      warnings.push('Bot cannot join groups - some future features may be limited')
    }

    // Check if bot supports inline queries
    if (!botInfoResult.bot_info?.supports_inline_queries) {
      warnings.push('Bot does not support inline queries')
    }

    // For now, assume basic permissions are available
    // In a real implementation, you might test these by sending to a test chat
    const permissions = {
      can_send_messages: true,
      can_send_photos: true,
      can_send_documents: true,
      can_use_inline_keyboard: true
    }

    return {
      success: true,
      permissions,
      warnings
    }

  } catch (error) {
    console.error('Error validating bot permissions:', error)
    return {
      success: false,
      permissions: {
        can_send_messages: false,
        can_send_photos: false,
        can_send_documents: false,
        can_use_inline_keyboard: false
      },
      warnings: [],
      error: error instanceof Error ? error.message : 'Permission validation failed'
    }
  }
}

/**
 * Initialize bot configuration
 */
export async function initializeBotConfig(): Promise<{
  success: boolean
  bot_info?: BotInfo
  warnings?: string[]
  error?: string
}> {
  try {
    // Get bot token from environment
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!botToken) {
      return {
        success: false,
        error: 'TELEGRAM_BOT_TOKEN environment variable not set'
      }
    }

    // Validate token format
    if (!validateBotToken(botToken)) {
      return {
        success: false,
        error: 'Invalid bot token format'
      }
    }

    // Get bot information
    const botInfoResult = await getBotInfo(botToken)
    
    if (!botInfoResult.success) {
      return {
        success: false,
        error: `Failed to get bot info: ${botInfoResult.error}`
      }
    }

    // Validate permissions
    const permissionsResult = await validateBotPermissions(botToken)
    
    if (!permissionsResult.success) {
      return {
        success: false,
        error: `Permission validation failed: ${permissionsResult.error}`
      }
    }

    // Check webhook status
    const webhookResult = await getWebhookInfo(botToken)
    let webhookWarnings: string[] = []
    
    if (webhookResult.success && webhookResult.webhook_info) {
      const webhook = webhookResult.webhook_info
      
      if (webhook.url && webhook.pending_update_count > 0) {
        webhookWarnings.push(`Webhook has ${webhook.pending_update_count} pending updates`)
      }
      
      if (webhook.last_error_date) {
        const errorDate = new Date(webhook.last_error_date * 1000)
        webhookWarnings.push(`Last webhook error: ${webhook.last_error_message} at ${errorDate.toISOString()}`)
      }
    }

    return {
      success: true,
      bot_info: botInfoResult.bot_info,
      warnings: [...(permissionsResult.warnings || []), ...webhookWarnings]
    }

  } catch (error) {
    console.error('Error initializing bot config:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bot initialization failed'
    }
  }
}

/**
 * Test bot configuration with a simple API call
 */
export async function testBotConfiguration(): Promise<{
  success: boolean
  response_time_ms?: number
  bot_info?: BotInfo
  error?: string
}> {
  try {
    const startTime = Date.now()
    
    const botInfoResult = await getBotInfo()
    
    const responseTime = Date.now() - startTime

    if (botInfoResult.success) {
      return {
        success: true,
        response_time_ms: responseTime,
        bot_info: botInfoResult.bot_info
      }
    } else {
      return {
        success: false,
        error: botInfoResult.error
      }
    }

  } catch (error) {
    console.error('Error testing bot configuration:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Configuration test failed'
    }
  }
}

/**
 * Get bot configuration summary for dashboard
 */
export async function getBotConfigSummary(): Promise<{
  status: 'configured' | 'partially_configured' | 'not_configured'
  bot_username?: string
  last_activity?: string
  issues: string[]
  recommendations: string[]
}> {
  try {
    const config = await getBotConfig()
    const issues: string[] = []
    const recommendations: string[] = []

    if (!config.is_configured) {
      return {
        status: 'not_configured',
        issues: ['Bot token not configured'],
        recommendations: [
          'Set TELEGRAM_BOT_TOKEN environment variable',
          'Create bot via @BotFather on Telegram',
          'Test bot configuration'
        ]
      }
    }

    // Test bot connection
    const testResult = await testBotConfiguration()
    
    if (!testResult.success) {
      issues.push('Bot connection test failed')
      recommendations.push('Check bot token validity')
      recommendations.push('Verify network connectivity')
    }

    // Check for recent activity
    const { data: recentNotifications } = await supabaseAdmin
      .from('telegram_notifications')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)

    const lastActivity = recentNotifications?.[0]?.created_at

    // Determine status
    let status: 'configured' | 'partially_configured' | 'not_configured' = 'configured'
    
    if (issues.length > 0) {
      status = 'partially_configured'
    }

    if (!config.webhook_configured) {
      recommendations.push('Consider setting up webhook for better performance')
    }

    return {
      status,
      bot_username: config.bot_username,
      last_activity: lastActivity,
      issues,
      recommendations
    }

  } catch (error) {
    console.error('Error getting bot config summary:', error)
    return {
      status: 'not_configured',
      issues: ['Failed to check bot configuration'],
      recommendations: ['Check system logs for errors']
    }
  }
}