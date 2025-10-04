'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface DashboardMetrics {
  totalRevenue: number
  todayRevenue: number
  ordersToday: number
  activeOrders: number
  activeTables: number
  totalTables: number
  lowStockItems: number
  pendingOrders: number
  lastUpdated: Date
}

export interface RealtimeOrder {
  id: string
  table_id: string
  table_number: string
  customer_name: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered'
  created_at: string
  updated_at: string
}

export function useRealtime() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentOrders, setRecentOrders] = useState<RealtimeOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Fetch initial dashboard metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setError(null)

      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      // Fetch orders data
      const ordersResponse = await supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())

      const orders = ordersResponse.data || []
      console.log('Orders fetched:', orders.length)

      if (ordersResponse.error) {
        console.error('Orders error:', ordersResponse.error)
        // Continue with empty data instead of throwing
      }

      // Fetch tables data (optional - may not exist)
      const tablesResponse = await supabase
        .from('tables')
        .select('status, is_active')
        .eq('is_active', true)

      const tables = tablesResponse.data || []
      console.log('Tables fetched:', tables.length)

      if (tablesResponse.error) {
        console.error('Tables error:', tablesResponse.error)
        // Continue with empty data
      }

      // Fetch ingredients data (optional)
      const ingredientsResponse = await supabase
        .from('ingredients')
        .select('id, current_stock, min_stock_level, is_active')

      const ingredients = ingredientsResponse.data || []
      console.log('Ingredients fetched:', ingredients.length)
      console.log('Ingredients data:', ingredients)
      console.log('Ingredients error:', ingredientsResponse.error)
      console.log('Ingredients status:', ingredientsResponse.status)

      if (ingredientsResponse.error) {
        console.error('Ingredients error details:', ingredientsResponse.error)
        // Continue with empty data
      } else if (ingredients.length === 0) {
        console.warn('⚠️ Ingredients table is empty. Dashboard will show 0 low stock items.')
        console.warn('💡 To add ingredients, run INSERT statements in Supabase SQL Editor')
      }

      // Calculate metrics
      const todayRevenue = orders
        .filter((order: any) => ['completed', 'delivered'].includes(order.status))
        .reduce((sum, order: any) => sum + parseFloat(order.total_amount || 0), 0)

      const ordersToday = orders.length

      const activeOrders = orders.filter((order: any) =>
        ['confirmed', 'preparing', 'ready'].includes(order.status)
      ).length

      const activeTables = tables.filter((table: any) =>
        table.status === 'occupied'
      ).length

      const totalTables = tables.length

      const lowStockItems = ingredients.filter((item: any) =>
        parseFloat(item.current_stock || 0) <= parseFloat(item.min_stock_level || 0)
      ).length

      const pendingOrders = orders.filter((order: any) =>
        order.status === 'pending_payment' || order.status === 'payment_verification'
      ).length

      // For total revenue, we'd need historical data - using mock for now
      const totalRevenue = todayRevenue * 30 // Rough monthly estimate

      const newMetrics: DashboardMetrics = {
        totalRevenue,
        todayRevenue,
        ordersToday,
        activeOrders,
        activeTables,
        totalTables,
        lowStockItems,
        pendingOrders,
        lastUpdated: new Date()
      }

      setMetrics(newMetrics)
      setIsLoading(false)

    } catch (err) {
      console.error('Error fetching metrics:', err)
      const errorMessage = err instanceof Error ? err.message :
        typeof err === 'string' ? err :
        'Failed to fetch metrics. Please check your database connection.'
      setError(errorMessage)
      setIsLoading(false)
    }
  }, [])

  // Fetch recent orders
  const fetchRecentOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          table_id,
          customer_name,
          total_amount,
          status,
          created_at,
          updated_at,
          tables (
            table_number
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const formattedOrders: RealtimeOrder[] = (data || []).map(order => ({
        id: order.id,
        table_id: order.table_id,
        table_number: (order.tables as any)?.table_number || 'Unknown',
        customer_name: order.customer_name || 'Guest',
        total_amount: order.total_amount || 0,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at
      }))

      setRecentOrders(formattedOrders)

    } catch (err) {
      console.error('Error fetching recent orders:', err)
    }
  }, [])

  // Setup real-time subscriptions
  useEffect(() => {
    let ordersSubscription: any
    let tablesSubscription: any

    const setupSubscriptions = async () => {
      try {
        setIsConnected(true)

        // Subscribe to orders changes
        ordersSubscription = supabase
          .channel('orders-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'orders'
          }, () => {
            // Refetch metrics and recent orders when orders change
            fetchMetrics()
            fetchRecentOrders()
          })
          .subscribe()

        // Subscribe to tables changes
        tablesSubscription = supabase
          .channel('tables-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'tables'
          }, () => {
            // Refetch metrics when table status changes
            fetchMetrics()
          })
          .subscribe()

      } catch (err) {
        console.error('Error setting up subscriptions:', err)
        setIsConnected(false)
      }
    }

    // Initial data fetch
    fetchMetrics()
    fetchRecentOrders()

    // Setup subscriptions
    setupSubscriptions()

    // Cleanup subscriptions
    return () => {
      if (ordersSubscription) {
        supabase.removeChannel(ordersSubscription)
      }
      if (tablesSubscription) {
        supabase.removeChannel(tablesSubscription)
      }
    }
  }, [fetchMetrics, fetchRecentOrders])

  // Refresh data manually
  const refresh = useCallback(() => {
    setIsLoading(true)
    fetchMetrics()
    fetchRecentOrders()
  }, [fetchMetrics, fetchRecentOrders])

  return {
    metrics,
    recentOrders,
    isLoading,
    error,
    isConnected,
    refresh
  }
}
