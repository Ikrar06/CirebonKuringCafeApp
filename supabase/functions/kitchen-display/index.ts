/**
 * Kitchen Display Edge Function
 * 
 * Provides real-time data specifically formatted for kitchen displays
 * Optimized for tablet and TV displays with visual priority indicators
 * 
 * @endpoints
 * GET  /kitchen-display/orders - Get formatted orders for display
 * GET  /kitchen-display/queue - Get order queue with timers
 * GET  /kitchen-display/stats - Get kitchen performance metrics
 * POST /kitchen-display/settings - Update display preferences
 * GET  /kitchen-display/tv-mode - Get data optimized for TV display
 */

import { withCors } from '../_shared/cors'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createUnauthorizedResponse,
  parseJsonBody,
  createHandler
} from '../_shared/response'
import { 
  supabaseAdmin, 
  validateDeviceAuth,
  getCafeSettings
} from '../_shared/supabase-client'

// Kitchen display interfaces
interface KitchenDisplayOrder {
  id: string
  order_number: string
  table_number: number
  customer_name: string
  status: 'confirmed' | 'preparing' | 'ready'
  priority: 'normal' | 'high' | 'urgent'
  order_time: string
  prep_time_elapsed: number
  estimated_time_remaining: number
  is_overdue: boolean
  urgency_color: 'green' | 'yellow' | 'orange' | 'red'
  items: KitchenDisplayItem[]
  special_instructions?: string
  total_prep_time: number
}

interface KitchenDisplayItem {
  id: string
  name: string
  category: string
  quantity: number
  status: 'pending' | 'preparing' | 'completed'
  prep_time: number
  customizations: string[]
  notes?: string
  progress_percentage: number
  assigned_station?: string
}

interface KitchenQueue {
  confirmed_orders: KitchenDisplayOrder[]
  preparing_orders: KitchenDisplayOrder[]
  ready_orders: KitchenDisplayOrder[]
  queue_stats: {
    total_orders: number
    total_items: number
    average_wait_time: number
    next_completion_time?: string
    overdue_count: number
  }
}

interface KitchenMetrics {
  current_performance: {
    orders_per_hour: number
    average_prep_time: number
    on_time_percentage: number
    efficiency_score: number
  }
  real_time_stats: {
    active_orders: number
    pending_items: number
    overdue_orders: number
    staff_count: number
  }
  trend_data: {
    last_hour_completed: number
    peak_time_indicator: boolean
    rush_status: 'low' | 'medium' | 'high' | 'extreme'
  }
}

interface DisplaySettings {
  auto_refresh_interval: number
  show_customer_names: boolean
  show_prep_times: boolean
  color_coding_enabled: boolean
  sound_alerts_enabled: boolean
  tv_mode_enabled: boolean
  display_theme: 'light' | 'dark' | 'high_contrast'
  font_size: 'small' | 'medium' | 'large' | 'extra_large'
}

// Color coding for urgency
const URGENCY_COLORS = {
  normal: 'green',
  attention: 'yellow', 
  urgent: 'orange',
  critical: 'red'
} as const

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Get formatted orders for kitchen display
 */
async function handleGetDisplayOrders(request: Request): Promise<Response> {
  try {
    // Authenticate kitchen device
    const authResult = await authenticateKitchenDisplay(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Parse query parameters
    const url = new URL(request.url)
    const includeCompleted = url.searchParams.get('include_completed') === 'true'
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50'))
    const tvMode = url.searchParams.get('tv_mode') === 'true'

    // Get active orders
    const orders = await getKitchenDisplayOrders(includeCompleted, limit)

    // Format for display
    const displayOrders = orders.map(order => formatOrderForDisplay(order, tvMode))

    // Sort by priority and time
    displayOrders.sort((a, b) => {
      // Priority first
      const priorityOrder = { urgent: 3, high: 2, normal: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by prep time elapsed (longest first)
      return b.prep_time_elapsed - a.prep_time_elapsed
    })

    return createSuccessResponse(
      {
        orders: displayOrders,
        display_metadata: {
          total_orders: displayOrders.length,
          overdue_orders: displayOrders.filter(o => o.is_overdue).length,
          urgent_orders: displayOrders.filter(o => o.priority === 'urgent').length,
          refresh_interval: 30, // seconds
          last_updated: new Date().toISOString()
        }
      },
      'Kitchen display orders retrieved',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetDisplayOrders:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get order queue with timing information
 */
async function handleGetOrderQueue(request: Request): Promise<Response> {
  try {
    // Authenticate kitchen device
    const authResult = await authenticateKitchenDisplay(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get orders by status
    const [confirmedOrders, preparingOrders, readyOrders] = await Promise.all([
      getOrdersByStatus('confirmed'),
      getOrdersByStatus('preparing'),
      getOrdersByStatus('ready')
    ])

    // Calculate queue statistics
    const queueStats = calculateQueueStats([
      ...confirmedOrders,
      ...preparingOrders,
      ...readyOrders
    ])

    const queue: KitchenQueue = {
      confirmed_orders: confirmedOrders.map(order => formatOrderForDisplay(order, false)),
      preparing_orders: preparingOrders.map(order => formatOrderForDisplay(order, false)),
      ready_orders: readyOrders.map(order => formatOrderForDisplay(order, false)),
      queue_stats: queueStats
    }

    return createSuccessResponse(
      queue,
      'Kitchen queue retrieved',
      {
        queue_health: queueStats.overdue_count === 0 ? 'good' : 
                      queueStats.overdue_count <= 2 ? 'warning' : 'critical'
      },
      request
    )

  } catch (error) {
    console.error('Error in handleGetOrderQueue:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get kitchen performance metrics
 */
async function handleGetKitchenMetrics(request: Request): Promise<Response> {
  try {
    // Authenticate kitchen device
    const authResult = await authenticateKitchenDisplay(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    const metrics = await calculateKitchenMetrics()

    return createSuccessResponse(
      metrics,
      'Kitchen metrics retrieved',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetKitchenMetrics:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get TV mode optimized display
 */
async function handleGetTVModeDisplay(request: Request): Promise<Response> {
  try {
    // Authenticate kitchen device
    const authResult = await authenticateKitchenDisplay(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get orders optimized for TV display
    const orders = await getKitchenDisplayOrders(false, 20) // Limit for TV display
    const displayOrders = orders.map(order => formatOrderForDisplay(order, true))

    // Get metrics for TV dashboard
    const metrics = await calculateKitchenMetrics()

    // Format for large screen display
    const tvDisplay = {
      primary_orders: displayOrders.slice(0, 8), // Main focus orders
      secondary_orders: displayOrders.slice(8, 16), // Background queue
      metrics_summary: {
        total_active: displayOrders.length,
        overdue_count: displayOrders.filter(o => o.is_overdue).length,
        average_prep_time: metrics.current_performance.average_prep_time,
        rush_status: metrics.trend_data.rush_status
      },
      display_config: {
        theme: 'dark', // Better for kitchen environment
        font_size: 'large',
        highlight_overdue: true,
        show_timers: true,
        auto_refresh: 15 // seconds
      },
      current_time: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    return createSuccessResponse(
      tvDisplay,
      'TV mode display data retrieved',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetTVModeDisplay:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Update display settings
 */
async function handleUpdateDisplaySettings(request: Request): Promise<Response> {
  try {
    // Authenticate kitchen device
    const authResult = await authenticateKitchenDisplay(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const settings = body as Partial<DisplaySettings>

    // Update display settings in system_settings
    const settingsToUpdate = [
      { key: 'kitchen_display_auto_refresh', value: settings.auto_refresh_interval },
      { key: 'kitchen_display_show_names', value: settings.show_customer_names },
      { key: 'kitchen_display_show_times', value: settings.show_prep_times },
      { key: 'kitchen_display_color_coding', value: settings.color_coding_enabled },
      { key: 'kitchen_display_sound_alerts', value: settings.sound_alerts_enabled },
      { key: 'kitchen_display_tv_mode', value: settings.tv_mode_enabled },
      { key: 'kitchen_display_theme', value: settings.display_theme },
      { key: 'kitchen_display_font_size', value: settings.font_size }
    ].filter(setting => setting.value !== undefined)

    for (const setting of settingsToUpdate) {
      await supabaseAdmin
        .from('system_settings')
        .upsert({
          key: setting.key,
          value: setting.value,
          updated_at: new Date().toISOString()
        })
    }

    return createSuccessResponse(
      { updated_settings: settings },
      'Display settings updated successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleUpdateDisplaySettings:', error)
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
 * Get kitchen display orders
 */
async function getKitchenDisplayOrders(includeCompleted: boolean = false, limit: number = 50) {
  const statuses = includeCompleted 
    ? ['confirmed', 'preparing', 'ready', 'served']
    : ['confirmed', 'preparing', 'ready']

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, status, priority_level, customer_name,
      created_at, confirmed_at, actual_start_time, actual_completion_time,
      estimated_completion_time, special_instructions,
      tables(table_number),
      order_items(
        id, quantity, status, started_at, completed_at, notes,
        menu_items(
          id, name, category, preparation_time
        ),
        order_customizations(
          value,
          menu_customization_options(name)
        )
      )
    `)
    .in('status', statuses)
    .order('priority_level', { ascending: false })
    .order('confirmed_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw error
  }

  return orders || []
}

/**
 * Get orders by specific status
 */
async function getOrdersByStatus(status: string) {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, status, priority_level, customer_name,
      created_at, confirmed_at, actual_start_time,
      tables(table_number),
      order_items(
        id, quantity, status,
        menu_items(name, category, preparation_time)
      )
    `)
    .eq('status', status)
    .order('confirmed_at', { ascending: true })
    .limit(20)

  if (error) {
    throw error
  }

  return orders || []
}

/**
 * Format order for kitchen display
 */
function formatOrderForDisplay(order: any, tvMode: boolean = false): KitchenDisplayOrder {
  const now = new Date()
  const orderTime = new Date(order.confirmed_at || order.created_at)
  const startTime = order.actual_start_time ? new Date(order.actual_start_time) : null
  
  // Calculate elapsed time
  const prepTimeElapsed = startTime ? 
    Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60) : 0

  // Calculate total preparation time for all items
  const totalPrepTime = order.order_items.reduce(
    (sum: number, item: any) => sum + (item.menu_items.preparation_time * item.quantity), 0
  )

  // Calculate estimated time remaining
  const estimatedTimeRemaining = Math.max(0, totalPrepTime - prepTimeElapsed)

  // Determine if order is overdue
  const isOverdue = prepTimeElapsed > totalPrepTime + 5 // 5 minute grace period

  // Determine urgency and color
  const { urgency, color } = calculateUrgency(order, prepTimeElapsed, totalPrepTime, isOverdue)

  // Format items
  const items: KitchenDisplayItem[] = order.order_items.map((item: any) => {
    const customizations = item.order_customizations?.map((custom: any) => 
      `${custom.menu_customization_options?.name}: ${custom.value}`
    ) || []

    // Calculate progress percentage for item
    const itemPrepTime = item.menu_items.preparation_time
    const itemElapsed = item.started_at ? 
      Math.floor((now.getTime() - new Date(item.started_at).getTime()) / 1000 / 60) : 0
    const progressPercentage = item.status === 'completed' ? 100 :
      item.status === 'preparing' ? Math.min(95, (itemElapsed / itemPrepTime) * 100) : 0

    return {
      id: item.id,
      name: tvMode ? item.menu_items.name : `${item.quantity}x ${item.menu_items.name}`,
      category: item.menu_items.category,
      quantity: item.quantity,
      status: item.status || 'pending',
      prep_time: itemPrepTime,
      customizations: tvMode ? [] : customizations, // Hide customizations in TV mode for space
      notes: tvMode ? undefined : item.notes,
      progress_percentage: progressPercentage,
      assigned_station: getCookingStation(item.menu_items.category)
    }
  })

  return {
    id: order.id,
    order_number: order.order_number,
    table_number: order.tables?.table_number || 0,
    customer_name: tvMode ? order.customer_name.split(' ')[0] : order.customer_name, // First name only for TV
    status: order.status,
    priority: urgency,
    order_time: orderTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    prep_time_elapsed: prepTimeElapsed,
    estimated_time_remaining: estimatedTimeRemaining,
    is_overdue: isOverdue,
    urgency_color: color,
    items,
    special_instructions: tvMode ? undefined : order.special_instructions,
    total_prep_time: totalPrepTime
  }
}

/**
 * Calculate order urgency and color coding
 */
function calculateUrgency(order: any, elapsed: number, totalTime: number, isOverdue: boolean) {
  const completionPercentage = totalTime > 0 ? (elapsed / totalTime) * 100 : 0
  
  let urgency: 'normal' | 'high' | 'urgent' = 'normal'
  let color: keyof typeof URGENCY_COLORS = 'normal'

  // Base priority from order
  if (order.priority_level === 'high') {
    urgency = 'high'
    color = 'attention'
  } else if (order.priority_level === 'urgent') {
    urgency = 'urgent'
    color = 'urgent'
  }

  // Escalate based on time
  if (isOverdue) {
    urgency = 'urgent'
    color = 'critical'
  } else if (completionPercentage > 90) {
    urgency = 'urgent'
    color = 'urgent'
  } else if (completionPercentage > 75) {
    urgency = 'high'
    color = 'attention'
  }

  return { urgency, color: URGENCY_COLORS[color] }
}

/**
 * Get cooking station based on category
 */
function getCookingStation(category: string): string {
  const stationMap: Record<string, string> = {
    'coffee': 'Coffee Station',
    'beverage': 'Beverage Station',
    'food': 'Hot Kitchen',
    'snack': 'Cold Prep',
    'dessert': 'Dessert Station'
  }
  
  return stationMap[category] || 'General Station'
}

/**
 * Calculate queue statistics
 */
function calculateQueueStats(orders: any[]) {
  const totalOrders = orders.length
  const totalItems = orders.reduce((sum, order) => sum + order.order_items.length, 0)
  const overdueCount = orders.filter(order => {
    const startTime = order.actual_start_time ? new Date(order.actual_start_time) : null
    if (!startTime) return false
    
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60)
    const totalPrepTime = order.order_items.reduce(
      (sum: number, item: any) => sum + item.menu_items.preparation_time, 0
    )
    
    return elapsed > totalPrepTime + 5
  }).length

  // Calculate average wait time for confirmed orders
  const confirmedOrders = orders.filter(order => order.status === 'confirmed')
  const avgWaitTime = confirmedOrders.length > 0 ? 
    confirmedOrders.reduce((sum, order) => {
      const waitTime = Math.floor((Date.now() - new Date(order.confirmed_at).getTime()) / 1000 / 60)
      return sum + waitTime
    }, 0) / confirmedOrders.length : 0

  // Find next completion time
  const preparingOrders = orders.filter(order => order.status === 'preparing')
  let nextCompletionTime: string | undefined

  if (preparingOrders.length > 0) {
    const soonestCompletion = preparingOrders.reduce((earliest, order) => {
      const startTime = new Date(order.actual_start_time)
      const totalPrepTime = order.order_items.reduce(
        (sum: number, item: any) => sum + item.menu_items.preparation_time, 0
      )
      const estimatedCompletion = new Date(startTime.getTime() + totalPrepTime * 60000)
      
      return !earliest || estimatedCompletion < earliest ? estimatedCompletion : earliest
    }, null as Date | null)

    if (soonestCompletion) {
      nextCompletionTime = soonestCompletion.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  return {
    total_orders: totalOrders,
    total_items: totalItems,
    average_wait_time: Math.round(avgWaitTime),
    next_completion_time: nextCompletionTime,
    overdue_count: overdueCount
  }
}

/**
 * Calculate kitchen performance metrics
 */
async function calculateKitchenMetrics(): Promise<KitchenMetrics> {
  try {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get completed orders in last hour
    const { data: lastHourOrders } = await supabaseAdmin
      .from('orders')
      .select('actual_start_time, actual_completion_time')
      .eq('status', 'completed')
      .gte('actual_completion_time', oneHourAgo.toISOString())
      .not('actual_start_time', 'is', null)
      .not('actual_completion_time', 'is', null)

    // Get active orders
    const { data: activeOrders } = await supabaseAdmin
      .from('orders')
      .select('id, status, order_items(id, status)')
      .in('status', ['confirmed', 'preparing', 'ready'])

    // Calculate metrics
    const ordersPerHour = lastHourOrders?.length || 0
    
    let averagePrepTime = 0
    if (lastHourOrders && lastHourOrders.length > 0) {
      const totalPrepTime = lastHourOrders.reduce((sum, order) => {
        const start = new Date(order.actual_start_time!).getTime()
        const end = new Date(order.actual_completion_time!).getTime()
        return sum + (end - start)
      }, 0)
      averagePrepTime = Math.round(totalPrepTime / lastHourOrders.length / 1000 / 60)
    }

    const activeOrdersCount = activeOrders?.length || 0
    const pendingItems = activeOrders?.reduce((sum, order) => 
      sum + order.order_items.filter((item: any) => item.status !== 'completed').length, 0
    ) || 0

    // Determine rush status
    let rushStatus: 'low' | 'medium' | 'high' | 'extreme' = 'low'
    if (activeOrdersCount >= 20) rushStatus = 'extreme'
    else if (activeOrdersCount >= 15) rushStatus = 'high'
    else if (activeOrdersCount >= 8) rushStatus = 'medium'

    return {
      current_performance: {
        orders_per_hour: ordersPerHour,
        average_prep_time: averagePrepTime,
        on_time_percentage: 90, // TODO: Calculate actual on-time percentage
        efficiency_score: Math.min(100, Math.max(0, 100 - (activeOrdersCount * 2)))
      },
      real_time_stats: {
        active_orders: activeOrdersCount,
        pending_items: pendingItems,
        overdue_orders: 0, // TODO: Calculate overdue orders
        staff_count: 3 // TODO: Get actual staff count from attendance
      },
      trend_data: {
        last_hour_completed: ordersPerHour,
        peak_time_indicator: ordersPerHour > 10,
        rush_status: rushStatus
      }
    }

  } catch (error) {
    console.error('Error calculating kitchen metrics:', error)
    // Return default values on error
    return {
      current_performance: {
        orders_per_hour: 0,
        average_prep_time: 0,
        on_time_percentage: 0,
        efficiency_score: 0
      },
      real_time_stats: {
        active_orders: 0,
        pending_items: 0,
        overdue_orders: 0,
        staff_count: 0
      },
      trend_data: {
        last_hour_completed: 0,
        peak_time_indicator: false,
        rush_status: 'low'
      }
    }
  }
}

/**
 * Authenticate kitchen display access
 */
async function authenticateKitchenDisplay(request: Request): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Try device authentication (kitchen tablet)
    const deviceId = request.headers.get('X-Device-ID')
    const deviceRole = request.headers.get('X-Device-Role')

    if (deviceId && deviceRole === 'dapur') {
      const deviceAccount = await validateDeviceAuth(deviceId, 'dapur')
      if (deviceAccount) {
        return { success: true }
      }
    }

    // Allow owner access
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      
      if (user) {
        const { data: employee } = await supabaseAdmin
          .from('employees')
          .select('position')
          .eq('user_id', user.id)
          .single()

        if (employee && ['owner', 'dapur'].includes(employee.position)) {
          return { success: true }
        }
      }
    }

    return {
      success: false,
      error: 'Unauthorized. Kitchen display access required.'
    }

  } catch (error) {
    console.error('Error authenticating kitchen display:', error)
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
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/orders')) {
      return handleGetDisplayOrders(request)
    } else if (url.pathname.includes('/queue')) {
      return handleGetOrderQueue(request)
    } else if (url.pathname.includes('/stats')) {
      return handleGetKitchenMetrics(request)
    } else if (url.pathname.includes('/tv-mode')) {
      return handleGetTVModeDisplay(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  POST: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/settings')) {
      return handleUpdateDisplaySettings(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler