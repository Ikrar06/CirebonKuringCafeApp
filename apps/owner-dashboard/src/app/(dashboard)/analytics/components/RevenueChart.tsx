'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, CreditCard } from 'lucide-react'
import { analyticsService, RevenueData, AnalyticsSummary, DateRange } from '@/services/analyticsService'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'

interface RevenueChartProps {
  dateRange: DateRange
  previousDateRange: DateRange
}

export default function RevenueChart({ dateRange, previousDateRange }: RevenueChartProps) {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [dateRange, previousDateRange])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [revenue, summaryData] = await Promise.all([
        analyticsService.getRevenueData(dateRange),
        analyticsService.getAnalyticsSummary(dateRange, previousDateRange)
      ])
      setRevenueData(revenue)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading revenue data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const [chartType, setChartType] = useState<'line' | 'bar'>('bar')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short'
    })
  }

  // Prepare data for chart components
  const chartData = revenueData.map(d => ({
    label: formatDate(d.date),
    value: d.revenue
  }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-8 w-8 opacity-80" />
              {summary.growthRate !== 0 && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  summary.growthRate > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {summary.growthRate > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(summary.growthRate).toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{summary.totalOrders}</p>
            </div>
          </div>

          {/* Average Order Value */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(summary.averageOrderValue)}
              </p>
            </div>
          </div>

          {/* Profit Margin */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${
                summary.profitMargin >= 30 ? 'bg-green-100' :
                summary.profitMargin >= 20 ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                <TrendingUp className={`h-6 w-6 ${
                  summary.profitMargin >= 30 ? 'text-green-600' :
                  summary.profitMargin >= 20 ? 'text-yellow-600' :
                  'text-red-600'
                }`} />
              </div>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Profit Margin</p>
              <p className="text-3xl font-bold text-gray-900">
                {summary.profitMargin.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Profit: {formatCurrency(summary.totalProfit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue Trend</h3>
            <p className="text-sm text-gray-600">Daily revenue performance over the selected period</p>
          </div>

          {/* Chart Type Switcher */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                chartType === 'bar'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                chartType === 'line'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Line
            </button>
          </div>
        </div>

        {revenueData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No data available for this period
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Component */}
            {chartType === 'bar' ? (
              <BarChart
                data={chartData}
                height={320}
                barColor="#3B82F6"
                barGradient={true}
                showGrid={true}
                showValues={false}
                valueFormatter={formatCurrency}
              />
            ) : (
              <LineChart
                data={chartData}
                height={320}
                lineColor="#3B82F6"
                fillColor="rgba(59, 130, 246, 0.1)"
                showGrid={true}
                showPoints={true}
                valueFormatter={formatCurrency}
              />
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Highest Day</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(Math.max(...revenueData.map(d => d.revenue)))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Average Daily</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(
                    revenueData.reduce((sum, d) => sum + d.revenue, 0) / revenueData.length
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Days</p>
                <p className="font-semibold text-gray-900">{revenueData.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
