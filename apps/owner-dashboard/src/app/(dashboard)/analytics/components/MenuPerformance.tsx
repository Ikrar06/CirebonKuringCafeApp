'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Star, DollarSign, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { analyticsService, MenuItemPerformance, DateRange } from '@/services/analyticsService'
import PieChart from '@/components/charts/PieChart'

interface MenuPerformanceProps {
  dateRange: DateRange
}

export default function MenuPerformance({ dateRange }: MenuPerformanceProps) {
  const [performance, setPerformance] = useState<MenuItemPerformance[]>([])
  const [categoryData, setCategoryData] = useState<{ category: string; revenue: number; orders: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [menuPerf, catData] = await Promise.all([
        analyticsService.getMenuPerformance(dateRange),
        analyticsService.getSalesByCategory(dateRange)
      ])
      setPerformance(menuPerf)
      setCategoryData(catData)
    } catch (error) {
      console.error('Error loading menu performance:', error)
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

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const getPerformanceColor = (profitMargin: number) => {
    if (profitMargin >= 40) return 'text-green-600 bg-green-50'
    if (profitMargin >= 25) return 'text-blue-600 bg-blue-50'
    if (profitMargin >= 15) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getPopularityStars = (popularity: number) => {
    if (popularity >= 15) return 5
    if (popularity >= 10) return 4
    if (popularity >= 5) return 3
    if (popularity >= 2) return 2
    return 1
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  const topPerformers = performance.slice(0, 10)

  // Prepare data for PieChart
  const pieChartData = categoryData.map(cat => ({
    label: cat.category,
    value: cat.revenue
  }))

  return (
    <div className="space-y-6">
      {/* Category Performance */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales by Category</h3>
          <p className="text-sm text-gray-600">Revenue distribution across menu categories</p>
        </div>

        {categoryData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No data available</div>
        ) : (
          <div className="space-y-6">
            {/* Pie Chart */}
            <PieChart
              data={pieChartData}
              size={280}
              donutMode={true}
              donutWidth={70}
              showLegend={true}
              showPercentages={true}
              valueFormatter={formatCurrency}
            />

            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              {categoryData.map((cat, index) => (
                <div
                  key={cat.category}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{cat.category}</h4>
                      <p className="text-xs text-gray-500 mt-1">{cat.orders} items sold</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      #{index + 1}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(cat.revenue)}
                  </p>
                  <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{
                        width: `${categoryData.length > 0 ? (cat.revenue / categoryData[0].revenue) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Selling Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Performing Menu Items</h3>
          <p className="text-sm text-gray-600">Best sellers ranked by revenue and profitability</p>
        </div>

        {topPerformers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No data available</div>
        ) : (
          <div className="space-y-3">
            {topPerformers.map((item, index) => {
              const isExpanded = expandedItems.has(item.id)
              const stars = getPopularityStars(item.popularity)

              return (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
                >
                  {/* Item Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Rank Badge */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {item.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {item.totalSold} sold
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(item.revenue)}
                            </span>
                          </div>
                        </div>

                        {/* Profit Margin */}
                        <div className={`px-3 py-2 rounded-lg ${getPerformanceColor(item.profitMargin)}`}>
                          <div className="text-xs font-medium opacity-75">Margin</div>
                          <div className="text-lg font-bold">{item.profitMargin.toFixed(1)}%</div>
                        </div>

                        {/* Expand Icon */}
                        <div className="text-gray-500">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                      <div className="pt-4 grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Sold</p>
                          <p className="text-lg font-semibold text-gray-900">{item.totalSold}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Revenue</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(item.revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Popularity</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {item.popularity.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Profit Margin</p>
                          <p className={`text-lg font-semibold ${
                            item.profitMargin >= 30 ? 'text-green-600' :
                            item.profitMargin >= 20 ? 'text-blue-600' :
                            item.profitMargin >= 10 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {item.profitMargin.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Performance Indicators */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-xs">
                          {item.profitMargin >= 30 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                              High Profit
                            </span>
                          )}
                          {item.popularity >= 10 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              Popular
                            </span>
                          )}
                          {item.totalSold >= 50 && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                              Best Seller
                            </span>
                          )}
                          {item.profitMargin < 15 && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                              Low Margin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Performance Summary */}
      {performance.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">Top Revenue Item</span>
              </div>
              <p className="font-semibold text-gray-900">{performance[0]?.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                {formatCurrency(performance[0]?.revenue || 0)}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Star className="h-5 w-5 text-yellow-600" />
                <span className="text-sm text-gray-600">Most Popular</span>
              </div>
              <p className="font-semibold text-gray-900">
                {[...performance].sort((a, b) => b.popularity - a.popularity)[0]?.name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {[...performance].sort((a, b) => b.popularity - a.popularity)[0]?.totalSold} sold
              </p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-gray-600">Best Margin</span>
              </div>
              <p className="font-semibold text-gray-900">
                {[...performance].sort((a, b) => b.profitMargin - a.profitMargin)[0]?.name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {[...performance].sort((a, b) => b.profitMargin - a.profitMargin)[0]?.profitMargin.toFixed(1)}% margin
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
