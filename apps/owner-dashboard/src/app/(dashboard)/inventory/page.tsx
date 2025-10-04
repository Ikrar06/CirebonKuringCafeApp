'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  Package,
  TrendingDown,
  Clock,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Activity
} from 'lucide-react'
import { useInventoryStore } from '@/stores/inventoryStore'
import { inventoryService } from '@/services/inventoryService'
import StockAlert from './components/StockAlert'
import PredictionWidget from './components/PredictionWidget'

export default function InventoryDashboard() {
  const {
    stats,
    stockMovements,
    fetchStats,
    fetchStockMovements
  } = useInventoryStore()

  useEffect(() => {
    fetchStats()
    fetchStockMovements({ limit: 10 })
  }, [fetchStats, fetchStockMovements])

  const formatCurrency = (amount: number) => {
    return inventoryService.formatCurrency(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-800'
      case 'usage':
        return 'bg-blue-100 text-blue-800'
      case 'waste':
        return 'bg-red-100 text-red-800'
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800'
      case 'return':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getMovementTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-600">Monitor and manage your restaurant inventory</p>
        </div>
        <Link
          href="/inventory/ingredients"
          className="btn-primary flex items-center space-x-2"
        >
          <Package className="h-4 w-4" />
          <span>Manage Ingredients</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Package className="h-8 w-8 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Total Items</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_ingredients || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Active ingredients</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Low Stock</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats?.low_stock_items || 0}</p>
          <p className="text-sm text-gray-600 mt-1">
            Including {stats?.out_of_stock_items || 0} out of stock
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-8 w-8 text-orange-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Expiring Soon</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{stats?.expiring_soon || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Next 30 days</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Stock Value</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats?.total_value || 0)}
          </p>
          <p className="text-sm text-gray-600 mt-1">Current inventory</p>
        </div>
      </div>

      {/* Stock Alerts */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <StockAlert />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Stock Predictions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <PredictionWidget limit={5} />
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Movements</h3>
            </div>
            <Link
              href="/inventory/movements"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <span>View All</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {stockMovements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent stock movements</p>
              </div>
            ) : (
              stockMovements.slice(0, 10).map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getMovementTypeColor(
                          movement.movement_type
                        )}`}
                      >
                        {getMovementTypeLabel(movement.movement_type)}
                      </span>
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {movement.ingredient_name}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600">
                      {movement.created_at ? formatDate(movement.created_at) : '-'}
                      {movement.supplier_name && ` • ${movement.supplier_name}`}
                    </p>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {movement.quantity >= 0 ? '+' : ''}
                      {movement.quantity.toFixed(1)} {movement.unit}
                    </p>
                    {movement.total_cost && (
                      <p className="text-xs text-gray-500">
                        {formatCurrency(movement.total_cost)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/inventory/ingredients"
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <Package className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-1">View All Ingredients</h4>
            <p className="text-sm text-gray-600">Manage your ingredient inventory</p>
          </Link>

          <Link
            href="/inventory/stock-movements"
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <TrendingDown className="h-8 w-8 text-green-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-1">Record Stock Movement</h4>
            <p className="text-sm text-gray-600">Add purchase, usage, or adjustment</p>
          </Link>

          <Link
            href="/inventory/purchase-orders"
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <DollarSign className="h-8 w-8 text-purple-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-1">Create Purchase Order</h4>
            <p className="text-sm text-gray-600">Order ingredients from suppliers</p>
          </Link>
        </div>
      </div>
    </div>
  )
}