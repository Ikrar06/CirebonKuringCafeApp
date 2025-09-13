/**
 * Order Processing Business Logic
 * 
 * Handles the core business logic for order creation including:
 * - Price calculations with tax and service charges
 * - Stock reservation system
 * - Order number generation
 * - Database transactions
 * - Real-time notifications
 * - Audit logging
 */

import { supabaseAdmin, logAudit } from '../_shared/supabase-client'
import { sanitizeString, sanitizeAmount } from '../../../packages/utils/src/validators/index'

// Business logic interfaces
export interface ProcessedOrderItem {
  menu_item_id: string
  menu_item_name: string
  category: string
  quantity: number
  unit_price: number
  base_price: number
  customization_price: number
  total_price: number
  preparation_time: number
  customizations: ProcessedCustomization[]
  notes?: string
  ingredients_used: IngredientUsage[]
}

export interface ProcessedCustomization {
  customization_option_id: string
  customization_group_name: string
  option_name: string
  value: string
  additional_price: number
}

export interface IngredientUsage {
  ingredient_id: string
  ingredient_name: string
  quantity_used: number
  unit: string
  cost_per_unit: number
  total_cost: number
}

export interface OrderCalculation {
  subtotal: number
  customization_total: number
  tax_amount: number
  service_charge: number
  discount_amount: number
  total_amount: number
  total_cost: number
  profit_margin: number
}

export interface ProcessedOrder {
  id: string
  order_number: string
  table_id: string
  customer_name: string
  order_type: 'dine_in' | 'takeaway'
  status: 'pending'
  items: ProcessedOrderItem[]
  calculation: OrderCalculation
  estimated_completion_time: string
  special_instructions?: string
  customer_session_id?: string
  created_at: string
}

export interface OrderProcessingOptions {
  customer_session_id?: string
  apply_discount?: {
    type: 'percentage' | 'fixed'
    value: number
    promo_code?: string
  }
  priority_level?: 'normal' | 'high' | 'urgent'
  skip_stock_reservation?: boolean
}

// ===========================================
// MAIN ORDER PROCESSING FUNCTIONS
// ===========================================

/**
 * Process complete order creation
 */
export async function processOrderCreation(
  orderData: {
    table_number: number
    customer_name: string
    items: Array<{
      menu_item_id: string
      quantity: number
      customizations?: Array<{
        customization_option_id: string
        value: string
      }>
      notes?: string
    }>
    order_type: 'dine_in' | 'takeaway'
    special_instructions?: string
  },
  options: OrderProcessingOptions = {}
): Promise<{
  success: boolean
  order?: ProcessedOrder
  error?: string
  warning_messages?: string[]
}> {
  
  const warnings: string[] = []

  try {
    // Start database transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin.rpc('begin_transaction')
    if (transactionError) {
      throw new Error(`Transaction start failed: ${transactionError.message}`)
    }

    try {
      // 1. Get table information
      const table = await getTableInfo(orderData.table_number)
      if (!table) {
        throw new Error(`Table ${orderData.table_number} not found`)
      }

      // 2. Process and validate menu items
      const processedItems = await processOrderItems(orderData.items)
      if (processedItems.length === 0) {
        throw new Error('No valid items to process')
      }

      // 3. Calculate order totals
      const calculation = calculateOrderTotals(processedItems, options.apply_discount)

      // 4. Generate order number
      const orderNumber = await generateOrderNumber()

      // 5. Reserve stock (if not skipped)
      if (!options.skip_stock_reservation) {
        const stockReservation = await reserveStockForOrder(processedItems)
        if (!stockReservation.success) {
          throw new Error(`Stock reservation failed: ${stockReservation.error}`)
        }
        warnings.push(...(stockReservation.warnings || []))
      }

      // 6. Create order in database
      const order = await createOrderRecord(
        {
          order_number: orderNumber,
          table_id: table.id,
          customer_name: sanitizeString(orderData.customer_name),
          order_type: orderData.order_type,
          special_instructions: orderData.special_instructions ? sanitizeString(orderData.special_instructions) : null,
          customer_session_id: options.customer_session_id,
          priority_level: options.priority_level || 'normal'
        },
        processedItems,
        calculation
      )

      // 7. Update table status
      await updateTableStatus(table.id, 'occupied', order.id)

      // 8. Send notifications
      await sendOrderNotifications(order)

      // 9. Log audit trail
      await logOrderCreation(order, options.customer_session_id)

      // Commit transaction
      await supabaseAdmin.rpc('commit_transaction')

      return {
        success: true,
        order,
        warning_messages: warnings.length > 0 ? warnings : undefined
      }

    } catch (error) {
      // Rollback transaction
      await supabaseAdmin.rpc('rollback_transaction')
      throw error
    }

  } catch (error) {
    console.error('Error in processOrderCreation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    }
  }
}

/**
 * Get table information
 */
async function getTableInfo(tableNumber: number): Promise<{
  id: string
  table_number: number
  status: string
  capacity: number
  qr_code?: string
} | null> {
  try {
    const { data: table, error } = await supabaseAdmin
      .from('tables')
      .select('id, table_number, status, capacity, qr_code')
      .eq('table_number', tableNumber)
      .single()

    if (error || !table) {
      return null
    }

    return table
  } catch (error) {
    console.error('Error getting table info:', error)
    return null
  }
}

/**
 * Process and enrich order items with full details
 */
async function processOrderItems(
  items: Array<{
    menu_item_id: string
    quantity: number
    customizations?: Array<{
      customization_option_id: string
      value: string
    }>
    notes?: string
  }>
): Promise<ProcessedOrderItem[]> {
  const processedItems: ProcessedOrderItem[] = []

  for (const item of items) {
    try {
      // Get full menu item details
      const { data: menuItem, error } = await supabaseAdmin
        .from('menu_items')
        .select(`
          id, name, price, category, preparation_time, status,
          recipes(
            quantity_needed,
            ingredients(
              id, name, unit, cost_per_unit, current_stock
            )
          ),
          menu_customization_groups(
            id, name, type,
            menu_customization_options(
              id, name, additional_price
            )
          )
        `)
        .eq('id', item.menu_item_id)
        .single()

      if (error || !menuItem || menuItem.status !== 'active') {
        console.warn(`Skipping unavailable menu item: ${item.menu_item_id}`)
        continue
      }

      // Process customizations
      const processedCustomizations = await processCustomizations(
        item.customizations || [],
        menuItem.menu_customization_groups
      )

      // Calculate prices
      const customizationPrice = processedCustomizations.reduce(
        (sum, custom) => sum + custom.additional_price, 0
      )
      const unitPrice = menuItem.price + customizationPrice
      const totalPrice = unitPrice * item.quantity

      // Calculate ingredient usage
      const ingredientsUsed = calculateIngredientUsage(
        menuItem.recipes || [],
        item.quantity
      )

      processedItems.push({
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        category: menuItem.category,
        quantity: item.quantity,
        unit_price: unitPrice,
        base_price: menuItem.price,
        customization_price: customizationPrice,
        total_price: totalPrice,
        preparation_time: menuItem.preparation_time,
        customizations: processedCustomizations,
        notes: item.notes ? sanitizeString(item.notes) : undefined,
        ingredients_used: ingredientsUsed
      })

    } catch (error) {
      console.error(`Error processing item ${item.menu_item_id}:`, error)
      continue
    }
  }

  return processedItems
}

/**
 * Process customizations for an item
 */
async function processCustomizations(
  customizations: Array<{
    customization_option_id: string
    value: string
  }>,
  customizationGroups: any[]
): Promise<ProcessedCustomization[]> {
  const processed: ProcessedCustomization[] = []

  for (const customization of customizations) {
    // Find the option in the groups
    let foundOption = null
    let foundGroup = null

    for (const group of customizationGroups) {
      const option = group.menu_customization_options?.find(
        (opt: any) => opt.id === customization.customization_option_id
      )
      if (option) {
        foundOption = option
        foundGroup = group
        break
      }
    }

    if (foundOption && foundGroup) {
      processed.push({
        customization_option_id: (foundOption as any).id,
        customization_group_name: (foundGroup as any).name,
        option_name: (foundOption as any).name,
        value: sanitizeString(customization.value),
        additional_price: (foundOption as any).additional_price
      })
    }
  }

  return processed
}

/**
 * Calculate ingredient usage for order items
 */
function calculateIngredientUsage(
  recipes: any[],
  quantity: number
): IngredientUsage[] {
  return recipes.map(recipe => {
    const ingredient = recipe.ingredients
    const quantityUsed = recipe.quantity_needed * quantity
    const totalCost = quantityUsed * ingredient.cost_per_unit

    return {
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      quantity_used: quantityUsed,
      unit: ingredient.unit,
      cost_per_unit: ingredient.cost_per_unit,
      total_cost: totalCost
    }
  })
}

/**
 * Calculate order totals with taxes and service charges
 */
export function calculateOrderTotals(
  items: ProcessedOrderItem[],
  discount?: {
    type: 'percentage' | 'fixed'
    value: number
    promo_code?: string
  }
): OrderCalculation {
  // Calculate subtotals
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)
  const customizationTotal = items.reduce((sum, item) => sum + (item.customization_price * item.quantity), 0)
  
  // Calculate total cost (for profit calculation)
  const totalCost = items.reduce((sum, item) => 
    sum + item.ingredients_used.reduce((costSum, ingredient) => costSum + ingredient.total_cost, 0), 0
  )

  // Apply discount
  let discountAmount = 0
  if (discount) {
    if (discount.type === 'percentage') {
      discountAmount = subtotal * (discount.value / 100)
    } else {
      discountAmount = discount.value
    }
    discountAmount = Math.min(discountAmount, subtotal) // Don't exceed subtotal
  }

  const discountedSubtotal = subtotal - discountAmount

  // Calculate tax (PPN 11% on discounted subtotal)
  const taxAmount = discountedSubtotal * 0.11

  // Calculate service charge (5% on discounted subtotal)
  const serviceCharge = discountedSubtotal * 0.05

  // Calculate total
  const totalAmount = discountedSubtotal + taxAmount + serviceCharge

  // Calculate profit margin
  const profitMargin = totalCost > 0 ? ((totalAmount - totalCost) / totalAmount) * 100 : 0

  return {
    subtotal: sanitizeAmount(subtotal),
    customization_total: sanitizeAmount(customizationTotal),
    tax_amount: sanitizeAmount(taxAmount),
    service_charge: sanitizeAmount(serviceCharge),
    discount_amount: sanitizeAmount(discountAmount),
    total_amount: sanitizeAmount(totalAmount),
    total_cost: sanitizeAmount(totalCost),
    profit_margin: Math.round(profitMargin * 100) / 100 // Round to 2 decimal places
  }
}

/**
 * Generate unique order number
 */
export async function generateOrderNumber(): Promise<string> {
  try {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
    
    // Get today's order count for sequential numbering
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
    
    const count = orders ? orders.length : 0

    if (error) {
      console.error('Error getting order count:', error)
      // Fallback to timestamp-based numbering
      const timestamp = Date.now().toString().slice(-6)
      return `ORD-${dateStr}-${timestamp}`
    }

    const sequenceNumber = String((count || 0) + 1).padStart(4, '0')
    return `ORD-${dateStr}-${sequenceNumber}`

  } catch (error) {
    console.error('Error generating order number:', error)
    // Ultimate fallback
    const timestamp = Date.now().toString().slice(-8)
    return `ORD-${timestamp}`
  }
}

/**
 * Reserve stock for order items
 */
async function reserveStockForOrder(
  items: ProcessedOrderItem[]
): Promise<{
  success: boolean
  error?: string
  warnings?: string[]
}> {
  const warnings: string[] = []

  try {
    // Group ingredient usage by ingredient_id
    const ingredientUsage = new Map<string, {
      ingredient_id: string
      ingredient_name: string
      total_needed: number
      unit: string
      current_stock: number
    }>()

    items.forEach(item => {
      item.ingredients_used.forEach(ingredient => {
        const existing = ingredientUsage.get(ingredient.ingredient_id)
        if (existing) {
          existing.total_needed += ingredient.quantity_used
        } else {
          ingredientUsage.set(ingredient.ingredient_id, {
            ingredient_id: ingredient.ingredient_id,
            ingredient_name: ingredient.ingredient_name,
            total_needed: ingredient.quantity_used,
            unit: ingredient.unit,
            current_stock: 0 // Will be fetched
          })
        }
      })
    })

    // Check current stock levels
    for (const [ingredientId, usage] of ingredientUsage) {
      const { data: ingredient, error } = await supabaseAdmin
        .from('ingredients')
        .select('current_stock, min_stock')
        .eq('id', ingredientId)
        .single()

      if (error || !ingredient) {
        return {
          success: false,
          error: `Cannot verify stock for ingredient: ${usage.ingredient_name}`
        }
      }

      usage.current_stock = ingredient.current_stock

      // Check if enough stock available
      if (ingredient.current_stock < usage.total_needed) {
        return {
          success: false,
          error: `Insufficient stock for ${usage.ingredient_name}. Available: ${ingredient.current_stock} ${usage.unit}, Needed: ${usage.total_needed} ${usage.unit}`
        }
      }

      // Check if this will bring stock below minimum
      const remainingStock = ingredient.current_stock - usage.total_needed
      if (remainingStock <= ingredient.min_stock) {
        warnings.push(`Low stock warning: ${usage.ingredient_name} will have ${remainingStock} ${usage.unit} remaining (minimum: ${ingredient.min_stock})`)
      }
    }

    // NOTE: We don't actually deduct stock here - that happens when order is confirmed (payment verified)
    // This is just a reservation check to ensure stock is available

    return {
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined
    }

  } catch (error) {
    console.error('Error reserving stock:', error)
    return {
      success: false,
      error: 'Stock reservation system error'
    }
  }
}

/**
 * Create order record in database
 */
async function createOrderRecord(
  orderDetails: {
    order_number: string
    table_id: string
    customer_name: string
    order_type: 'dine_in' | 'takeaway'
    special_instructions?: string | null
    customer_session_id?: string
    priority_level: 'normal' | 'high' | 'urgent'
  },
  items: ProcessedOrderItem[],
  calculation: OrderCalculation
): Promise<ProcessedOrder> {
  try {
    // Calculate estimated completion time
    const maxPrepTime = Math.max(...items.map(item => item.preparation_time))
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const baseTime = 10 // Base 10 minutes
    const timePerItem = 2 // 2 minutes per item
    const estimatedTime = Math.max(maxPrepTime, baseTime + (totalItems * timePerItem))
    
    const estimatedCompletionTime = new Date(Date.now() + estimatedTime * 60000)

    // Create main order record
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderDetails.order_number,
        table_id: orderDetails.table_id,
        customer_name: orderDetails.customer_name,
        order_type: orderDetails.order_type,
        status: 'pending',
        subtotal: calculation.subtotal,
        tax_amount: calculation.tax_amount,
        service_charge: calculation.service_charge,
        discount_amount: calculation.discount_amount,
        total_amount: calculation.total_amount,
        estimated_completion_time: estimatedCompletionTime.toISOString(),
        special_instructions: orderDetails.special_instructions,
        customer_session_id: orderDetails.customer_session_id,
        priority_level: orderDetails.priority_level
      })
      .select()
      .single()

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`)
    }

    // Create order items
    const orderItems = items.map(item => ({
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
      throw new Error(`Failed to create order items: ${itemsError.message}`)
    }

    // Create order customizations
    for (const item of items) {
      if (item.customizations.length > 0) {
        const customizations = item.customizations.map(custom => ({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          customization_option_id: custom.customization_option_id,
          value: custom.value,
          additional_price: custom.additional_price
        }))

        const { error: customError } = await supabaseAdmin
          .from('order_customizations')
          .insert(customizations)

        if (customError) {
          console.error('Error creating customizations:', customError)
          // Non-critical error, continue processing
        }
      }
    }

    return {
      id: order.id,
      order_number: order.order_number,
      table_id: order.table_id,
      customer_name: order.customer_name,
      order_type: order.order_type,
      status: 'pending',
      items,
      calculation,
      estimated_completion_time: estimatedCompletionTime.toISOString(),
      special_instructions: order.special_instructions,
      customer_session_id: order.customer_session_id,
      created_at: order.created_at
    }

  } catch (error) {
    console.error('Error creating order record:', error)
    throw error
  }
}

/**
 * Update table status
 */
async function updateTableStatus(
  tableId: string, 
  status: 'available' | 'occupied' | 'reserved' | 'cleaning',
  orderId?: string
): Promise<void> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'occupied' && orderId) {
      updateData.current_order_id = orderId
    } else if (status === 'available') {
      updateData.current_order_id = null
    }

    await supabaseAdmin
      .from('tables')
      .update(updateData)
      .eq('id', tableId)

  } catch (error) {
    console.error('Error updating table status:', error)
  }
}

/**
 * Send notifications for new order
 */
async function sendOrderNotifications(order: ProcessedOrder): Promise<void> {
  try {
    // Create in-app notification for kasir
    await supabaseAdmin
      .from('notifications')
      .insert({
        type: 'order_received',
        title: 'Pesanan Baru',
        message: `Order ${order.order_number} dari meja ${order.table_id} - Total: Rp ${order.calculation.total_amount.toLocaleString('id-ID')}`,
        data: {
          order_id: order.id,
          order_number: order.order_number,
          table_id: order.table_id,
          total_amount: order.calculation.total_amount,
          items_count: order.items.length
        },
        channel: 'in_app',
        target_role: 'kasir'
      })

    // Create notification for owner
    await supabaseAdmin
      .from('notifications')
      .insert({
        type: 'order_received',
        title: 'Order Baru',
        message: `${order.order_number}: ${order.items.length} item, Rp ${order.calculation.total_amount.toLocaleString('id-ID')}`,
        data: {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          total_amount: order.calculation.total_amount
        },
        channel: 'in_app',
        target_role: 'owner'
      })

  } catch (error) {
    console.error('Error sending notifications:', error)
  }
}

/**
 * Log order creation for audit trail
 */
async function logOrderCreation(
  order: ProcessedOrder,
  customerSessionId?: string
): Promise<void> {
  try {
    await logAudit(
      customerSessionId || 'system',
      'CREATE_ORDER',
      {
        order_id: order.id,
        order_number: order.order_number,
        table_id: order.table_id,
        customer_name: order.customer_name,
        total_amount: order.calculation.total_amount,
        items_count: order.items.length,
        order_type: order.order_type
      },
      'orders',
      order.id
    )
  } catch (error) {
    console.error('Error logging order creation:', error)
  }
}

/**
 * Get order processing statistics
 */
export async function getOrderProcessingStats(): Promise<{
  orders_today: number
  revenue_today: number
  average_order_value: number
  peak_hour: string
  top_selling_item: string
}> {
  try {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    // Get orders today
    const { data: todayOrders, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .eq('status', 'completed')

    if (error) {
      throw error
    }

    const ordersToday = todayOrders?.length || 0
    const revenueToday = todayOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0
    const averageOrderValue = ordersToday > 0 ? revenueToday / ordersToday : 0

    return {
      orders_today: ordersToday,
      revenue_today: revenueToday,
      average_order_value: averageOrderValue,
      peak_hour: 'N/A', // TODO: Implement peak hour calculation
      top_selling_item: 'N/A' // TODO: Implement top selling item
    }

  } catch (error) {
    console.error('Error getting order processing stats:', error)
    return {
      orders_today: 0,
      revenue_today: 0,
      average_order_value: 0,
      peak_hour: 'N/A',
      top_selling_item: 'N/A'
    }
  }
}