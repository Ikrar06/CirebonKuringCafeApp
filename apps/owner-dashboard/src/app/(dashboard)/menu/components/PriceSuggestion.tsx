'use client'

import { useState, useEffect } from 'react'
import { Calculator, Percent, DollarSign } from '@/components/ui/icons'
import {
  PricingSuggestion,
  PricingData,
  pricingService
} from '@/services/pricingService'

interface PriceSuggestionProps {
  pricingData: PricingData | null
  selectedPrice: number
  onPriceSelect: (price: number) => void
  className?: string
}

export default function PriceSuggestion({
  pricingData,
  selectedPrice,
  onPriceSelect,
  className = ''
}: PriceSuggestionProps) {
  const [suggestion, setSuggestion] = useState<PricingSuggestion | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    if (pricingData && pricingData.ingredients.length > 0) {
      calculateAIPricing()
    } else {
      setSuggestion(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pricingData?.ingredients.length,
    pricingData?.preparation_time,
    pricingData?.difficulty_level,
    JSON.stringify(pricingData?.ingredients.map(i => ({ id: i.id, quantity: i.quantity })))
  ])

  const calculateAIPricing = async () => {
    if (!pricingData) return

    setIsCalculating(true)
    try {
      const result = await pricingService.getAIPricingSuggestion(pricingData)
      setSuggestion(result)
    } catch (error) {
      console.error('Failed to calculate AI pricing:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  if (!pricingData || pricingData.ingredients.length === 0) {
    return (
      <div className={`p-6 bg-gray-50 rounded-xl border border-gray-200 ${className}`}>
        <div className="text-center">
          <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Price Suggestion</h3>
          <p className="text-gray-600">
            Add ingredients and fill in preparation details to get AI-powered pricing suggestions
          </p>
        </div>
      </div>
    )
  }

  if (isCalculating) {
    return (
      <div className={`p-6 bg-blue-50 rounded-xl border border-blue-200 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Calculating AI Pricing...</h3>
          <p className="text-blue-700">
            Our AI is analyzing your ingredients, preparation time, and market data
          </p>
        </div>
      </div>
    )
  }

  if (!suggestion) {
    return (
      <div className={`p-6 bg-red-50 rounded-xl border border-red-200 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Calculation Error</h3>
          <p className="text-red-700">
            Unable to calculate pricing suggestions. Please try again.
          </p>
          <button
            onClick={calculateAIPricing}
            className="mt-3 btn-primary"
          >
            Retry Calculation
          </button>
        </div>
      </div>
    )
  }

  const getPriceButtonClass = (price: number) => {
    const isSelected = selectedPrice === price
    const base = "p-4 rounded-lg border-2 transition-all cursor-pointer text-left hover:shadow-md"

    if (isSelected) {
      return `${base} border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200`
    }
    return `${base} border-gray-200 hover:border-blue-300 hover:bg-gray-50`
  }

  const getMarginLabel = (key: string) => {
    switch (key) {
      case 'low_margin': return 'Aman (20% markup)'
      case 'medium_margin': return 'Recommended (35% markup)'
      case 'high_margin': return 'Premium (50% markup)'
      case 'premium_margin': return 'Luxury (70% markup)'
      default: return key
    }
  }

  const getMarginColor = (key: string) => {
    switch (key) {
      case 'low_margin': return 'text-yellow-600'
      case 'medium_margin': return 'text-green-600'
      case 'high_margin': return 'text-blue-600'
      case 'premium_margin': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calculator className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Price Suggestions</h3>
        </div>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showBreakdown ? 'Hide' : 'Show'} Breakdown
        </button>
      </div>

      {/* Market Analysis */}
      <div className={`p-4 rounded-lg border ${pricingService.getRecommendationColor(suggestion.market_analysis.recommendation)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Market Analysis</h4>
            <p className="text-sm mt-1">
              {pricingService.getRecommendationText(suggestion.market_analysis.recommendation)}
            </p>
          </div>
          <div className="text-right text-sm">
            <div>Category Average: {pricingService.formatCurrency(suggestion.market_analysis.category_average)}</div>
            <div className="text-xs text-gray-600">
              Range: {pricingService.formatCurrency(suggestion.market_analysis.competitor_range.min)} - {pricingService.formatCurrency(suggestion.market_analysis.competitor_range.max)}
            </div>
          </div>
        </div>
      </div>

      {/* Price Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(suggestion.suggested_prices).map(([key, price]) => {
          const isSelected = selectedPrice === price
          return (
            <button
              key={key}
              onClick={() => onPriceSelect(price)}
              className={getPriceButtonClass(price)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className={`font-semibold ${getMarginColor(key)}`}>
                      {getMarginLabel(key)}
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {pricingService.formatCurrency(price)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(((price - suggestion.total_cost) / price) * 100)}% profit margin
                  </div>
                </div>
                <div className="text-right">
                  <Percent className={`h-5 w-5 ${getMarginColor(key)} ${isSelected ? 'scale-110' : ''}`} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Cost Breakdown */}
      {showBreakdown && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h4>

          {/* Cost Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Ingredient Cost:</span>
                <span className="font-medium">{pricingService.formatCurrency(suggestion.base_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Labor Cost:</span>
                <span className="font-medium">{pricingService.formatCurrency(suggestion.labor_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overhead Cost:</span>
                <span className="font-medium">{pricingService.formatCurrency(suggestion.overhead_cost)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total Cost:</span>
                <span className="font-semibold">{pricingService.formatCurrency(suggestion.total_cost)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-2">Percentage Breakdown (based on recommended price):</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ingredients:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400" style={{ width: `${suggestion.breakdown.ingredient_percentage}%` }}></div>
                    </div>
                    <span className="font-medium w-10 text-right">{suggestion.breakdown.ingredient_percentage}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Labor:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400" style={{ width: `${suggestion.breakdown.labor_percentage}%` }}></div>
                    </div>
                    <span className="font-medium w-10 text-right">{suggestion.breakdown.labor_percentage}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Overhead:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400" style={{ width: `${suggestion.breakdown.overhead_percentage}%` }}></div>
                    </div>
                    <span className="font-medium w-10 text-right">{suggestion.breakdown.overhead_percentage}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="font-semibold text-green-600">Profit:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400" style={{ width: `${suggestion.breakdown.profit_percentage}%` }}></div>
                    </div>
                    <span className="font-semibold text-green-600 w-10 text-right">{suggestion.breakdown.profit_percentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Breakdown */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Cost Distribution:</div>
            <div className="flex rounded-lg overflow-hidden h-6">
              <div
                className="bg-orange-400"
                style={{ width: `${suggestion.breakdown.ingredient_percentage}%` }}
                title={`Ingredients: ${suggestion.breakdown.ingredient_percentage}%`}
              ></div>
              <div
                className="bg-blue-400"
                style={{ width: `${suggestion.breakdown.labor_percentage}%` }}
                title={`Labor: ${suggestion.breakdown.labor_percentage}%`}
              ></div>
              <div
                className="bg-purple-400"
                style={{ width: `${suggestion.breakdown.overhead_percentage}%` }}
                title={`Overhead: ${suggestion.breakdown.overhead_percentage}%`}
              ></div>
              <div
                className="bg-green-400"
                style={{ width: `${suggestion.breakdown.profit_percentage}%` }}
                title={`Profit: ${suggestion.breakdown.profit_percentage}%`}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>• Ingredients</span>
              <span>• Labor</span>
              <span>• Overhead</span>
              <span>• Profit</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom Price Input */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-3">Or set custom price:</h4>
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 max-w-xs">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              min="0"
              step="1000"
              value={selectedPrice || ''}
              onChange={(e) => onPriceSelect(parseInt(e.target.value) || 0)}
              placeholder="Enter custom price"
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            {selectedPrice && selectedPrice !== suggestion.suggested_prices.medium_margin && (
              <span>
                {selectedPrice > suggestion.total_cost
                  ? `${Math.round(((selectedPrice - suggestion.total_cost) / selectedPrice) * 100)}% margin`
                  : 'Below cost!'
                }
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
