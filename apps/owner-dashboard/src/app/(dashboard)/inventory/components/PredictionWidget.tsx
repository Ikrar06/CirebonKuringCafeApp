'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Calendar, Package, RefreshCw, AlertCircle, Brain } from 'lucide-react'
import { useInventoryStore } from '@/stores/inventoryStore'

interface PredictionWidgetProps {
  ingredientIds?: string[]
  limit?: number
  className?: string
}

export default function PredictionWidget({ ingredientIds, limit = 10, className = '' }: PredictionWidgetProps) {
  const { predictions, fetchPredictions, isLoading } = useInventoryStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchPredictions(ingredientIds)
  }, [fetchPredictions, ingredientIds])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchPredictions(ingredientIds)
    setIsRefreshing(false)
  }

  // Get top predictions (most urgent)
  const topPredictions = predictions.slice(0, limit)

  // Calculate urgency level
  const getUrgencyLevel = (daysRemaining: number) => {
    if (daysRemaining <= 7) return 'critical'
    if (daysRemaining <= 14) return 'high'
    if (daysRemaining <= 30) return 'medium'
    return 'low'
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'Order Immediately'
      case 'high':
        return 'Order Soon'
      case 'medium':
        return 'Plan Order'
      default:
        return 'Sufficient'
    }
  }

  if (isLoading && predictions.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (predictions.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-6 w-6 text-gray-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">No Predictions Available</h3>
            <p className="text-sm text-gray-600 mt-1">
              Need more usage data to generate accurate predictions. Keep using the system to build historical data.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Stock Predictions</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh predictions"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Based on usage patterns from the last 30 days, here are the predicted reorder times for your ingredients.
      </p>

      <div className="space-y-3">
        {topPredictions.map((prediction) => {
          const urgency = getUrgencyLevel(prediction.predicted_days_remaining)
          const urgencyColor = getUrgencyColor(urgency)
          const urgencyLabel = getUrgencyLabel(urgency)

          return (
            <div
              key={prediction.ingredient_id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {prediction.ingredient_name}
                  </h4>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Package className="h-3 w-3" />
                      <span>{prediction.current_stock.toFixed(1)} units</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{prediction.average_daily_usage.toFixed(2)}/day</span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${urgencyColor}`}>
                  {urgencyLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <p className="text-xs text-gray-600 font-medium">Stockout Date</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {prediction.predicted_stockout_date
                      ? new Date(prediction.predicted_stockout_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'Well stocked'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    ~{prediction.predicted_days_remaining} days
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Package className="h-4 w-4 text-blue-600" />
                    <p className="text-xs text-blue-600 font-medium">Recommended Order</p>
                  </div>
                  <p className="text-sm font-semibold text-blue-900">
                    {prediction.recommended_reorder_quantity} units
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    ~2 weeks supply
                  </p>
                </div>
              </div>

              {/* Progress bar showing days until stockout */}
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      urgency === 'critical'
                        ? 'bg-red-500'
                        : urgency === 'high'
                        ? 'bg-orange-500'
                        : urgency === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (prediction.predicted_days_remaining / 60) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {predictions.length > limit && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Showing {limit} of {predictions.length} predictions
          </p>
        </div>
      )}

      {/* AI Disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>AI-Powered Predictions:</strong> These predictions are based on historical usage patterns and may not account for seasonal variations, special events, or menu changes. Use as a guide and apply your business judgment.
        </p>
      </div>
    </div>
  )
}