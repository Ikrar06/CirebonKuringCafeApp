/**
 * Order-related Database Queries
 * 
 * Centralized queries for order management, payment processing,
 * and order analytics with Indonesian cafe business logic
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../shared-types/src/database'
import { QueryBuilder, dbUtils } from '../client'

// Type definitions from database schema
type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderUpdate = Database['public']['Tables']['orders']['Update']

// Extended types for business logic
interface OrderWithItems extends Order {
  order_items: (OrderItem & {
    menu_item: {
      id: string
      name: string
      price: number
      image_url?: string
    }
  })[]
  table?: {
    id: string
    table_number: string
    capacity: number
  }
  payment?: {
    id: string
    method: string
    status: string
    amount: number
  }
}

interface OrderSummary {
  total_orders: number
  total_revenue: number
  average_order_value: number
  pending_orders: number
  completed_orders: number
  cancelled_orders: number
}

interface OrderAnalytics {
  hourly_breakdown: Array<{
    hour: number
    orders: number
    revenue: number
  }>
  payment_methods: Array<{
    method: string
    count: number
    total_amount: number
  }>
  top_items: Array<{
    menu_item_id: string
    name: string
    quantity_sold: number
    revenue: number
  }>
  table_performance: Array<{
    table_number: string
    orders: number
    revenue: number
    average_duration: number
  }>
}

/**
 * Order Query Service
 */
export class OrderQueries {
  private queryBuilder: QueryBuilder<Order>

  constructor(private client: SupabaseClient<Database>) {
    this.queryBuilder = new QueryBuilder(client, 'orders')
  }

  /**
   * Create a new order with items
   */
  async createOrderWithItems(orderData: {
    table_id?: string
    customer_name: string
    customer_phone?: string
    notes?: string
    items: Array<{
      menu_item_id: string
      quantity: number
      unit_price: number
      customizations?: any
      notes?: string
    }>
  }): Promise<{ data: OrderWithItems | null; error: any }> {
    try {
      // Calculate totals
      const subtotal = orderData.items.reduce(
        (sum, item) => sum + (item.quantity * item.unit_price), 
        0
      )
      const tax_amount = subtotal * 0.11 // PPN 11%
      const service_charge = subtotal * 0.05 // Service charge 5%
      const total_amount = subtotal + tax_amount + service_charge

      // Generate order number
      const order_number = await this.generateOrderNumber()

      // Create order
      const { data: order, error: orderError } = await (this.client as any)
        .from('orders')
        .insert({
          order_number,
          table_id: orderData.table_id,
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          subtotal,
          tax_amount,
          service_charge,
          total_amount,
          status: 'pending',
          notes: orderData.notes,
          created_at: dbUtils.formatDate(new Date())
        })
        .select()
        .single()

      if (orderError || !order) {
        return { data: null, error: orderError }
      }

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        customizations: item.customizations,
        notes: item.notes
      }))

      const { error: itemsError } = await (this.client as any)
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        // Rollback order creation
        await (this.client as any).from('orders').delete().eq('id', order.id)
        return { data: null, error: itemsError }
      }

      // Return order with items
      return await this.getOrderWithItems(order.id)

    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to create order', details: error }
      }
    }
  }

  /**
   * Get order with complete details
   */
  async getOrderWithItems(orderId: string): Promise<{ data: OrderWithItems | null; error: any }> {
    return await (this.client as any)
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items (
            id, name, price, image_url
          )
        ),
        table:tables (
          id, table_number, capacity
        ),
        payment:payments (
          id, method, status, amount
        )
      `)
      .eq('id', orderId)
      .single()
  }

  /**
   * Get orders with filtering and pagination
   */
  async getOrders(options: {
    status?: string[]
    table_id?: string
    date_from?: string
    date_to?: string
    customer_name?: string
    page?: number
    page_size?: number
    sort_by?: 'created_at' | 'total_amount' | 'status'
    sort_order?: 'asc' | 'desc'
  } = {}): Promise<{ data: OrderWithItems[] | null; error: any; count?: number }> {
    let query = (this.client as any)
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items (
            id, name, price, image_url
          )
        ),
        table:tables (
          id, table_number, capacity
        ),
        payment:payments (
          id, method, status, amount
        )
      `, { count: 'exact' })

    // Apply filters
    if (options.status && options.status.length > 0) {
      query = query.in('status', options.status)
    }

    if (options.table_id) {
      query = query.eq('table_id', options.table_id)
    }

    if (options.date_from) {
      query = query.gte('created_at', options.date_from)
    }

    if (options.date_to) {
      query = query.lte('created_at', options.date_to)
    }

    if (options.customer_name) {
      query = query.ilike('customer_name', `%${options.customer_name}%`)
    }

    // Apply sorting
    const sortBy = options.sort_by || 'created_at'
    const sortOrder = options.sort_order || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    if (options.page && options.page_size) {
      const offset = dbUtils.calculateOffset(options.page, options.page_size)
      query = query.range(offset, offset + options.page_size - 1)
    }

    return await query
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string, 
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled',
    updatedBy?: string
  ): Promise<{ data: Order | null; error: any }> {
    const updateData: OrderUpdate = {
      status,
      updated_at: dbUtils.formatDate(new Date())
    }

    // Add status-specific fields
    switch (status) {
      case 'confirmed':
        // Track confirmed status in order_status_history if needed
        break
      case 'preparing':
        // Track preparing status in order_status_history if needed
        break
      case 'ready':
        // Track ready status in order_status_history if needed
        break
      case 'served':
        // Track served status in order_status_history if needed
        break
      case 'cancelled':
        // Track cancelled status in order_status_history if needed
        break
    }

    return await this.queryBuilder.updateById(orderId, updateData)
  }

  /**
   * Get pending orders for kitchen display
   */
  async getKitchenOrders(): Promise<{ data: OrderWithItems[] | null; error: any }> {
    return await (this.client as any)
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items (
            id, name, preparation_time, category
          )
        ),
        table:tables (
          number
        )
      `)
      .in('status', ['confirmed', 'preparing'])
      .order('created_at', { ascending: true })
  }

  /**
   * Get orders ready for serving
   */
  async getReadyOrders(): Promise<{ data: OrderWithItems[] | null; error: any }> {
    return await (this.client as any)
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items (
            id, name
          )
        ),
        table:tables (
          number
        )
      `)
      .eq('status', 'ready')
      .order('created_at', { ascending: true })
  }

  /**
   * Get order summary statistics
   */
  async getOrderSummary(options: {
    date_from?: string
    date_to?: string
    table_id?: string
  } = {}): Promise<{ data: OrderSummary | null; error: any }> {
    try {
      let query = (this.client as any).from('orders').select('status, total_amount')

      if (options.date_from) {
        query = query.gte('created_at', options.date_from)
      }

      if (options.date_to) {
        query = query.lte('created_at', options.date_to)
      }

      if (options.table_id) {
        query = query.eq('table_id', options.table_id)
      }

      const { data: orders, error } = await query

      if (error) return { data: null, error }

      const summary: OrderSummary = {
        total_orders: orders?.length || 0,
        total_revenue: orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0,
        average_order_value: 0,
        pending_orders: orders?.filter((o: any) => o.status === 'pending').length || 0,
        completed_orders: orders?.filter((o: any) => o.status === 'served').length || 0,
        cancelled_orders: orders?.filter((o: any) => o.status === 'cancelled').length || 0,
      }

      summary.average_order_value = summary.total_orders > 0 
        ? summary.total_revenue / summary.total_orders 
        : 0

      return { data: summary, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get detailed order analytics
   */
  async getOrderAnalytics(options: {
    date_from?: string
    date_to?: string
  } = {}): Promise<{ data: OrderAnalytics | null; error: any }> {
    try {
      // Base query with date filters
      let baseQuery = (this.client as any)
        .from('orders')
        .select(`
          *,
          order_items (
            quantity, unit_price, total_price,
            menu_item:menu_items (
              id, name
            )
          ),
          table:tables (
            number
          ),
          payment:payments (
            method, amount
          )
        `)
        .eq('status', 'served') // Only completed orders

      if (options.date_from) {
        baseQuery = baseQuery.gte('created_at', options.date_from)
      }

      if (options.date_to) {
        baseQuery = baseQuery.lte('created_at', options.date_to)
      }

      const { data: orders, error } = await baseQuery

      if (error) return { data: null, error }

      // Process analytics
      const analytics: OrderAnalytics = {
        hourly_breakdown: this.calculateHourlyBreakdown(orders || []),
        payment_methods: this.calculatePaymentMethods(orders || []),
        top_items: this.calculateTopItems(orders || []),
        table_performance: this.calculateTablePerformance(orders || [])
      }

      return { data: analytics, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Search orders by multiple criteria
   */
  async searchOrders(searchTerm: string, options: {
    limit?: number
    status?: string[]
  } = {}): Promise<{ data: OrderWithItems[] | null; error: any }> {
    const searchColumns = ['order_number', 'customer_name', 'customer_phone']
    const searchQuery = dbUtils.buildSearchQuery(searchTerm, searchColumns)

    let query = (this.client as any)
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items (
            id, name, price
          )
        ),
        table:tables (
          id, table_number
        )
      `)

    if (searchQuery) {
      query = query.or(searchQuery)
    }

    if (options.status && options.status.length > 0) {
      query = query.in('status', options.status)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    query = query.order('created_at', { ascending: false })

    return await query
  }

  /**
   * Cancel order with reason
   */
  async cancelOrder(
    orderId: string, 
    reason: string, 
    cancelledBy?: string
  ): Promise<{ data: Order | null; error: any }> {
    return await this.queryBuilder.updateById(orderId, {
      status: 'cancelled',
      // cancelled_at tracked in order_status_history
      notes: reason, // Using notes field for cancellation reason
      updated_at: dbUtils.formatDate(new Date())
    })
  }

  /**
   * Get order duration statistics
   */
  async getOrderDurations(options: {
    date_from?: string
    date_to?: string
  } = {}): Promise<{ data: Array<{
    order_id: string
    order_number: string
    preparation_time: number
    service_time: number
    total_time: number
  }> | null; error: any }> {
    let query = (this.client as any)
      .from('orders')
      .select('id, order_number, created_at, updated_at')
      .eq('status', 'served')
      .in('status', ['confirmed', 'preparing', 'ready', 'served'])

    if (options.date_from) {
      query = query.gte('created_at', options.date_from)
    }

    if (options.date_to) {
      query = query.lte('created_at', options.date_to)
    }

    const { data: orders, error } = await query

    if (error) return { data: null, error }

    const durations = orders?.map((order: any) => {
      // Use order status history for detailed timing
      const created = new Date(order.created_at).getTime()
      const updated = new Date(order.updated_at).getTime()

      return {
        order_id: order.id,
        order_number: order.order_number,
        preparation_time: Math.round((updated - created) / (1000 * 60)), // minutes
        service_time: 0, // Would need order_status_history for detailed timing
        total_time: Math.round((updated - created) / (1000 * 60)) // minutes
      }
    }) || []

    return { data: durations, error: null }
  }

  /**
   * Private helper methods
   */
  private async generateOrderNumber(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    
    // Get count of orders today
    const { count } = await (this.client as any)
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today.toISOString().slice(0, 10)} 00:00:00`)
      .lte('created_at', `${today.toISOString().slice(0, 10)} 23:59:59`)

    const orderNumber = `ORD${dateStr}${String((count || 0) + 1).padStart(3, '0')}`
    return orderNumber
  }

  private calculateHourlyBreakdown(orders: any[]): OrderAnalytics['hourly_breakdown'] {
    const hourly = new Array(24).fill(0).map((_, hour) => ({
      hour,
      orders: 0,
      revenue: 0
    }))

    orders.forEach(order => {
      const hour = new Date(order.created_at).getHours()
      hourly[hour].orders++
      hourly[hour].revenue += order.total_amount || 0
    })

    return hourly
  }

  private calculatePaymentMethods(orders: any[]): OrderAnalytics['payment_methods'] {
    const methods = new Map<string, { count: number; total_amount: number }>()

    orders.forEach(order => {
      const method = order.payment?.method || 'cash'
      const existing = methods.get(method) || { count: 0, total_amount: 0 }
      existing.count++
      existing.total_amount += order.total_amount || 0
      methods.set(method, existing)
    })

    return Array.from(methods.entries()).map(([method, data]) => ({
      method,
      ...data
    }))
  }

  private calculateTopItems(orders: any[]): OrderAnalytics['top_items'] {
    const items = new Map<string, {
      name: string
      quantity_sold: number
      revenue: number
    }>()

    orders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const key = item.menu_item_id
        const existing = items.get(key) || {
          name: item.menu_item?.name || 'Unknown',
          quantity_sold: 0,
          revenue: 0
        }
        existing.quantity_sold += item.quantity
        existing.revenue += item.total_price || 0
        items.set(key, existing)
      })
    })

    return Array.from(items.entries())
      .map(([menu_item_id, data]) => ({ menu_item_id, ...data }))
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, 10)
  }

  private calculateTablePerformance(orders: any[]): OrderAnalytics['table_performance'] {
    const tables = new Map<string, {
      orders: number
      revenue: number
      total_duration: number
    }>()

    orders.forEach(order => {
      const tableNumber = order.table?.table_number
      if (!tableNumber) return

      const existing = tables.get(tableNumber) || {
        orders: 0,
        revenue: 0,
        total_duration: 0
      }

      existing.orders++
      existing.revenue += order.total_amount || 0

      // Calculate duration if available
      if (order.status === 'served' || order.status === 'completed') {
        const duration = new Date(order.updated_at).getTime() - new Date(order.created_at).getTime()
        existing.total_duration += duration / (1000 * 60) // minutes
      }

      tables.set(tableNumber, existing)
    })

    return Array.from(tables.entries()).map(([table_number, data]) => ({
      table_number,
      orders: data.orders,
      revenue: data.revenue,
      average_duration: data.orders > 0 ? Math.round(data.total_duration / data.orders) : 0
    }))
  }
}

/**
 * Factory function to create OrderQueries instance
 */
export function createOrderQueries(client: SupabaseClient<Database>): OrderQueries {
  return new OrderQueries(client)
}

// Export types
export type {
  Order,
  OrderItem,
  OrderWithItems,
  OrderSummary,
  OrderAnalytics,
  OrderInsert,
  OrderUpdate
}