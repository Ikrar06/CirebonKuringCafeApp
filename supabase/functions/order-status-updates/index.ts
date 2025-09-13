/**
 * Order Status Updates Edge Function
 * 
 * Handles order status transitions throughout the complete lifecycle
 * Ensures proper status flow and triggers appropriate notifications
 * 
 * Status Flow: pending → confirmed → preparing → ready → served → completed
 * 
 * @endpoints
 * PUT  /order-status-updates/:orderId - Update order status
 * POST /order-status-updates/bulk - Bulk status updates
 * GET  /order-status-updates/history/:orderId - Status change history
 * POST /order-status-updates/validate - Validate status transition
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
  sanitizeString
} from '../../../packages/utils/src/validators/index'

// Order status types and interfaces
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'

interface StatusUpdateRequest {
  new_status: OrderStatus
  reason?: string
  notes?: string
  staff_id?: string
  estimated_time?: number
  quality_score?: number
}

interface BulkStatusUpdateRequest {
  updates: Array<{
    order_id: string
    new_status: OrderStatus
    reason?: string
  }>
  batch_reason?: string
}

interface StatusHistory {
  id: string
  order_id: string
  previous_status: OrderStatus
  new_status: OrderStatus
  changed_by: string
  changed_by_name: string
  reason?: string
  notes?: string
  timestamp: string
  duration_in_previous_status: number
}

interface StatusValidation {
  valid: boolean
  current_status: OrderStatus
  requested_status: OrderStatus
  allowed_transitions: OrderStatus[]
  warnings: string[]
  requirements: string[]
}

// Valid status transitions
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['preparing', 'cancelled'],
  'preparing': ['ready', 'cancelled'],
  'ready': ['served', 'preparing'], // Can go back to preparing if needed
  'served': ['completed'],
  'completed': [], // Final status
  'cancelled': [] // Final status
}

// Required roles for status transitions
const ROLE_PERMISSIONS: Record<string, OrderStatus[]> = {
  'owner': ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
  'kasir': ['confirmed', 'cancelled'],
  'dapur': ['preparing', 'ready'],
  'pelayan': ['served', 'completed']
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Update order status with validation and notifications
 */
async function handleUpdateOrderStatus(request: Request): Promise<Response> {
  try {
    // Extract order ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.length - 1]

    if (!orderId) {
      return createErrorResponse('Order ID required', 400, undefined, request)
    }

    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const updateData = body as StatusUpdateRequest

    // Validate request data
    const validation = validateFields(updateData, {
      new_status: { required: true, type: 'string' }
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

    // Authenticate user
    const authResult = await authenticateStatusUpdate(request, updateData.new_status)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get current order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, status, table_id, customer_name,
        created_at, confirmed_at, actual_start_time, actual_completion_time,
        tables(table_number)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return createNotFoundResponse('Order', request)
    }

    // Validate status transition
    const transitionValidation = validateStatusTransition(
      order.status as OrderStatus,
      updateData.new_status as OrderStatus
    )

    if (!transitionValidation.valid) {
      return createErrorResponse(
        'Invalid status transition',
        400,
        {
          current_status: order.status,
          requested_status: updateData.new_status,
          allowed_transitions: transitionValidation.allowed_transitions,
          warnings: transitionValidation.warnings
        },
        request
      )
    }

    // Execute status update
    const updateResult = await executeStatusUpdate(
      order,
      updateData,
      authResult.user_id || 'system',
      authResult.user_name || 'System'
    )

    if (!updateResult.success) {
      return createErrorResponse(
        updateResult.error || 'Failed to update order status',
        500,
        undefined,
        request
      )
    }

    // Send notifications
    await sendStatusChangeNotifications(order, updateData.new_status, authResult.user_name || 'System')

    // Log audit
    await logAudit(
      authResult.user_id || 'system',
      'UPDATE_ORDER_STATUS',
      {
        order_id: orderId,
        order_number: order.order_number,
        previous_status: order.status,
        new_status: updateData.new_status,
        reason: updateData.reason
      },
      'orders',
      orderId
    )

    return createSuccessResponse(
      {
        order_id: orderId,
        order_number: order.order_number,
        previous_status: order.status,
        new_status: updateData.new_status,
        updated_at: new Date().toISOString(),
        updated_by: authResult.user_name,
        table_number: order.tables?.table_number
      },
      `Order status updated to ${updateData.new_status}`,
      {
        next_actions: getNextActions(updateData.new_status as OrderStatus)
      },
      request
    )

  } catch (error) {
    console.error('Error in handleUpdateOrderStatus:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Bulk status updates for multiple orders
 */
async function handleBulkStatusUpdate(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const bulkData = body as BulkStatusUpdateRequest

    // Validate bulk data
    if (!Array.isArray(bulkData.updates) || bulkData.updates.length === 0) {
      return createErrorResponse('Updates array required', 400, undefined, request)
    }

    if (bulkData.updates.length > 50) {
      return createErrorResponse('Maximum 50 updates per batch', 400, undefined, request)
    }

    // Authenticate user
    const authResult = await authenticateStatusUpdate(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Process each update
    const results: Array<{
      order_id: string
      order_number: string
      previous_status: string
      new_status: OrderStatus
      success: boolean
    }> = []
    const errors: Array<{
      order_id: string
      error: string
    }> = []

    for (const update of bulkData.updates) {
      try {
        // Get order details
        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .select('id, order_number, status')
          .eq('id', update.order_id)
          .single()

        if (orderError || !order) {
          errors.push({
            order_id: update.order_id,
            error: 'Order not found'
          })
          continue
        }

        // Validate transition
        const validation = validateStatusTransition(
          order.status as OrderStatus,
          update.new_status as OrderStatus
        )

        if (!validation.valid) {
          errors.push({
            order_id: update.order_id,
            error: `Invalid transition from ${order.status} to ${update.new_status}`
          })
          continue
        }

        // Execute update
        const updateResult = await executeStatusUpdate(
          order,
          {
            new_status: update.new_status,
            reason: update.reason || bulkData.batch_reason
          },
          authResult.user_id || 'system',
          authResult.user_name || 'System'
        )

        if (updateResult.success) {
          results.push({
            order_id: update.order_id,
            order_number: order.order_number,
            previous_status: order.status,
            new_status: update.new_status,
            success: true
          })

          // Send notification
          await sendStatusChangeNotifications(order, update.new_status, authResult.user_name || 'System')
        } else {
          errors.push({
            order_id: update.order_id,
            error: updateResult.error || 'Unknown error'
          })
        }

      } catch (error) {
        errors.push({
          order_id: update.order_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log bulk operation
    await logAudit(
      authResult.user_id || 'system',
      'BULK_UPDATE_ORDER_STATUS',
      {
        total_updates: bulkData.updates.length,
        successful_updates: results.length,
        failed_updates: errors.length,
        batch_reason: bulkData.batch_reason
      },
      'orders',
      'bulk_operation'
    )

    return createSuccessResponse(
      {
        successful_updates: results,
        failed_updates: errors,
        summary: {
          total: bulkData.updates.length,
          successful: results.length,
          failed: errors.length
        }
      },
      `Bulk update completed: ${results.length} successful, ${errors.length} failed`,
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleBulkStatusUpdate:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get order status change history
 */
async function handleGetStatusHistory(request: Request): Promise<Response> {
  try {
    // Extract order ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.length - 1]

    if (!orderId) {
      return createErrorResponse('Order ID required', 400, undefined, request)
    }

    // Authenticate user
    const authResult = await authenticateStatusUpdate(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get status history
    const { data: history, error } = await supabaseAdmin
      .from('order_status_history')
      .select(`
        id, previous_status, new_status, reason, notes, created_at,
        changed_by, changed_by_name
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    // Calculate duration in each status
    const statusHistory: StatusHistory[] = (history || []).map((record, index) => {
      let duration = 0
      
      if (index > 0) {
        const prevTime = new Date(history[index - 1].created_at).getTime()
        const currTime = new Date(record.created_at).getTime()
        duration = Math.floor((currTime - prevTime) / 1000 / 60) // minutes
      }

      return {
        id: record.id,
        order_id: orderId,
        previous_status: record.previous_status,
        new_status: record.new_status,
        changed_by: record.changed_by,
        changed_by_name: record.changed_by_name,
        reason: record.reason,
        notes: record.notes,
        timestamp: record.created_at,
        duration_in_previous_status: duration
      }
    })

    return createSuccessResponse(
      {
        order_id: orderId,
        status_history: statusHistory,
        total_transitions: statusHistory.length
      },
      'Status history retrieved successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetStatusHistory:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Validate status transition
 */
async function handleValidateTransition(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const { order_id, new_status } = body

    if (!order_id || !new_status) {
      return createErrorResponse('Order ID and new status required', 400, undefined, request)
    }

    // Get current order status
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('status')
      .eq('id', order_id)
      .single()

    if (error || !order) {
      return createNotFoundResponse('Order', request)
    }

    // Validate transition
    const validation = validateStatusTransition(
      order.status as OrderStatus,
      new_status as OrderStatus
    )

    return createSuccessResponse(
      validation,
      validation.valid ? 'Status transition is valid' : 'Status transition is invalid',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleValidateTransition:', error)
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
 * Validate status transition
 */
function validateStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): StatusValidation {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || []
  const valid = allowedTransitions.includes(newStatus)

  const warnings: string[] = []
  const requirements: string[] = []

  // Add specific warnings for certain transitions
  if (currentStatus === 'ready' && newStatus === 'preparing') {
    warnings.push('Order is going back to preparation - ensure customer is notified')
  }

  if (currentStatus === 'preparing' && newStatus === 'cancelled') {
    warnings.push('Cancelling order during preparation may waste ingredients')
    requirements.push('Manager approval may be required')
  }

  if (newStatus === 'completed') {
    requirements.push('Customer feedback should be collected')
    requirements.push('Payment must be fully verified')
  }

  return {
    valid,
    current_status: currentStatus,
    requested_status: newStatus,
    allowed_transitions: allowedTransitions,
    warnings,
    requirements
  }
}

/**
 * Execute status update with all necessary side effects
 */
async function executeStatusUpdate(
  order: any,
  updateData: StatusUpdateRequest,
  userId: string,
  userName: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const now = new Date().toISOString()
    const updateFields: any = {
      status: updateData.new_status,
      updated_at: now
    }

    // Set specific timestamp fields based on status
    switch (updateData.new_status) {
      case 'confirmed':
        updateFields.confirmed_at = now
        break
      case 'preparing':
        if (!order.actual_start_time) {
          updateFields.actual_start_time = now
        }
        break
      case 'ready':
      case 'completed':
        if (!order.actual_completion_time) {
          updateFields.actual_completion_time = now
        }
        break
    }

    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateFields)
      .eq('id', order.id)

    if (updateError) {
      throw updateError
    }

    // Record status history
    await supabaseAdmin
      .from('order_status_history')
      .insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: updateData.new_status,
        changed_by: userId,
        changed_by_name: userName,
        reason: updateData.reason ? sanitizeString(updateData.reason) : null,
        notes: updateData.notes ? sanitizeString(updateData.notes) : null,
        created_at: now
      })

    // Handle status-specific side effects
    await handleStatusSideEffects(order, updateData.new_status as OrderStatus, userId)

    return { success: true }

  } catch (error) {
    console.error('Error executing status update:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Status update failed'
    }
  }
}

/**
 * Handle side effects for specific status changes
 */
async function handleStatusSideEffects(
  order: any,
  newStatus: OrderStatus,
  userId: string
): Promise<void> {
  try {
    switch (newStatus) {
      case 'completed':
        // Update table status to available
        await supabaseAdmin
          .from('tables')
          .update({
            status: 'available',
            current_order_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.table_id)
        break

      case 'cancelled':
        // Reverse stock deduction if order was confirmed
        if (['confirmed', 'preparing'].includes(order.status)) {
          // TODO: Implement stock reversal
          console.log('TODO: Reverse stock deduction for cancelled order:', order.id)
        }

        // Update table status to available
        await supabaseAdmin
          .from('tables')
          .update({
            status: 'available',
            current_order_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.table_id)
        break

      case 'preparing':
        // Update all order items to preparing status
        await supabaseAdmin
          .from('order_items')
          .update({
            status: 'preparing',
            started_at: new Date().toISOString()
          })
          .eq('order_id', order.id)
          .eq('status', 'pending')
        break
    }

  } catch (error) {
    console.error('Error handling status side effects:', error)
  }
}

/**
 * Send notifications for status changes
 */
async function sendStatusChangeNotifications(
  order: any,
  newStatus: OrderStatus,
  changedBy: string
): Promise<void> {
  try {
    const notifications = getStatusNotifications(order, newStatus, changedBy)

    for (const notification of notifications) {
      await supabaseAdmin
        .from('notifications')
        .insert(notification)
    }

  } catch (error) {
    console.error('Error sending status change notifications:', error)
  }
}

/**
 * Get notifications for status changes
 */
function getStatusNotifications(order: any, newStatus: OrderStatus, changedBy: string) {
  const notifications: Array<{
    type: string
    title: string
    message: string
    data: {
      order_id: any
      order_number: any
      table_number: any
      customer_name: any
      changed_by: string
    }
    channel: string
    target_role: string
  }> = []
  const baseData = {
    order_id: order.id,
    order_number: order.order_number,
    table_number: order.tables?.table_number,
    customer_name: order.customer_name,
    changed_by: changedBy
  }

  switch (newStatus) {
    case 'preparing':
      notifications.push({
        type: 'order_preparation_started',
        title: 'Order Preparation Started',
        message: `Kitchen started preparing order ${order.order_number}`,
        data: baseData,
        channel: 'in_app',
        target_role: 'pelayan'
      })
      break

    case 'ready':
      notifications.push({
        type: 'order_ready',
        title: 'Order Ready for Pickup',
        message: `Order ${order.order_number} is ready for table ${order.tables?.table_number || 'N/A'}`,
        data: baseData,
        channel: 'in_app',
        target_role: 'pelayan'
      })
      break

    case 'served':
      notifications.push({
        type: 'order_served',
        title: 'Order Served',
        message: `Order ${order.order_number} has been served to customer`,
        data: baseData,
        channel: 'in_app',
        target_role: 'owner'
      })
      break

    case 'completed':
      notifications.push({
        type: 'order_completed',
        title: 'Order Completed',
        message: `Order ${order.order_number} has been completed successfully`,
        data: baseData,
        channel: 'in_app',
        target_role: 'owner'
      })
      break

    case 'cancelled':
      notifications.push({
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Order ${order.order_number} has been cancelled`,
        data: baseData,
        channel: 'in_app',
        target_role: 'owner'
      })
      break
  }

  return notifications
}

/**
 * Get next actions for each status
 */
function getNextActions(status: OrderStatus): string[] {
  switch (status) {
    case 'confirmed':
      return [
        'Order will be sent to kitchen for preparation',
        'Stock has been deducted',
        'Payment is verified'
      ]
    case 'preparing':
      return [
        'Kitchen is preparing the order',
        'Monitor preparation progress',
        'Update when items are ready'
      ]
    case 'ready':
      return [
        'Order is ready for pickup',
        'Waiter should deliver to table',
        'Customer will be notified'
      ]
    case 'served':
      return [
        'Order has been delivered to customer',
        'Monitor customer satisfaction',
        'Complete order when customer finishes'
      ]
    case 'completed':
      return [
        'Order lifecycle completed',
        'Table is now available',
        'Analytics data recorded'
      ]
    case 'cancelled':
      return [
        'Order has been cancelled',
        'Stock reversal processed',
        'Table is now available'
      ]
    default:
      return []
  }
}

/**
 * Authenticate status update permission
 */
async function authenticateStatusUpdate(
  request: Request,
  targetStatus?: OrderStatus
): Promise<{
  success: boolean
  error?: string
  user_id?: string
  user_name?: string
  role?: string
}> {
  try {
    // Try device authentication first
    const deviceInfo = extractDeviceInfo(request)
    if (deviceInfo) {
      const deviceAccount = await validateDeviceAuth(deviceInfo.deviceId, deviceInfo.deviceRole)
      if (deviceAccount) {
        // Check role permissions for target status
        if (targetStatus) {
          const allowedStatuses = ROLE_PERMISSIONS[deviceInfo.deviceRole] || []
          if (!allowedStatuses.includes(targetStatus)) {
            return {
              success: false,
              error: `Role ${deviceInfo.deviceRole} cannot update status to ${targetStatus}`
            }
          }
        }

        return { 
          success: true, 
          user_id: deviceAccount.device_id,
          user_name: `Device ${deviceAccount.device_name}`,
          role: deviceInfo.deviceRole
        }
      }
    }

    // Try user authentication
    const authResult = await getAuthenticatedClient(request)
    if (authResult) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('user_id, full_name, position')
        .eq('user_id', authResult.user.id)
        .eq('status', 'active')
        .single()

      if (employee) {
        // Check role permissions
        if (targetStatus) {
          const allowedStatuses = ROLE_PERMISSIONS[employee.position] || []
          if (!allowedStatuses.includes(targetStatus)) {
            return {
              success: false,
              error: `Role ${employee.position} cannot update status to ${targetStatus}`
            }
          }
        }

        return { 
          success: true, 
          user_id: authResult.user.id,
          user_name: employee.full_name,
          role: employee.position
        }
      }
    }

    return {
      success: false,
      error: 'Unauthorized access'
    }

  } catch (error) {
    console.error('Error authenticating status update:', error)
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
  PUT: handleUpdateOrderStatus,
  
  POST: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/bulk')) {
      return handleBulkStatusUpdate(request)
    } else if (url.pathname.includes('/validate')) {
      return handleValidateTransition(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/history/')) {
      return handleGetStatusHistory(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler