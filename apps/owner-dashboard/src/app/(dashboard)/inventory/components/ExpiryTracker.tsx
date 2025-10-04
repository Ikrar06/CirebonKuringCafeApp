'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, Package, TrendingDown } from 'lucide-react'
import { inventoryService } from '@/services/inventoryService'

interface ExpiringItem {
  id: string
  ingredient_id: string
  ingredient_name: string
  batch_number: string
  quantity: number
  unit: string
  expiry_date: string
  days_until_expiry: number
  urgency: 'critical' | 'warning' | 'normal'
}

interface ExpiryTrackerProps {
  className?: string
}

export default function ExpiryTracker({ className = '' }: ExpiryTrackerProps) {
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadExpiringItems()
  }, [])

  const loadExpiringItems = async () => {
    setIsLoading(true)
    try {
      const batches = await inventoryService.getStockBatches({ expiring_soon: true })

      const items: ExpiringItem[] = batches
        .filter(batch => batch.expiry_date && batch.remaining_quantity > 0)
        .map(batch => {
          const expiryDate = new Date(batch.expiry_date!)
          const today = new Date()
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          let urgency: 'critical' | 'warning' | 'normal' = 'normal'
          if (daysUntilExpiry <= 3) urgency = 'critical'
          else if (daysUntilExpiry <= 7) urgency = 'warning'

          return {
            id: batch.id,
            ingredient_id: batch.ingredient_id,
            ingredient_name: batch.ingredient_name || 'Unknown',
            batch_number: batch.batch_number || '-',
            quantity: batch.remaining_quantity,
            unit: batch.unit || 'unit',
            expiry_date: batch.expiry_date!,
            days_until_expiry: daysUntilExpiry,
            urgency
          }
        })
        .sort((a, b) => a.days_until_expiry - b.days_until_expiry)
        .slice(0, 10)

      setExpiringItems(items)
    } catch (error) {
      console.error('Error loading expiring items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900'
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-900'
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-900'
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'warning':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Expiry Tracker</h3>
              <p className="text-sm text-gray-600">Items expiring soon</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full">
            {expiringItems.length} items
          </span>
        </div>
      </div>

      <div className="p-6">
        {expiringItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No items expiring soon</p>
            <p className="text-gray-400 text-xs mt-1">All stock is fresh!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expiringItems.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${getUrgencyColor(item.urgency)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{item.ingredient_name}</h4>
                    <p className="text-xs opacity-75">Batch: {item.batch_number}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getUrgencyBadge(item.urgency)}`}>
                    {item.urgency === 'critical' ? 'Critical' : item.urgency === 'warning' ? 'Warning' : 'Notice'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 opacity-60" />
                    <div>
                      <p className="text-xs opacity-75">Quantity</p>
                      <p className="text-sm font-semibold">
                        {item.quantity.toFixed(1)} {item.unit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 opacity-60" />
                    <div>
                      <p className="text-xs opacity-75">Expires</p>
                      <p className="text-sm font-semibold">{formatDate(item.expiry_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 opacity-60" />
                    <div>
                      <p className="text-xs opacity-75">Days Left</p>
                      <p className="text-sm font-semibold">
                        {item.days_until_expiry} {item.days_until_expiry === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {expiringItems.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-red-600">{expiringItems.filter(i => i.urgency === 'critical').length}</span> critical,
            <span className="font-semibold text-orange-600 ml-1">{expiringItems.filter(i => i.urgency === 'warning').length}</span> warning items
          </p>
        </div>
      )}
    </div>
  )
}