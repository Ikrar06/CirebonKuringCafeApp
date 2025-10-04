'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  ClipboardList,
  Users,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  ShoppingBag
} from 'lucide-react'
import StatCard from './StatCard'
import { useRealtime, RealtimeOrder } from '@/hooks/useRealtime'

interface RealtimeMetricsProps {
  className?: string
}

export default function RealtimeMetrics({ className = '' }: RealtimeMetricsProps) {
  const { metrics, recentOrders, isLoading, error, isConnected, refresh } = useRealtime()
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Update last refresh time when metrics update
  useEffect(() => {
    if (metrics) {
      setLastRefresh(metrics.lastUpdated)
    }
  }, [metrics])

  const handleRefresh = () => {
    refresh()
    setLastRefresh(new Date())
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'baru saja'
    if (diffMins < 60) return `${diffMins} menit lalu`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} jam lalu`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} hari lalu`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-900">Error Loading Data</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Connection Status & Refresh Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm ${
            isConnected ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span>{isConnected ? 'Live Data' : 'Disconnected'}</span>
          </div>
          <span className="text-sm text-gray-500">
            Updated {lastRefresh.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center space-x-2 disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-gray-700">Refresh</span>
        </button>
      </div>

      {/* Quick Status Banner */}
      {metrics && (
        <div className={`rounded-xl p-4 border ${
          metrics.pendingOrders > 0 || metrics.lowStockItems > 0
            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
            : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {metrics.pendingOrders > 0 || metrics.lowStockItems > 0 ? (
                <>
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {metrics.pendingOrders > 0 && metrics.lowStockItems > 0
                        ? 'Perhatian: Ada pesanan pending dan stok rendah'
                        : metrics.pendingOrders > 0
                        ? `${metrics.pendingOrders} Pesanan menunggu konfirmasi`
                        : `${metrics.lowStockItems} Item stok rendah perlu restocking`}
                    </p>
                    <p className="text-sm text-gray-600">Butuh perhatian segera</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Semua Berjalan Lancar!</p>
                    <p className="text-sm text-gray-600">Tidak ada masalah yang perlu ditangani</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pendapatan Hari Ini"
          value={metrics ? formatCurrency(metrics.todayRevenue) : 'Loading...'}
          change={metrics ? `${metrics.ordersToday} pesanan` : undefined}
          changeType="positive"
          icon={DollarSign}
          loading={isLoading}
        />

        <StatCard
          title="Pesanan Aktif"
          value={metrics?.activeOrders ?? 'Loading...'}
          change={metrics ? `${metrics.pendingOrders} pending` : undefined}
          changeType={metrics && metrics.pendingOrders > 0 ? 'neutral' : 'positive'}
          icon={ClipboardList}
          loading={isLoading}
        />

        <StatCard
          title="Okupansi Meja"
          value={metrics ? `${metrics.activeTables}/${metrics.totalTables}` : 'Loading...'}
          change={metrics ? `${Math.round((metrics.activeTables / (metrics.totalTables || 1)) * 100)}% terisi` : undefined}
          changeType="neutral"
          icon={Users}
          loading={isLoading}
        />

        <StatCard
          title="Stok Rendah"
          value={metrics?.lowStockItems ?? 'Loading...'}
          change={metrics && metrics.lowStockItems > 0 ? "perlu restocking" : "stok aman"}
          changeType={metrics && metrics.lowStockItems > 0 ? 'negative' : 'positive'}
          icon={Package}
          loading={isLoading}
        />
      </div>

      {/* Two Column Layout for Orders and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pesanan Terbaru</h3>
                <p className="text-sm text-gray-500 mt-1">Update real-time</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-600">LIVE</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isLoading && recentOrders.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                        <ShoppingBag className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Order #{order.id.slice(-6)}</p>
                        <p className="text-sm text-gray-600">
                          Meja {order.table_number} • {order.customer_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getTimeAgo(order.created_at)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Belum ada pesanan</h4>
                <p className="text-gray-600">Pesanan akan muncul di sini secara otomatis</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Sidebar - Takes 1 column */}
        <div className="space-y-4">
          {/* Today Summary */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-8 w-8 opacity-80" />
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Hari Ini</span>
            </div>
            <p className="text-sm opacity-90 mb-2">Total Pendapatan</p>
            <p className="text-3xl font-bold mb-1">
              {metrics ? formatCurrency(metrics.todayRevenue) : '...'}
            </p>
            <p className="text-sm opacity-80">
              dari {metrics?.ordersToday || 0} pesanan
            </p>
          </div>

          {/* Table Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-6 w-6 text-purple-600" />
              <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">Meja</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Status Meja</p>
            <div className="flex items-baseline space-x-2 mb-3">
              <span className="text-4xl font-bold text-gray-900">{metrics?.activeTables || 0}</span>
              <span className="text-lg text-gray-400">/ {metrics?.totalTables || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics ? (metrics.activeTables / (metrics.totalTables || 1)) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Stock Alert */}
          <div className={`rounded-xl border p-6 shadow-sm ${
            metrics && metrics.lowStockItems > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <Package className={`h-6 w-6 ${metrics && metrics.lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}`} />
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                metrics && metrics.lowStockItems > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>Inventori</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Stok Rendah</p>
            <p className="text-4xl font-bold text-gray-900 mb-2">
              {metrics?.lowStockItems || 0}
            </p>
            <p className={`text-sm font-medium ${
              metrics && metrics.lowStockItems > 0 ? 'text-red-700' : 'text-green-700'
            }`}>
              {metrics && metrics.lowStockItems > 0 ? 'Perlu perhatian!' : 'Semua stok aman'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
