'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, TrendingUp } from 'lucide-react'
import { analyticsService, PeakHourData, CustomerMetrics, DateRange } from '@/services/analyticsService'
import RevenueChart from './components/RevenueChart'
import MenuPerformance from './components/MenuPerformance'
import PeakHoursAnalysis from './components/PeakHoursAnalysis'

type PeriodType = 'today' | 'week' | 'month' | 'year'

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodType>('month')
  const [dateRange, setDateRange] = useState<DateRange>(analyticsService.getDateRangeForPeriod('month'))
  const [previousDateRange, setPreviousDateRange] = useState<DateRange>(
    analyticsService.getPreviousPeriod(analyticsService.getDateRangeForPeriod('month'))
  )
  const [peakHours, setPeakHours] = useState<PeakHourData[]>([])
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    handlePeriodChange(period)
  }, [])

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod)
    const newDateRange = analyticsService.getDateRangeForPeriod(newPeriod)
    const newPreviousDateRange = analyticsService.getPreviousPeriod(newDateRange)
    setDateRange(newDateRange)
    setPreviousDateRange(newPreviousDateRange)
    loadAdditionalData(newDateRange)
  }

  const loadAdditionalData = async (range: DateRange) => {
    try {
      setIsLoading(true)
      const [peakData, custMetrics] = await Promise.all([
        analyticsService.getPeakHours(range),
        analyticsService.getCustomerMetrics(range)
      ])
      setPeakHours(peakData)
      setCustomerMetrics(custMetrics)
    } catch (error) {
      console.error('Error loading additional data:', error)
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

  // Transform peak hours data for PeakHoursAnalysis component
  const peakHoursData = peakHours.map(h => ({
    hour: h.hour,
    orders: h.orders,
    revenue: h.revenue,
    averageOrderValue: h.orders > 0 ? h.revenue / h.orders : 0
  }))

  return (
    <div className="p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600">Business insights and performance metrics</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          {(['today', 'week', 'month', 'year'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Section */}
      <RevenueChart dateRange={dateRange} previousDateRange={previousDateRange} />

      {/* Peak Hours & Customer Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours Analysis */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
          </div>
        ) : (
          <PeakHoursAnalysis data={peakHoursData} />
        )}

        {/* Customer Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Customer Metrics
            </h3>
            <p className="text-sm text-gray-600">Customer behavior and retention</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : !customerMetrics ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No data available
            </div>
          ) : (
            <div className="space-y-4">
              {/* Total Customers */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700">Total Customers</span>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {customerMetrics.totalCustomers}
                </p>
              </div>

              {/* Repeat Customers */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-green-700">Repeat Customers</span>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {customerMetrics.repeatCustomers}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {customerMetrics.totalCustomers > 0
                    ? ((customerMetrics.repeatCustomers / customerMetrics.totalCustomers) * 100).toFixed(1)
                    : 0}% of total
                </p>
              </div>

              {/* Average Orders Per Customer */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-700">Avg Orders/Customer</span>
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  {customerMetrics.averageOrdersPerCustomer.toFixed(1)}
                </p>
              </div>

              {/* Retention Rate */}
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-orange-700">Retention Rate</span>
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-orange-900">
                  {customerMetrics.customerRetentionRate.toFixed(1)}%
                </p>
                <div className="mt-2 bg-white rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-orange-600 h-full rounded-full transition-all"
                    style={{ width: `${customerMetrics.customerRetentionRate}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Performance */}
      <MenuPerformance dateRange={dateRange} />

      {/* Insights & Recommendations */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Business Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {peakHoursData.filter(h => h.orders > 0).length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Peak Performance</h4>
              <p className="text-sm text-gray-600">
                Your restaurant has <span className="font-semibold">{peakHoursData.filter(h => h.orders > 0).length} active hours</span> with customer traffic. Review peak hours chart for staffing optimization.
              </p>
            </div>
          )}

          {customerMetrics && customerMetrics.customerRetentionRate > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Customer Loyalty</h4>
              <p className="text-sm text-gray-600">
                Your retention rate is <span className="font-semibold">{customerMetrics.customerRetentionRate.toFixed(1)}%</span>.
                {customerMetrics.customerRetentionRate >= 40
                  ? ' Excellent customer loyalty! Keep up the great service.'
                  : ' Focus on loyalty programs to increase repeat visits.'}
              </p>
            </div>
          )}

          {customerMetrics && customerMetrics.averageOrdersPerCustomer > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Order Frequency</h4>
              <p className="text-sm text-gray-600">
                Customers order <span className="font-semibold">{customerMetrics.averageOrdersPerCustomer.toFixed(1)} times</span> on average.
                {customerMetrics.averageOrdersPerCustomer >= 2
                  ? ' Great engagement with your regular customers!'
                  : ' Consider promotions to encourage repeat visits.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
