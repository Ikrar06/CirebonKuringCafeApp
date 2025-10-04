'use client'

import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient()

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  subtotal: number
  special_instructions?: string
  menu_items?: {
    id: string
    name: string
    image_url?: string
  }
}

export interface Order {
  id: string
  order_number: string
  table_id?: string
  customer_name?: string
  customer_phone?: string
  order_type: 'dine_in' | 'takeaway' | 'delivery'
  status: 'pending_payment' | 'payment_verification' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled'
  subtotal: number
  tax_amount: number
  service_charge: number
  discount_amount: number
  total_amount: number
  payment_status: 'pending' | 'processing' | 'verified' | 'failed' | 'refunded'
  payment_method?: 'cash' | 'qris' | 'transfer' | 'card'
  payment_proof_url?: string
  special_instructions?: string
  created_at: string
  updated_at: string
  confirmed_at?: string
  preparing_at?: string
  ready_at?: string
  served_at?: string
  delivered_at?: string
  completed_at?: string
  tables?: {
    id: string
    table_number: string
    status: string
  }
  order_items?: OrderItem[]
}

export interface OrderStats {
  totalOrders: number
  pendingOrders: number
  preparingOrders: number
  readyOrders: number
  completedToday: number
  averagePreparationTime: number
  totalRevenue: number
}

export interface KitchenMetrics {
  activeOrders: number
  avgPrepTime: number
  oldestOrderMinutes: number
  itemsInQueue: number
}

class OrderService {
  private channel: RealtimeChannel | null = null

  // Get orders with filters
  async getOrders(filters?: {
    status?: string
    order_type?: string
    table_id?: string
    date_from?: string
    date_to?: string
  }): Promise<Order[]> {
    try {
      console.log('OrderService: Fetching orders with filters:', filters)
      let query = supabase
        .from('orders')
        .select(`
          *,
          tables (
            id,
            table_number,
            status
          ),
          order_items (
            *,
            menu_items (
              id,
              name,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.order_type) {
        query = query.eq('order_type', filters.order_type)
      }

      if (filters?.table_id) {
        query = query.eq('table_id', filters.table_id)
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      console.log('OrderService: Executing query...')
      const { data, error } = await query

      if (error) {
        console.error('OrderService: Query error:', error)
        throw error
      }

      console.log('OrderService: Query successful, rows:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('Error fetching orders:', error)
      throw error
    }
  }

  // Get live/active orders (pending_payment, payment_verification, confirmed, preparing, ready, delivered)
  async getLiveOrders(): Promise<Order[]> {
    try {
      console.log('OrderService: Fetching live orders...')
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tables (
            id,
            table_number,
            status
          ),
          order_items (
            *,
            menu_items (
              id,
              name,
              image_url
            )
          )
        `)
        .in('status', ['pending_payment', 'payment_verification', 'confirmed', 'preparing', 'ready', 'delivered'])
        .order('created_at', { ascending: true })

      if (error) {
        console.error('OrderService: Live orders query error:', error)
        throw error
      }

      console.log('OrderService: Live orders fetched successfully, rows:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('Error fetching live orders:', error)
      throw error
    }
  }

  // Get single order by ID
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tables (
            id,
            table_number,
            status
          ),
          order_items (
            *,
            menu_items (
              id,
              name,
              image_url
            )
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching order:', error)
      throw error
    }
  }

  // Update order status
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    try {
      const timestampField = this.getTimestampField(status)
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (timestampField) {
        updateData[timestampField] = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select(`
          *,
          tables (
            id,
            table_number,
            status
          ),
          order_items (
            *,
            menu_items (
              id,
              name,
              image_url
            )
          )
        `)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  }

  // Get timestamp field based on status
  private getTimestampField(status: Order['status']): string | null {
    const fieldMap: Record<string, string> = {
      confirmed: 'confirmed_at',
      preparing: 'preparing_at',
      ready: 'ready_at',
      delivered: 'delivered_at',
      completed: 'completed_at'
    }
    return fieldMap[status] || null
  }

  // Get order statistics
  async getOrderStats(): Promise<OrderStats> {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get all orders
      const { data: allOrders, error: allError } = await supabase
        .from('orders')
        .select('status, total_amount, created_at, preparing_at, ready_at')

      if (allError) throw allError

      // Get today's completed orders
      const { data: todayOrders, error: todayError} = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00`)

      if (todayError) throw todayError

      // Calculate stats
      const totalOrders = allOrders?.length || 0
      const pendingOrders = allOrders?.filter(o => ['pending_payment', 'payment_verification'].includes(o.status)).length || 0
      const preparingOrders = allOrders?.filter(o => o.status === 'preparing').length || 0
      const readyOrders = allOrders?.filter(o => o.status === 'ready').length || 0
      const completedToday = todayOrders?.length || 0
      const totalRevenue = todayOrders?.reduce((sum, o) => sum + (parseFloat(o.total_amount?.toString() || '0')), 0) || 0

      // Calculate average preparation time
      const ordersWithPrepTime = allOrders?.filter(o => o.preparing_at && o.ready_at) || []
      let avgPrepTime = 0
      if (ordersWithPrepTime.length > 0) {
        const totalPrepTime = ordersWithPrepTime.reduce((sum, order) => {
          const prepTime = new Date(order.ready_at!).getTime() - new Date(order.preparing_at!).getTime()
          return sum + prepTime
        }, 0)
        avgPrepTime = Math.round(totalPrepTime / ordersWithPrepTime.length / 1000 / 60) // Convert to minutes
      }

      return {
        totalOrders,
        pendingOrders,
        preparingOrders,
        readyOrders,
        completedToday,
        averagePreparationTime: avgPrepTime,
        totalRevenue
      }
    } catch (error) {
      console.error('Error fetching order stats:', error)
      throw error
    }
  }

  // Get kitchen metrics
  async getKitchenMetrics(): Promise<KitchenMetrics> {
    try {
      const { data: activeOrders, error } = await supabase
        .from('orders')
        .select('created_at, preparing_at, order_items(quantity)')
        .in('status', ['confirmed', 'preparing'])

      if (error) throw error

      const activeOrdersCount = activeOrders?.length || 0
      const itemsInQueue = activeOrders?.reduce((sum, order) => {
        return sum + (order.order_items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0)
      }, 0) || 0

      // Calculate oldest order age
      let oldestOrderMinutes = 0
      if (activeOrders && activeOrders.length > 0) {
        const oldestOrder = activeOrders.reduce((oldest, order) => {
          const orderTime = new Date(order.created_at).getTime()
          const oldestTime = new Date(oldest.created_at).getTime()
          return orderTime < oldestTime ? order : oldest
        })
        oldestOrderMinutes = Math.round((Date.now() - new Date(oldestOrder.created_at).getTime()) / 1000 / 60)
      }

      // Calculate average prep time (from recent completed orders)
      const { data: recentCompleted } = await supabase
        .from('orders')
        .select('preparing_at, ready_at')
        .eq('status', 'completed')
        .not('preparing_at', 'is', null)
        .not('ready_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(20)

      let avgPrepTime = 0
      if (recentCompleted && recentCompleted.length > 0) {
        const totalPrepTime = recentCompleted.reduce((sum, order) => {
          const prepTime = new Date(order.ready_at!).getTime() - new Date(order.preparing_at!).getTime()
          return sum + prepTime
        }, 0)
        avgPrepTime = Math.round(totalPrepTime / recentCompleted.length / 1000 / 60)
      }

      return {
        activeOrders: activeOrdersCount,
        avgPrepTime,
        oldestOrderMinutes,
        itemsInQueue
      }
    } catch (error) {
      console.error('Error fetching kitchen metrics:', error)
      throw error
    }
  }

  // Subscribe to real-time order updates
  subscribeToOrders(callback: (payload: any) => void): RealtimeChannel {
    this.channel = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        callback
      )
      .subscribe()

    return this.channel
  }

  // Unsubscribe from real-time updates
  unsubscribeFromOrders(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }
  }

  // Calculate order preparation time
  getOrderPreparationTime(order: Order): number | null {
    if (!order.preparing_at || !order.ready_at) return null
    const prepTime = new Date(order.ready_at).getTime() - new Date(order.preparing_at).getTime()
    return Math.round(prepTime / 1000 / 60) // Minutes
  }

  // Calculate order age (how long since created)
  getOrderAge(order: Order): number {
    const age = Date.now() - new Date(order.created_at).getTime()
    return Math.round(age / 1000 / 60) // Minutes
  }

  // Get order status color
  getOrderStatusColor(status: Order['status']): string {
    const colorMap: Record<Order['status'], string> = {
      pending_payment: 'yellow',
      payment_verification: 'orange',
      confirmed: 'blue',
      preparing: 'orange',
      ready: 'green',
      delivered: 'purple',
      completed: 'gray',
      cancelled: 'red'
    }
    return colorMap[status] || 'gray'
  }

  // Format order time
  formatOrderTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.round((now.getTime() - date.getTime()) / 1000 / 60)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.round(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }
}

export const orderService = new OrderService()
export default orderService
