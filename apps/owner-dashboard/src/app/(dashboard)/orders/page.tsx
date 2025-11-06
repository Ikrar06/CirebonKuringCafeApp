'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ChefHat,
  Eye,
  ArrowRight
} from 'lucide-react'
import { Order, OrderStats, orderService } from '@/services/orderService'
import StatCard from '@/components/dashboard/StatCard'
import OrderDetail from './components/OrderDetail'

export default function OrdersPage() {
  const router = useRouter()
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        orderService.getOrderStats(),
        orderService.getOrders()
      ])
      setStats(statsData)
      // Get 10 most recent orders
      setRecentOrders(ordersData.slice(0, 10))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadgeClass = (status: Order['status']) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium'
    const colorMap: Record<Order['status'], string> = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      payment_verification: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return `${baseClass} ${colorMap[status]}`
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-[1920px] mx-auto space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Overview</h1>
          <p className="text-gray-600">Manage and monitor all orders</p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={Package}
            changeType="neutral"
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={Clock}
            changeType={stats.pendingOrders > 5 ? 'negative' : 'positive'}
          />
          <StatCard
            title="Completed Today"
            value={stats.completedToday}
            icon={CheckCircle2}
            changeType="positive"
          />
          <StatCard
            title="Today's Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={TrendingUp}
            changeType="positive"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => router.push('/orders/live')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <ChefHat className="h-8 w-8" />
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-xl font-bold mb-2">Live Orders</h3>
          <p className="text-blue-100 text-sm">Monitor real-time orders and kitchen operations</p>
        </button>

        <button
          onClick={() => router.push('/orders/history')}
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <Package className="h-8 w-8" />
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-xl font-bold mb-2">Order History</h3>
          <p className="text-purple-100 text-sm">View and analyze past orders</p>
        </button>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">Avg. Prep Time</h3>
          <p className="text-3xl font-bold">{stats?.averagePreparationTime || 0} min</p>
          <p className="text-green-100 text-sm mt-2">Kitchen efficiency metric</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <p className="text-sm text-gray-600 mt-1">Latest orders across all status</p>
            </div>
            <button
              onClick={() => router.push('/orders/history')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <ChefHat className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500">No orders yet</p>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{order.order_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {order.customer_name || '-'}
                        </div>
                        {order.tables && (
                          <div className="text-gray-500">Table {order.tables.table_number}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">
                        {order.order_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadgeClass(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(parseFloat(order.total_amount?.toString() || '0'))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Orders Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <ChefHat className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600">Preparing</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.preparingOrders}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/orders/live')}
              className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
            >
              View in Kitchen
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600">Ready to Serve</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.readyOrders}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/orders/live')}
              className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1"
            >
              View Ready Orders
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600">Pending Payment</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/orders/live')}
              className="text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center gap-1"
            >
              View Pending
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdate={loadData}
        />
      )}
    </div>
  )
}
