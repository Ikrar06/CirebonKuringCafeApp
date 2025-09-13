'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types
interface OrderItem {
  id: string
  quantity: number
  subtotal: number
  customizations?: any[]
  menu_item: {
    id: string
    name: string
    image_url?: string
    price: number
  }
}

interface Order {
  id: string
  table_id: string
  customer_name: string
  customer_phone?: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  total_amount: number
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method?: 'cash' | 'card' | 'qris' | 'bank_transfer'
  promo_code?: string
  discount_amount?: number
  notes?: string
  estimated_completion?: string
  created_at: string
  updated_at: string
  items: OrderItem[]
  table_number?: number
  preparation_time?: number
  rating?: {
    overall_rating: number
    feedback?: string
    created_at: string
  }
}

interface UseOrderStatusReturn {
  order: Order | null
  loading: boolean
  error: string | null
  refreshOrder: () => void
  subscribeToUpdates: () => void
  unsubscribeFromUpdates: () => void
}

export function useOrderStatus(orderId: string): UseOrderStatusReturn {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isSubscribed = useRef(false)

  // Fetch order data
  const fetchOrder = useCallback(async () => {
    try {
      setError(null)
      
      // Get order data first
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) {
        throw new Error(orderError.message)
      }

      // Get order items separately (if table exists)
      let orderItems: OrderItem[] = []
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            id,
            quantity,
            subtotal,
            customizations,
            menu_item_id
          `)
          .eq('order_id', orderId)

        if (!itemsError && itemsData) {
          // Get menu item details for each order item
          const menuItemPromises = itemsData.map(async (item: any) => {
            const { data: menuItem } = await supabase
              .from('menu_items')
              .select('id, name, image_url, price')
              .eq('id', item.menu_item_id)
              .single()

            return {
              id: item.id,
              quantity: item.quantity,
              subtotal: item.subtotal,
              customizations: item.customizations,
              menu_item: menuItem || {
                id: item.menu_item_id,
                name: 'Unknown Item',
                image_url: null,
                price: 0
              }
            }
          })

          orderItems = await Promise.all(menuItemPromises)
        }
      } catch (error) {
        // Handle case where order_items table doesn't exist or relation is broken
        console.warn('Could not load order items:', error)
      }

      // Get ratings separately (if table exists) 
      let rating: any = undefined
      try {
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('order_ratings')
          .select('*')
          .eq('order_id', orderId)
          .limit(1)
          .single()

        if (!ratingsError && ratingsData) {
          rating = ratingsData
        }
      } catch (error) {
        // Handle case where order_ratings table doesn't exist
        console.warn('Could not load order rating:', error)
      }

      if (!orderData) {
        throw new Error('Pesanan tidak ditemukan')
      }

      // Transform the data to match our Order interface
      const transformedOrder: Order = {
        ...orderData,
        items: orderItems,
        rating: rating
      }

      setOrder(transformedOrder)
    } catch (err) {
      console.error('Error fetching order:', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  // Refresh order data manually
  const refreshOrder = useCallback(() => {
    setLoading(true)
    fetchOrder()
  }, [fetchOrder])

  // Subscribe to real-time updates
  const subscribeToUpdates = useCallback(() => {
    if (isSubscribed.current || !orderId) return

    try {
      // Create realtime subscription for order updates
      channelRef.current = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`
          },
          (payload: any) => {
            console.log('Order updated:', payload)
            
            // Update order state with new data
            setOrder(prevOrder => {
              if (!prevOrder) return null
              
              return {
                ...prevOrder,
                ...payload.new,
                items: prevOrder.items // Keep existing items
              }
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_items',
            filter: `order_id=eq.${orderId}`
          },
          (payload: any) => {
            console.log('Order items updated:', payload)
            // Refresh the full order data when items change
            fetchOrder()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_ratings',
            filter: `order_id=eq.${orderId}`
          },
          (payload: any) => {
            console.log('Rating added:', payload)
            
            setOrder(prevOrder => {
              if (!prevOrder) return null
              
              return {
                ...prevOrder,
                rating: {
                  overall_rating: payload.new.overall_rating,
                  feedback: payload.new.feedback,
                  created_at: payload.new.created_at
                }
              }
            })
          }
        )
        .subscribe((status: any) => {
          console.log('Subscription status:', status)
          if (status === 'SUBSCRIBED') {
            isSubscribed.current = true
          }
        })
    } catch (err) {
      console.error('Error setting up realtime subscription:', err)
    }
  }, [orderId, fetchOrder])

  // Unsubscribe from real-time updates
  const unsubscribeFromUpdates = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      isSubscribed.current = false
    }
  }, [])

  // Initialize data and subscription
  useEffect(() => {
    if (!orderId) return

    fetchOrder()
    subscribeToUpdates()

    // Cleanup subscription on unmount
    return () => {
      unsubscribeFromUpdates()
    }
  }, [orderId, fetchOrder, subscribeToUpdates, unsubscribeFromUpdates])

  // Periodic refresh for critical updates
  useEffect(() => {
    if (!orderId) return

    const interval = setInterval(() => {
      // Only refresh if order is in active status
      if (order && ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
        fetchOrder()
      }
    }, 60000) // Refresh every minute for active orders

    return () => clearInterval(interval)
  }, [orderId, order?.status, fetchOrder])

  // Handle connection state changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && orderId) {
        // Refresh data when page becomes visible
        fetchOrder()
        
        // Re-establish subscription if needed
        if (!isSubscribed.current) {
          subscribeToUpdates()
        }
      } else if (document.visibilityState === 'hidden') {
        // Clean up subscription when page is hidden to save resources
        unsubscribeFromUpdates()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [orderId, fetchOrder, subscribeToUpdates, unsubscribeFromUpdates])

  // Handle online/offline state
  useEffect(() => {
    const handleOnline = () => {
      if (orderId) {
        fetchOrder()
        subscribeToUpdates()
      }
    }

    const handleOffline = () => {
      unsubscribeFromUpdates()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [orderId, fetchOrder, subscribeToUpdates, unsubscribeFromUpdates])

  return {
    order,
    loading,
    error,
    refreshOrder,
    subscribeToUpdates,
    unsubscribeFromUpdates
  }
}