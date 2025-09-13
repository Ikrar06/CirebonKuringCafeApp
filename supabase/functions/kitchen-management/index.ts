/**
 * Kitchen Management Edge Function - Main Handler
 * 
 * Handles kitchen operations including order queue management,
 * preparation tracking, and kitchen staff coordination
 * 
 * @endpoints
 * GET  /kitchen-management/orders - Get kitchen order queue
 * POST /kitchen-management/start-prep/:orderId - Start preparing order
 * POST /kitchen-management/complete-item/:orderItemId - Complete order item
 * POST /kitchen-management/ready/:orderId - Mark order ready for pickup
 * GET  /kitchen-management/stats - Get kitchen performance stats
 */

import { withCors } from '../_shared/cors'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  parseJsonBody,
  createHandler
} from '../_shared/response'
import { 
  supabaseAdmin, 
  getAuthenticatedClient,
  validateDeviceAuth,
  logAudit 
} from '../_shared/supabase-client'
import { 
  validateFields,
  isPositiveInteger,
  sanitizeString
} from '../../../packages/utils/src/validators/index'

// Kitchen management interfaces
interface KitchenOrder {
  id: string
  order_number: string
  table_number: number
  customer_name: string
  status: 'confirmed' | 'preparing' | 'ready'
  priority_level: 'normal' | 'high' | 'urgent'
  estimated_completion_time: string
  actual_start_time?: string
  actual_completion_time?: string
  preparation_time_elapsed: number
  items: KitchenOrderItem[]
  special_instructions?: string
  created_at: string
  confirmed_at: string
}

interface KitchenOrderItem {
  id: string
  menu_item_name: string
  category: string
  quantity: number
  preparation_time: number
  status: 'pending' | 'preparing' | 'completed'
  customizations: string[]
  notes?: string
  started_at?: string
  completed_at?: string
  assigned_to?: string
}

interface KitchenStats {
  orders_in_queue: number
  orders_preparing: number
  orders_ready: number
  average_prep_time: number
  on_time_percentage: number
  items_pending: number
  items_preparing: number
  items_completed: number
  estimated_queue_time: number
}

interface StartPrepRequest {
  assigned_staff?: string
  estimated_time?: number
  priority_notes?: string
}

interface CompleteItemRequest {
  quality_check: boolean
  completion_notes?: string
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Get kitchen order queue with filtering and sorting
 */
async function handleGetKitchenOrders(request: Request): Promise<Response> {
  try {
    // Authenticate kitchen staff or owner
    const authResult = await authenticateKitchenAccess(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Parse query parameters
    const url = new URL(request.url)
    const status = url.searchParams.get('status') // confirmed, preparing, ready
    const priority = url.searchParams.get('priority') // normal, high, urgent
    const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20'))
    const tableNumber = url.searchParams.get('table')

    // Build query
    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, table_id, customer_name, status, priority_level,
        estimated_completion_time, actual_start_time, actual_completion_time,
        special_instructions, created_at, confirmed_at,
        tables(table_number),
        order_items(
          id, quantity, notes,
          menu_items(
            id, name, category, preparation_time
          ),
          order_customizations(
            customization_option_id,
            value,
            menu_customization_options(name)
          )
        )
      `)
      .in('status', ['confirmed', 'preparing', 'ready'])
      .order('priority_level', { ascending: false })
      .order('confirmed_at', { ascending: true })
      .limit(limit)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority_level', priority)
    }
    if (tableNumber) {
      query = query.eq('table_id', parseInt(tableNumber))
    }

    const { data: orders, error } = await query

    if (error) {
      throw error
    }

    // Process orders for kitchen display
    const kitchenOrders: KitchenOrder[] = (orders || []).map(order => {
      const items: KitchenOrderItem[] = order.order_items.map(item => {
        const customizations = item.order_customizations?.map(custom => 
          `${custom.menu_customization_options?.name}: ${custom.value}`
        ) || []

        return {
          id: item.id,
          menu_item_name: item.menu_items.name,
          category: item.menu_items.category,
          quantity: item.quantity,
          preparation_time: item.menu_items.preparation_time,
          status: item.status || 'pending',
          customizations,
          notes: item.notes,
          started_at: item.started_at,
          completed_at: item.completed_at,
          assigned_to: item.assigned_to
        }
      })

      // Calculate preparation time elapsed
      const startTime = order.actual_start_time ? new Date(order.actual_start_time) : null
      const prepTimeElapsed = startTime ? 
        Math.floor((Date.now() - startTime.getTime()) / 1000 / 60) : 0

      return {
        id: order.id,
        order_number: order.order_number,
        table_number: order.tables?.table_number || 0,
        customer_name: order.customer_name,
        status: order.status,
        priority_level: order.priority_level || 'normal',
        estimated_completion_time: order.estimated_completion_time,
        actual_start_time: order.actual_start_time,
        actual_completion_time: order.actual_completion_time,
        preparation_time_elapsed: prepTimeElapsed,
        items,
        special_instructions: order.special_instructions,
        created_at: order.created_at,
        confirmed_at: order.confirmed_at
      }
    })

    // Get kitchen statistics
    const stats = await calculateKitchenStats()

    return createSuccessResponse(
      {
        orders: kitchenOrders,
        stats,
        filters_applied: {
          status,
          priority,
          table_number: tableNumber,
          limit
        }
      },
      'Kitchen orders retrieved successfully',
      {
        total_orders: kitchenOrders.length,
        queue_time_estimate: `${stats.estimated_queue_time} minutes`
      },
      request
    )

  } catch (error) {
    console.error('Error in handleGetKitchenOrders:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Start preparing an order
 */
async function handleStartPreparation(request: Request): Promise<Response> {
  try {
    // Extract order ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.length - 1]

    if (!orderId) {
      return createErrorResponse('Order ID required', 400, undefined, request)
    }

    // Authenticate kitchen staff
    const authResult = await authenticateKitchenAccess(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Parse request body
    const body = await parseJsonBody(request) || {}
    const prepData = body as StartPrepRequest

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, status, table_id, customer_name,
        estimated_completion_time, priority_level
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return createNotFoundResponse('Order', request)
    }

    // Validate order status
    if (order.status !== 'confirmed') {
      return createErrorResponse(
        `Cannot start preparation for order with status: ${order.status}`,
        400,
        undefined,
        request
      )
    }

    // Update order status to preparing
    const now = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'preparing',
        actual_start_time: now,
        updated_at: now
      })
      .eq('id', orderId)

    if (updateError) {
      return createErrorResponse(
        'Failed to update order status',
        500,
        undefined,
        request
      )
    }

    // Update order items to preparing status
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .update({
        status: 'preparing',
        started_at: now,
        assigned_to: prepData.assigned_staff
      })
      .eq('order_id', orderId)

    if (itemsError) {
      console.error('Error updating order items:', itemsError)
    }

    // Send notifications
    await sendPreparationNotifications(order, 'preparation_started')

    // Log audit
    await logAudit(
      authResult.user_id || 'system',
      'START_ORDER_PREPARATION',
      {
        order_id: orderId,
        order_number: order.order_number,
        assigned_staff: prepData.assigned_staff,
        priority_level: order.priority_level
      },
      'orders',
      orderId
    )

    return createSuccessResponse(
      {
        order_id: orderId,
        order_number: order.order_number,
        status: 'preparing',
        started_at: now,
        assigned_staff: prepData.assigned_staff
      },
      'Order preparation started successfully',
      {
        next_steps: [
          'Monitor preparation progress',
          'Update item status as completed',
          'Mark order ready when all items done'
        ]
      },
      request
    )

  } catch (error) {
    console.error('Error in handleStartPreparation:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Complete individual order item
 */
async function handleCompleteOrderItem(request: Request): Promise<Response> {
  try {
    // Extract order item ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderItemId = pathParts[pathParts.length - 1]

    if (!orderItemId) {
      return createErrorResponse('Order item ID required', 400, undefined, request)
    }

    // Authenticate kitchen staff
    const authResult = await authenticateKitchenAccess(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const completeData = body as CompleteItemRequest

    // Validate required fields
    if (typeof completeData.quality_check !== 'boolean') {
      return createErrorResponse('Quality check status required', 400, undefined, request)
    }

    // Get order item details
    const { data: orderItem, error: itemError } = await supabaseAdmin
      .from('order_items')
      .select(`
        id, order_id, quantity, status,
        menu_items(name, category),
        orders(order_number, status, table_id)
      `)
      .eq('id', orderItemId)
      .single()

    if (itemError || !orderItem) {
      return createNotFoundResponse('Order item', request)
    }

    // Validate item status
    if (orderItem.status === 'completed') {
      return createErrorResponse('Order item already completed', 400, undefined, request)
    }

    // Update order item to completed
    const now = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from('order_items')
      .update({
        status: 'completed',
        completed_at: now,
        quality_checked: completeData.quality_check,
        completion_notes: completeData.completion_notes ? 
          sanitizeString(completeData.completion_notes) : null
      })
      .eq('id', orderItemId)

    if (updateError) {
      return createErrorResponse(
        'Failed to update order item status',
        500,
        undefined,
        request
      )
    }

    // Check if all items in order are completed
    const { data: allItems, error: allItemsError } = await supabaseAdmin
      .from('order_items')
      .select('id, status')
      .eq('order_id', orderItem.order_id)

    if (!allItemsError && allItems) {
      const allCompleted = allItems.every(item => item.status === 'completed')
      
      if (allCompleted) {
        // Mark entire order as ready
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'ready',
            actual_completion_time: now,
            updated_at: now
          })
          .eq('id', orderItem.order_id)

        // Send ready notification
        await sendPreparationNotifications(orderItem.orders, 'order_ready')
      }
    }

    // Log audit
    await logAudit(
      authResult.user_id || 'system',
      'COMPLETE_ORDER_ITEM',
      {
        order_item_id: orderItemId,
        order_id: orderItem.order_id,
        order_number: orderItem.orders.order_number,
        menu_item: orderItem.menu_items.name,
        quality_check: completeData.quality_check
      },
      'order_items',
      orderItemId
    )

    return createSuccessResponse(
      {
        order_item_id: orderItemId,
        order_id: orderItem.order_id,
        order_number: orderItem.orders.order_number,
        menu_item: orderItem.menu_items.name,
        status: 'completed',
        completed_at: now,
        quality_checked: completeData.quality_check
      },
      'Order item completed successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleCompleteOrderItem:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Mark entire order as ready for pickup
 */
async function handleMarkOrderReady(request: Request): Promise<Response> {
  try {
    // Extract order ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.length - 1]

    if (!orderId) {
      return createErrorResponse('Order ID required', 400, undefined, request)
    }

    // Authenticate kitchen staff
    const authResult = await authenticateKitchenAccess(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, status, table_id, customer_name,
        tables(table_number),
        order_items(id, status, menu_items(name))
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return createNotFoundResponse('Order', request)
    }

    // Validate order status
    if (order.status === 'ready') {
      return createErrorResponse('Order already marked as ready', 400, undefined, request)
    }

    if (order.status !== 'preparing') {
      return createErrorResponse(
        `Cannot mark order ready from status: ${order.status}`,
        400,
        undefined,
        request
      )
    }

    // Check if all items are completed
    const incompleteItems = order.order_items.filter(item => item.status !== 'completed')
    if (incompleteItems.length > 0) {
      return createErrorResponse(
        'Cannot mark order ready - some items are not completed',
        400,
        {
          incomplete_items: incompleteItems.map(item => item.menu_items.name)
        },
        request
      )
    }

    // Update order status to ready
    const now = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'ready',
        actual_completion_time: now,
        updated_at: now
      })
      .eq('id', orderId)

    if (updateError) {
      return createErrorResponse(
        'Failed to update order status',
        500,
        undefined,
        request
      )
    }

    // Send notifications to waiter and customer
    await sendPreparationNotifications(order, 'order_ready')

    // Log audit
    await logAudit(
      authResult.user_id || 'system',
      'MARK_ORDER_READY',
      {
        order_id: orderId,
        order_number: order.order_number,
        table_number: order.tables?.table_number,
        items_count: order.order_items.length
      },
      'orders',
      orderId
    )

    return createSuccessResponse(
      {
        order_id: orderId,
        order_number: order.order_number,
        table_number: order.tables?.table_number,
        status: 'ready',
        completed_at: now,
        items_completed: order.order_items.length
      },
      'Order marked as ready for pickup',
      {
        next_steps: [
          'Waiter will be notified to pickup',
          'Customer will receive ready notification',
          'Order will move to serving queue'
        ]
      },
      request
    )

  } catch (error) {
    console.error('Error in handleMarkOrderReady:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get kitchen performance statistics
 */
async function handleGetKitchenStats(request: Request): Promise<Response> {
  try {
    // Authenticate kitchen access
    const authResult = await authenticateKitchenAccess(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    const stats = await calculateKitchenStats()

    return createSuccessResponse(
      stats,
      'Kitchen statistics retrieved successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetKitchenStats:', error)
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
 * Calculate kitchen performance statistics
 */
async function calculateKitchenStats(): Promise<KitchenStats> {
  try {
    // Get current orders in different states
    const { data: orderCounts } = await supabaseAdmin
      .from('orders')
      .select('status')
      .in('status', ['confirmed', 'preparing', 'ready'])

    const ordersInQueue = orderCounts?.filter(o => o.status === 'confirmed').length || 0
    const ordersPreparing = orderCounts?.filter(o => o.status === 'preparing').length || 0
    const ordersReady = orderCounts?.filter(o => o.status === 'ready').length || 0

    // Get order items stats
    const { data: itemCounts } = await supabaseAdmin
      .from('order_items')
      .select(`
        status,
        orders!inner(status)
      `)
      .in('orders.status', ['confirmed', 'preparing', 'ready'])

    const itemsPending = itemCounts?.filter(i => i.status === 'pending').length || 0
    const itemsPreparing = itemCounts?.filter(i => i.status === 'preparing').length || 0
    const itemsCompleted = itemCounts?.filter(i => i.status === 'completed').length || 0

    // Calculate average preparation time (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: completedOrders } = await supabaseAdmin
      .from('orders')
      .select('actual_start_time, actual_completion_time')
      .eq('status', 'completed')
      .gte('completed_at', yesterday)
      .not('actual_start_time', 'is', null)
      .not('actual_completion_time', 'is', null)

    let averagePrepTime = 0
    let onTimePercentage = 100

    if (completedOrders && completedOrders.length > 0) {
      const prepTimes = completedOrders.map(order => {
        const start = new Date(order.actual_start_time!).getTime()
        const end = new Date(order.actual_completion_time!).getTime()
        return (end - start) / 1000 / 60 // minutes
      })

      averagePrepTime = prepTimes.reduce((sum, time) => sum + time, 0) / prepTimes.length
    }

    // Estimate queue time based on current orders and average prep time
    const estimatedQueueTime = Math.ceil(
      (ordersInQueue + ordersPreparing) * (averagePrepTime || 15) / Math.max(1, 2) // Assume 2 parallel cooking stations
    )

    return {
      orders_in_queue: ordersInQueue,
      orders_preparing: ordersPreparing,
      orders_ready: ordersReady,
      average_prep_time: Math.round(averagePrepTime),
      on_time_percentage: Math.round(onTimePercentage),
      items_pending: itemsPending,
      items_preparing: itemsPreparing,
      items_completed: itemsCompleted,
      estimated_queue_time: estimatedQueueTime
    }

  } catch (error) {
    console.error('Error calculating kitchen stats:', error)
    return {
      orders_in_queue: 0,
      orders_preparing: 0,
      orders_ready: 0,
      average_prep_time: 0,
      on_time_percentage: 0,
      items_pending: 0,
      items_preparing: 0,
      items_completed: 0,
      estimated_queue_time: 0
    }
  }
}

/**
 * Send preparation notifications
 */
async function sendPreparationNotifications(order: any, type: string): Promise<void> {
  try {
    let title = ''
    let message = ''
    let targetRole = ''

    switch (type) {
      case 'preparation_started':
        title = 'Order Preparation Started'
        message = `Kitchen started preparing order ${order.order_number}`
        targetRole = 'pelayan'
        break
      case 'order_ready':
        title = 'Order Ready for Pickup'
        message = `Order ${order.order_number} ready for table ${order.table_number || 'N/A'}`
        targetRole = 'pelayan'
        break
    }

    if (title && message) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          type,
          title,
          message,
          data: {
            order_id: order.id,
            order_number: order.order_number,
            table_number: order.table_number,
            customer_name: order.customer_name
          },
          channel: 'in_app',
          target_role: targetRole
        })
    }

  } catch (error) {
    console.error('Error sending preparation notifications:', error)
  }
}

/**
 * Authenticate kitchen access
 */
async function authenticateKitchenAccess(request: Request): Promise<{
  success: boolean
  error?: string
  user_id?: string
}> {
  try {
    // Try device authentication first (for kitchen tablet)
    const deviceInfo = extractDeviceInfo(request)
    if (deviceInfo && deviceInfo.deviceRole === 'dapur') {
      const deviceAccount = await validateDeviceAuth(deviceInfo.deviceId, 'dapur')
      if (deviceAccount) {
        return { 
          success: true, 
          user_id: deviceAccount.device_id
        }
      }
    }

    // Try user authentication (owner access)
    const authResult = await getAuthenticatedClient(request)
    if (authResult) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('user_id, position')
        .eq('user_id', authResult.user.id)
        .eq('status', 'active')
        .single()

      if (employee && ['owner', 'dapur'].includes(employee.position)) {
        return { 
          success: true, 
          user_id: authResult.user.id
        }
      }
    }

    return {
      success: false,
      error: 'Unauthorized. Kitchen access required.'
    }

  } catch (error) {
    console.error('Error authenticating kitchen access:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * Extract device info from headers
 */
function extractDeviceInfo(request: Request): {
  deviceId: string
  deviceRole: 'kasir' | 'dapur' | 'pelayan' | 'stok'
} | null {
  const deviceId = request.headers.get('X-Device-ID')
  const deviceRole = request.headers.get('X-Device-Role') as 'kasir' | 'dapur' | 'pelayan' | 'stok'

  if (!deviceId || !deviceRole) {
    return null
  }

  return { deviceId, deviceRole }
}

// ===========================================
// MAIN HANDLER WITH ROUTING
// ===========================================

const handler = withCors(createHandler({
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/orders')) {
      return handleGetKitchenOrders(request)
    } else if (url.pathname.includes('/stats')) {
      return handleGetKitchenStats(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  POST: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/start-prep/')) {
      return handleStartPreparation(request)
    } else if (url.pathname.includes('/complete-item/')) {
      return handleCompleteOrderItem(request)
    } else if (url.pathname.includes('/ready/')) {
      return handleMarkOrderReady(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler