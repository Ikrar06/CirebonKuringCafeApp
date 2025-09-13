/**
 * Order Processing Edge Function - Main Handler
 * 
 * Handles customer order creation via QR scan
 * Status flow: Customer scan QR → Create order (pending) → Kasir verify payment → Confirmed
 * 
 * @endpoint POST /order-processing
 * @auth Customer session (from QR scan) or device authentication
 */

// Explicit global declarations for Deno environment
declare const Number: NumberConstructor

import { withCors } from '../_shared/cors'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  createUnauthorizedResponse,
  parseJsonBody,
  validateRequiredFields,
  validateFieldTypes
} from '../_shared/response'
import { 
  supabaseAdmin, 
  getAuthenticatedClient,
  validateDeviceAuth,
  logAudit 
} from '../_shared/supabase-client'
import { 
  validateFields,
  isValidTableNumber,
  isValidOrderQuantity,
  isValidRupiahAmount,
  sanitizeString
} from '../../../packages/utils/src/validators/index'

// Types for order creation
interface OrderItem {
  menu_item_id: string
  quantity: number
  unit_price: number
  customizations?: Array<{
    customization_option_id: string
    value: string
    additional_price: number
  }>
  notes?: string
}

interface CreateOrderRequest {
  table_number: number
  customer_name: string
  items: OrderItem[]
  order_type: 'dine_in' | 'takeaway'
  special_instructions?: string
}

interface OrderResponse {
  order_id: string
  order_number: string
  table_number: number
  customer_name: string
  total_amount: number
  status: string
  estimated_time: number
  items: Array<{
    menu_item_name: string
    quantity: number
    unit_price: number
    total_price: number
    customizations: string[]
  }>
}

/**
 * Main order processing handler
 */
async function handleCreateOrder(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    // Validate required fields
    const requiredFields = ['table_number', 'customer_name', 'items', 'order_type']
    const missingFields = validateRequiredFields(body, requiredFields)
    
    if (missingFields.length > 0) {
      return createValidationErrorResponse(missingFields, request)
    }

    // Type validation
    const fieldTypes = {
      table_number: 'number' as const,
      customer_name: 'string' as const,
      items: 'array' as const,
      order_type: 'string' as const,
    }
    
    const typeErrors = validateFieldTypes(body, fieldTypes)
    if (typeErrors.length > 0) {
      return createValidationErrorResponse(typeErrors, request)
    }

    const orderData = body as CreateOrderRequest

    // Validate business rules
    const validationResult = await validateOrderData(orderData)
    if (!validationResult.valid) {
      return createValidationErrorResponse(validationResult.errors, request)
    }

    // Check table availability
    const tableCheck = await validateTableAvailability(orderData.table_number)
    if (!tableCheck.available) {
      return createErrorResponse(
        tableCheck.reason || 'Table not available',
        400,
        undefined,
        request
      )
    }

    // Verify menu items and calculate totals
    const itemsValidation = await validateAndCalculateItems(orderData.items)
    if (!itemsValidation.valid) {
      return createErrorResponse(
        itemsValidation.error || 'Invalid menu items',
        400,
        undefined,
        request
      )
    }

    // Create order in database
    const orderResult = await createOrderInDatabase(orderData, itemsValidation.calculatedItems)
    if (!orderResult.success) {
      return createErrorResponse(
        orderResult.error || 'Failed to create order',
        500,
        undefined,
        request
      )
    }

    // Update table status to occupied
    await updateTableStatus(orderData.table_number, 'occupied')

    // Send notification to kasir
    await sendOrderNotificationToKasir(orderResult.order)

    // Log audit trail
    await logAudit(
      orderResult.order.customer_session_id || 'system',
      'CREATE_ORDER',
      {
        order_id: orderResult.order.id,
        table_number: orderData.table_number,
        total_amount: orderResult.order.total_amount,
        items_count: orderData.items.length
      },
      'orders',
      orderResult.order.id
    )

    // Prepare response
    const response: OrderResponse = {
      order_id: orderResult.order.id,
      order_number: orderResult.order.order_number,
      table_number: orderData.table_number,
      customer_name: orderData.customer_name,
      total_amount: orderResult.order.total_amount,
      status: 'pending',
      estimated_time: calculateEstimatedTime(orderData.items.length),
      items: itemsValidation.calculatedItems.map(item => ({
        menu_item_name: item.menu_item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        customizations: item.customizations.map(c => `${c.option_name}: ${c.value}`)
      }))
    }

    return createSuccessResponse(
      response,
      'Order created successfully. Please proceed to payment.',
      {
        next_steps: [
          'Choose payment method (QRIS, Bank Transfer, or Cash)',
          'Upload payment proof if using QRIS/Transfer',
          'Wait for kasir verification',
          'Order will be processed after payment confirmation'
        ]
      },
      request
    )

  } catch (error) {
    console.error('Error in handleCreateOrder:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Validate order data business rules
 */
async function validateOrderData(orderData: CreateOrderRequest): Promise<{
  valid: boolean
  errors: Array<{ field: string; message: string; code: string }>
}> {
  const errors: Array<{ field: string; message: string; code: string }> = []

  // Table number validation
  if (!isValidTableNumber(orderData.table_number)) {
    errors.push({
      field: 'table_number',
      message: 'Invalid table number',
      code: 'INVALID_TABLE'
    })
  }

  // Customer name validation
  const sanitizedName = sanitizeString(orderData.customer_name)
  if (!sanitizedName || sanitizedName.length < 2 || sanitizedName.length > 50) {
    errors.push({
      field: 'customer_name',
      message: 'Customer name must be between 2-50 characters',
      code: 'INVALID_NAME'
    })
  }

  // Order type validation
  if (!['dine_in', 'takeaway'].includes(orderData.order_type)) {
    errors.push({
      field: 'order_type',
      message: 'Order type must be dine_in or takeaway',
      code: 'INVALID_ORDER_TYPE'
    })
  }

  // Items validation
  if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push({
      field: 'items',
      message: 'Order must contain at least one item',
      code: 'EMPTY_ORDER'
    })
  } else if (orderData.items.length > 20) {
    errors.push({
      field: 'items',
      message: 'Order cannot contain more than 20 items',
      code: 'TOO_MANY_ITEMS'
    })
  }

  // Validate each item
  orderData.items.forEach((item, index) => {
    if (!item.menu_item_id || typeof item.menu_item_id !== 'string') {
      errors.push({
        field: `items[${index}].menu_item_id`,
        message: 'Menu item ID is required',
        code: 'MISSING_MENU_ITEM_ID'
      })
    }

    if (!isValidOrderQuantity(item.quantity)) {
      errors.push({
        field: `items[${index}].quantity`,
        message: 'Quantity must be between 1-100',
        code: 'INVALID_QUANTITY'
      })
    }

    if (!isValidRupiahAmount(item.unit_price)) {
      errors.push({
        field: `items[${index}].unit_price`,
        message: 'Invalid unit price',
        code: 'INVALID_PRICE'
      })
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Check if table is available for new orders
 */
async function validateTableAvailability(tableNumber: number): Promise<{
  available: boolean
  reason?: string
}> {
  try {
    // Check if table exists and is available
    const { data: table, error } = await supabaseAdmin
      .from('tables')
      .select('id, status, capacity')
      .eq('table_number', tableNumber)
      .single()

    if (error || !table) {
      return {
        available: false,
        reason: 'Table not found'
      }
    }

    if (table.status !== 'available') {
      return {
        available: false,
        reason: `Table is currently ${table.status}`
      }
    }

    return { available: true }

  } catch (error) {
    console.error('Error checking table availability:', error)
    return {
      available: false,
      reason: 'Unable to verify table availability'
    }
  }
}

/**
 * Validate menu items and calculate totals
 */
async function validateAndCalculateItems(items: OrderItem[]): Promise<{
  valid: boolean
  error?: string
  calculatedItems: Array<{
    menu_item_id: string
    menu_item_name: string
    quantity: number
    unit_price: number
    total_price: number
    customizations: Array<{
      option_id: string
      option_name: string
      value: string
      additional_price: number
    }>
    notes?: string
  }>
}> {
  try {
    const calculatedItems: Array<{
      menu_item_id: string
      menu_item_name: string
      quantity: number
      unit_price: number
      total_price: number
      customizations: Array<{
        option_id: string
        option_name: string
        value: string
        additional_price: number
      }>
      notes?: string
    }> = []

    for (const item of items) {
      // Get menu item details
      const { data: menuItem, error: menuError } = await supabaseAdmin
        .from('menu_items')
        .select(`
          id, name, price, status,
          menu_customization_groups(
            id, name, type, required,
            menu_customization_options(
              id, name, additional_price
            )
          )
        `)
        .eq('id', item.menu_item_id)
        .single()

      if (menuError || !menuItem) {
        return {
          valid: false,
          error: `Menu item not found: ${item.menu_item_id}`,
          calculatedItems: []
        }
      }

      // Check if menu item is available
      if (menuItem.status !== 'active') {
        return {
          valid: false,
          error: `Menu item "${menuItem.name}" is not available`,
          calculatedItems: []
        }
      }

      // Validate price matches
      if (Math.abs(item.unit_price - menuItem.price) > 0.01) {
        return {
          valid: false,
          error: `Price mismatch for "${menuItem.name}". Expected: ${menuItem.price}, Received: ${item.unit_price}`,
          calculatedItems: []
        }
      }

      // Process customizations
      const processedCustomizations: Array<{
        option_id: string
        option_name: string
        value: string
        additional_price: number
      }> = []
      let customizationTotal = 0

      if (item.customizations) {
        for (const customization of item.customizations) {
          // Find the customization option
          let foundOption: any = null
          for (const group of (menuItem as any).menu_customization_groups || []) {
            const option = (group.menu_customization_options || []).find(
              (opt: any) => opt.id === customization.customization_option_id
            )
            if (option) {
              foundOption = option
              break
            }
          }

          if (!foundOption) {
            return {
              valid: false,
              error: `Invalid customization option: ${customization.customization_option_id}`,
              calculatedItems: []
            }
          }

          // Validate additional price
          if (Math.abs(customization.additional_price - foundOption.additional_price) > 0.01) {
            return {
              valid: false,
              error: `Customization price mismatch for "${foundOption.name}"`,
              calculatedItems: []
            }
          }

          processedCustomizations.push({
            option_id: foundOption.id,
            option_name: foundOption.name,
            value: customization.value,
            additional_price: foundOption.additional_price
          })

          customizationTotal += foundOption.additional_price
        }
      }

      // Calculate total price for this item
      const menuPrice = (menuItem as any).price || 0
      const customPrice = customizationTotal || 0
      const qty = item.quantity || 1
      
      const unitPriceTotal = menuPrice + customPrice
      const itemTotal = unitPriceTotal * qty

      const calculatedItem = {
        menu_item_id: (menuItem as any).id,
        menu_item_name: (menuItem as any).name,
        quantity: qty,
        unit_price: unitPriceTotal,
        total_price: itemTotal,
        customizations: processedCustomizations,
        notes: item.notes
      }
      
      calculatedItems.push(calculatedItem)
    }

    return {
      valid: true,
      calculatedItems
    }

  } catch (error) {
    console.error('Error validating menu items:', error)
    return {
      valid: false,
      error: 'Failed to validate menu items',
      calculatedItems: []
    }
  }
}

/**
 * Create order in database
 */
async function createOrderInDatabase(
  orderData: CreateOrderRequest,
  calculatedItems: any[]
): Promise<{
  success: boolean
  error?: string
  order: any
}> {
  try {
    // Calculate totals
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.total_price, 0)
    const taxAmount = subtotal * 0.11 // PPN 11%
    const serviceCharge = subtotal * 0.05 // Service charge 5%
    const totalAmount = subtotal + taxAmount + serviceCharge

    // Generate order number (format: ORD-YYYYMMDD-XXXX)
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    
    // Get today's order count for sequential numbering
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .gte('created_at', `${today.toISOString().slice(0, 10)}T00:00:00.000Z`)
      .lt('created_at', `${today.toISOString().slice(0, 10)}T23:59:59.999Z`)
    
    const count = orders ? orders.length : 0

    const sequenceNumber = String((count || 0) + 1).padStart(4, '0')
    const orderNumber = `ORD-${dateStr}-${sequenceNumber}`

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        table_id: orderData.table_number, // Will be resolved by foreign key
        customer_name: sanitizeString(orderData.customer_name),
        order_type: orderData.order_type,
        status: 'pending',
        subtotal: subtotal,
        tax_amount: taxAmount,
        service_charge: serviceCharge,
        total_amount: totalAmount,
        special_instructions: orderData.special_instructions ? sanitizeString(orderData.special_instructions) : null,
        estimated_completion_time: new Date(Date.now() + calculateEstimatedTime(calculatedItems.length) * 60000).toISOString()
      })
      .select()
      .single()

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`)
    }

    // Create order items
    const orderItems = calculatedItems.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      notes: item.notes
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // Rollback order if items creation fails
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      throw new Error(`Failed to create order items: ${itemsError.message}`)
    }

    // Create order customizations
    for (const item of calculatedItems) {
      if (item.customizations.length > 0) {
        const customizations = item.customizations.map(custom => ({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          customization_option_id: custom.option_id,
          value: custom.value,
          additional_price: custom.additional_price
        }))

        await supabaseAdmin
          .from('order_customizations')
          .insert(customizations)
      }
    }

    return {
      success: true,
      order
    }

  } catch (error) {
    console.error('Error creating order in database:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error',
      order: null
    }
  }
}

/**
 * Update table status
 */
async function updateTableStatus(tableNumber: number, status: 'available' | 'occupied' | 'reserved' | 'cleaning') {
  try {
    await supabaseAdmin
      .from('tables')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('table_number', tableNumber)
  } catch (error) {
    console.error('Error updating table status:', error)
  }
}

/**
 * Send notification to kasir about new order
 */
async function sendOrderNotificationToKasir(order: any) {
  try {
    // Create in-app notification
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: null, // For all kasir devices
        type: 'order_received',
        title: 'Pesanan Baru',
        message: `Order ${order.order_number} dari meja ${order.table_id} - Total: Rp ${order.total_amount.toLocaleString('id-ID')}`,
        data: {
          order_id: order.id,
          order_number: order.order_number,
          table_number: order.table_id,
          total_amount: order.total_amount
        },
        channel: 'in_app'
      })

    // TODO: Add Telegram notification to owner/kasir (will be implemented in Batch 8)
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

/**
 * Calculate estimated completion time based on order complexity
 */
function calculateEstimatedTime(itemCount: number): number {
  // Base time: 10 minutes
  // Additional time: 3 minutes per item
  // Max time: 45 minutes
  const baseTime = 10
  const timePerItem = 3
  const maxTime = 45

  const estimated = baseTime + (itemCount * timePerItem)
  return Math.min(estimated, maxTime)
}

/**
 * Main handler with CORS support
 */
const handler = withCors(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405, undefined, request)
  }

  return await handleCreateOrder(request)
})

// Export for Deno Deploy
export default handler