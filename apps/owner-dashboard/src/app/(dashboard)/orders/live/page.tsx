'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, ChefHat, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import { orderService, Order, KitchenMetrics } from '@/services/orderService'
import OrderList from '../components/OrderList'
import LiveOrderMap from '../components/LiveOrderMap'
import StatCard from '@/components/dashboard/StatCard'

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [kitchenMetrics, setKitchenMetrics] = useState<KitchenMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Load initial data
  useEffect(() => {
    console.log('LiveOrdersPage: Loading initial data...')
    loadOrders()
    loadKitchenMetrics()
  }, [])

  // Setup real-time subscription
  useEffect(() => {
    const channel = orderService.subscribeToOrders((payload) => {
      console.log('Real-time order update:', payload)
      loadOrders()
      loadKitchenMetrics()
      setLastUpdate(new Date())
    })

    return () => {
      orderService.unsubscribeFromOrders()
    }
  }, [])

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadOrders()
      loadKitchenMetrics()
      setLastUpdate(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const loadOrders = async () => {
    try {
      console.log('LiveOrdersPage: Fetching orders...')
      const data = await orderService.getLiveOrders()
      console.log('LiveOrdersPage: Orders fetched:', data.length)
      setOrders(data)
      setError(null)
    } catch (error: any) {
      console.error('Error loading orders:', error)
      setError(error?.message || 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const loadKitchenMetrics = async () => {
    try {
      console.log('LiveOrdersPage: Fetching kitchen metrics...')
      const metrics = await orderService.getKitchenMetrics()
      console.log('LiveOrdersPage: Kitchen metrics fetched:', metrics)
      setKitchenMetrics(metrics)
    } catch (error) {
      console.error('Error loading kitchen metrics:', error)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    loadOrders()
    loadKitchenMetrics()
    setLastUpdate(new Date())
  }

  const formatLastUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  // Group orders by status
  const groupedOrders = {
    pending: orders.filter(o => ['pending_payment', 'payment_verification'].includes(o.status)),
    confirmed: orders.filter(o => o.status === 'confirmed'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready: orders.filter(o => o.status === 'ready'),
    delivered: orders.filter(o => o.status === 'delivered')
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-6 max-w-[1920px] mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="h-10 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-[1920px] mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-900 mb-2">Failed to Load Orders</h3>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setIsLoading(true)
              loadOrders()
              loadKitchenMetrics()
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Orders & Kitchen</h1>
          <p className="text-gray-600">
            Real-time order monitoring and kitchen operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Auto-refresh</span>
          </label>

          {/* Last Update */}
          <span className="text-sm text-gray-500">
            Updated {formatLastUpdate()}
          </span>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Kitchen Metrics */}
      {kitchenMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Orders"
            value={kitchenMetrics.activeOrders}
            icon={ChefHat}
            changeType={kitchenMetrics.activeOrders > 5 ? 'negative' : 'positive'}
          />
          <StatCard
            title="Items in Queue"
            value={kitchenMetrics.itemsInQueue}
            icon={TrendingUp}
            changeType="neutral"
          />
          <StatCard
            title="Avg Prep Time"
            value={`${kitchenMetrics.avgPrepTime}min`}
            icon={Clock}
            changeType={kitchenMetrics.avgPrepTime > 20 ? 'negative' : 'positive'}
          />
          <StatCard
            title="Oldest Order"
            value={`${kitchenMetrics.oldestOrderMinutes}min`}
            icon={AlertCircle}
            changeType={kitchenMetrics.oldestOrderMinutes > 30 ? 'negative' : 'positive'}
          />
        </div>
      )}

      {/* Table Map */}
      <LiveOrderMap orders={orders} />

      {/* Orders by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Orders ({groupedOrders.pending.length})
            </h2>
            <p className="text-sm text-gray-600">New orders waiting for confirmation</p>
          </div>
          <OrderList orders={groupedOrders.pending} onOrderUpdate={loadOrders} />
        </div>

        {/* Confirmed Orders */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Confirmed Orders ({groupedOrders.confirmed.length})
            </h2>
            <p className="text-sm text-gray-600">Ready to start preparation</p>
          </div>
          <OrderList orders={groupedOrders.confirmed} onOrderUpdate={loadOrders} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preparing Orders */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Preparing Orders ({groupedOrders.preparing.length})
            </h2>
            <p className="text-sm text-gray-600">Currently being prepared in kitchen</p>
          </div>
          <OrderList orders={groupedOrders.preparing} onOrderUpdate={loadOrders} />
        </div>

        {/* Ready Orders */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Ready Orders ({groupedOrders.ready.length})
            </h2>
            <p className="text-sm text-gray-600">Ready for serving</p>
          </div>
          <OrderList orders={groupedOrders.ready} onOrderUpdate={loadOrders} />
        </div>
      </div>

      {/* Delivered Orders - Ready for checkout */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Delivered Orders ({groupedOrders.delivered.length})
            </h2>
            <p className="text-sm text-gray-600">Food delivered, waiting for customer to finish and checkout</p>
          </div>
          <OrderList orders={groupedOrders.delivered} onOrderUpdate={loadOrders} />
        </div>
      </div>

      {/* Empty State */}
      {!isLoading && orders.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Orders</h3>
          <p className="text-gray-600 mb-6">
            All orders have been completed. New orders will appear here automatically.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Waiting for new orders...</span>
          </div>
        </div>
      )}
    </div>
  )
}
