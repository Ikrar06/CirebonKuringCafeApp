'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Types
export interface RevenueData {
  date: string
  revenue: number
  orders: number
  averageOrderValue: number
}

export interface MenuItemPerformance {
  id: string
  name: string
  category: string
  totalSold: number
  revenue: number
  profitMargin: number
  popularity: number
}

export interface PeakHourData {
  hour: number
  orders: number
  revenue: number
}

export interface CustomerMetrics {
  totalCustomers: number
  repeatCustomers: number
  averageOrdersPerCustomer: number
  customerRetentionRate: number
}

export interface AnalyticsSummary {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  totalProfit: number
  profitMargin: number
  growthRate: number
}

export interface DateRange {
  startDate: string
  endDate: string
}

class AnalyticsService {
  // Get revenue data over time
  async getRevenueData(dateRange: DateRange): Promise<RevenueData[]> {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, total_amount, status')
        .eq('status', 'completed')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by date
      const revenueByDate = new Map<string, { revenue: number; orders: number }>()

      orders?.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        const current = revenueByDate.get(date) || { revenue: 0, orders: 0 }
        current.revenue += parseFloat(order.total_amount?.toString() || '0')
        current.orders += 1
        revenueByDate.set(date, current)
      })

      return Array.from(revenueByDate.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
        averageOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
      }))
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      throw error
    }
  }

  // Get menu item performance
  async getMenuPerformance(dateRange: DateRange): Promise<MenuItemPerformance[]> {
    try {
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          subtotal,
          item_price,
          item_name,
          menu_items (
            id,
            name,
            cost_price,
            menu_categories (
              name
            )
          ),
          orders!inner (
            status,
            created_at
          )
        `)
        .eq('orders.status', 'completed')
        .gte('orders.created_at', dateRange.startDate)
        .lte('orders.created_at', dateRange.endDate)

      if (error) throw error

      // Group by menu item
      const performanceMap = new Map<string, {
        id: string
        name: string
        category: string
        totalSold: number
        revenue: number
        cost: number
      }>()

      orderItems?.forEach((item: any) => {
        if (!item.menu_items) return

        const itemId = item.menu_items.id
        const itemName = item.menu_items.name || item.item_name || 'Unknown'
        const category = item.menu_items.menu_categories?.name || 'Other'

        const current = performanceMap.get(itemId) || {
          id: itemId,
          name: itemName,
          category: category,
          totalSold: 0,
          revenue: 0,
          cost: 0
        }

        current.totalSold += item.quantity
        current.revenue += parseFloat(item.subtotal?.toString() || '0')
        current.cost += item.quantity * parseFloat(item.menu_items.cost_price?.toString() || '0')

        performanceMap.set(itemId, current)
      })

      const totalSold = Array.from(performanceMap.values())
        .reduce((sum, item) => sum + item.totalSold, 0)

      return Array.from(performanceMap.values())
        .map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          totalSold: item.totalSold,
          revenue: item.revenue,
          profitMargin: item.revenue > 0 ? ((item.revenue - item.cost) / item.revenue) * 100 : 0,
          popularity: totalSold > 0 ? (item.totalSold / totalSold) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
    } catch (error) {
      console.error('Error fetching menu performance:', error)
      throw error
    }
  }

  // Get peak hours analysis
  async getPeakHours(dateRange: DateRange): Promise<PeakHourData[]> {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('status', 'completed')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate)

      if (error) throw error

      // Group by hour
      const hourData = new Map<number, { orders: number; revenue: number }>()

      for (let i = 0; i < 24; i++) {
        hourData.set(i, { orders: 0, revenue: 0 })
      }

      orders?.forEach(order => {
        const hour = new Date(order.created_at).getHours()
        const current = hourData.get(hour)!
        current.orders += 1
        current.revenue += parseFloat(order.total_amount?.toString() || '0')
        hourData.set(hour, current)
      })

      return Array.from(hourData.entries()).map(([hour, data]) => ({
        hour,
        orders: data.orders,
        revenue: data.revenue
      }))
    } catch (error) {
      console.error('Error fetching peak hours:', error)
      throw error
    }
  }

  // Get customer metrics
  async getCustomerMetrics(dateRange: DateRange): Promise<CustomerMetrics> {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_phone, created_at')
        .eq('status', 'completed')
        .not('customer_phone', 'is', null)
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate)

      if (error) throw error

      const customerOrders = new Map<string, number>()
      orders?.forEach(order => {
        if (order.customer_phone) {
          const count = customerOrders.get(order.customer_phone) || 0
          customerOrders.set(order.customer_phone, count + 1)
        }
      })

      const totalCustomers = customerOrders.size
      const repeatCustomers = Array.from(customerOrders.values())
        .filter(count => count > 1).length
      const totalOrders = orders?.length || 0
      const averageOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0
      const customerRetentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0

      return {
        totalCustomers,
        repeatCustomers,
        averageOrdersPerCustomer,
        customerRetentionRate
      }
    } catch (error) {
      console.error('Error fetching customer metrics:', error)
      throw error
    }
  }

  // Get analytics summary
  async getAnalyticsSummary(dateRange: DateRange, previousDateRange: DateRange): Promise<AnalyticsSummary> {
    try {
      // Current period
      const { data: currentOrders, error: currentError } = await supabase
        .from('orders')
        .select('total_amount, subtotal, discount_amount')
        .eq('status', 'completed')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate)

      if (currentError) throw currentError

      // Previous period for comparison
      const { data: previousOrders, error: previousError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('created_at', previousDateRange.startDate)
        .lte('created_at', previousDateRange.endDate)

      if (previousError) throw previousError

      // Get menu items with cost
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          menu_items!inner (
            cost_price
          ),
          orders!inner (
            status,
            created_at
          )
        `)
        .eq('orders.status', 'completed')
        .gte('orders.created_at', dateRange.startDate)
        .lte('orders.created_at', dateRange.endDate)

      if (itemsError) throw itemsError

      const totalRevenue = currentOrders?.reduce((sum, o) =>
        sum + parseFloat(o.total_amount?.toString() || '0'), 0) || 0
      const totalOrders = currentOrders?.length || 0
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Calculate cost
      const totalCost = orderItems?.reduce((sum, item: any) =>
        sum + (item.quantity * parseFloat(item.menu_items?.cost_price?.toString() || '0')), 0) || 0

      const totalProfit = totalRevenue - totalCost
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

      // Calculate growth rate
      const previousRevenue = previousOrders?.reduce((sum, o) =>
        sum + parseFloat(o.total_amount?.toString() || '0'), 0) || 0
      const growthRate = previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalProfit,
        profitMargin,
        growthRate
      }
    } catch (error) {
      console.error('Error fetching analytics summary:', error)
      throw error
    }
  }

  // Get top selling items
  async getTopSellingItems(dateRange: DateRange, limit: number = 10): Promise<MenuItemPerformance[]> {
    const performance = await this.getMenuPerformance(dateRange)
    return performance.slice(0, limit)
  }

  // Get sales by category
  async getSalesByCategory(dateRange: DateRange): Promise<{ category: string; revenue: number; orders: number }[]> {
    try {
      const performance = await this.getMenuPerformance(dateRange)
      const categoryData = new Map<string, { revenue: number; orders: number }>()

      performance.forEach(item => {
        const current = categoryData.get(item.category) || { revenue: 0, orders: 0 }
        current.revenue += item.revenue
        current.orders += item.totalSold
        categoryData.set(item.category, current)
      })

      return Array.from(categoryData.entries())
        .map(([category, data]) => ({
          category,
          revenue: data.revenue,
          orders: data.orders
        }))
        .sort((a, b) => b.revenue - a.revenue)
    } catch (error) {
      console.error('Error fetching sales by category:', error)
      throw error
    }
  }

  // Helper: Get date range for period
  getDateRangeForPeriod(period: 'today' | 'week' | 'month' | 'year'): DateRange {
    const now = new Date()
    const endDate = now.toISOString()
    let startDate: Date

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
    }

    return {
      startDate: startDate.toISOString(),
      endDate
    }
  }

  // Helper: Get previous period for comparison
  getPreviousPeriod(dateRange: DateRange): DateRange {
    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)
    const duration = end.getTime() - start.getTime()

    return {
      startDate: new Date(start.getTime() - duration).toISOString(),
      endDate: start.toISOString()
    }
  }
}

export const analyticsService = new AnalyticsService()
export default analyticsService
