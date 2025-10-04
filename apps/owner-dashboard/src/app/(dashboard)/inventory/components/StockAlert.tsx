'use client'

import { useEffect } from 'react'
import { AlertTriangle, Package, Clock, TrendingDown } from 'lucide-react'
import { useInventoryStore } from '@/stores/inventoryStore'
import Link from 'next/link'

export default function StockAlert() {
  const { ingredients, stockBatches, fetchIngredients, fetchStockBatches } = useInventoryStore()

  useEffect(() => {
    fetchIngredients()
    fetchStockBatches({ expiring_soon: true })
  }, [fetchIngredients, fetchStockBatches])

  // Get critical and low stock items
  const criticalItems = ingredients.filter(i => i.stock_status === 'critical')
  const lowStockItems = ingredients.filter(i => i.stock_status === 'low')

  // Get expiring items (next 30 days)
  const expiringBatches = stockBatches.filter(batch => {
    if (!batch.expiry_date) return false
    const expiryDate = new Date(batch.expiry_date)
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)
    return expiryDate >= today && expiryDate <= thirtyDaysFromNow
  })

  const alerts = [
    {
      id: 'critical',
      title: 'Critical Stock',
      description: `${criticalItems.length} ingredient${criticalItems.length !== 1 ? 's' : ''} out of stock or critically low`,
      count: criticalItems.length,
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-800 border-red-200',
      iconColor: 'text-red-600',
      items: criticalItems.slice(0, 5)
    },
    {
      id: 'low',
      title: 'Low Stock',
      description: `${lowStockItems.length} ingredient${lowStockItems.length !== 1 ? 's' : ''} below reorder point`,
      count: lowStockItems.length,
      icon: TrendingDown,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      iconColor: 'text-orange-600',
      items: lowStockItems.slice(0, 5)
    },
    {
      id: 'expiring',
      title: 'Expiring Soon',
      description: `${expiringBatches.length} batch${expiringBatches.length !== 1 ? 'es' : ''} expiring in 30 days`,
      count: expiringBatches.length,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      iconColor: 'text-yellow-600',
      items: expiringBatches.slice(0, 5)
    }
  ]

  const hasAlerts = criticalItems.length > 0 || lowStockItems.length > 0 || expiringBatches.length > 0

  if (!hasAlerts) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Package className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">All Stock Levels Optimal</h3>
            <p className="text-sm text-green-700 mt-1">
              No critical alerts at this time. All ingredients are well-stocked.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Stock Alerts</h3>
        <Link
          href="/inventory/ingredients"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All Ingredients →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {alerts.map((alert) => {
          if (alert.count === 0) return null

          const Icon = alert.icon

          return (
            <div
              key={alert.id}
              className={`border rounded-xl p-4 ${alert.color}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Icon className={`h-5 w-5 ${alert.iconColor}`} />
                  <h4 className="font-semibold">{alert.title}</h4>
                </div>
                <span className="text-2xl font-bold">{alert.count}</span>
              </div>
              <p className="text-sm mb-3">{alert.description}</p>

              {alert.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-75">
                    Top Items:
                  </p>
                  <div className="space-y-1">
                    {alert.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="text-sm bg-white bg-opacity-50 rounded px-2 py-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium truncate">
                            {item.name || item.ingredient_name}
                          </span>
                          <span className="text-xs ml-2 flex-shrink-0">
                            {item.current_stock !== undefined
                              ? `${item.current_stock} ${item.unit}`
                              : item.expiry_date
                              ? new Date(item.expiry_date).toLocaleDateString('id-ID', {
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {alert.count > 5 && (
                    <p className="text-xs text-center opacity-75 mt-2">
                      +{alert.count - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventory/ingredients?status=critical"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Critical Items
          </Link>
          <Link
            href="/inventory/ingredients?status=low"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Low Stock
          </Link>
          <button
            onClick={() => {
              // TODO: Generate purchase order for low stock items
              alert('Generate PO feature coming soon!')
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Generate Purchase Order
          </button>
        </div>
      </div>
    </div>
  )
}