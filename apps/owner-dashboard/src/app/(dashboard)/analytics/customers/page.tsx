'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { analyticsService, DateRange } from '@/services/analyticsService'
import CustomerMetrics from '../components/CustomerMetrics'

type PeriodType = 'today' | 'week' | 'month' | 'year'

export default function CustomersAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodType>('month')
  const [dateRange, setDateRange] = useState<DateRange>(
    analyticsService.getDateRangeForPeriod('month')
  )
  const [previousDateRange, setPreviousDateRange] = useState<DateRange>(
    analyticsService.getPreviousPeriod(analyticsService.getDateRangeForPeriod('month'))
  )
  const [isLoading, setIsLoading] = useState(true)
  const [customerData, setCustomerData] = useState<any>(null)

  useEffect(() => {
    handlePeriodChange(period)
  }, [])

  const handlePeriodChange = async (newPeriod: PeriodType) => {
    setPeriod(newPeriod)
    const newDateRange = analyticsService.getDateRangeForPeriod(newPeriod)
    const newPreviousDateRange = analyticsService.getPreviousPeriod(newDateRange)
    setDateRange(newDateRange)
    setPreviousDateRange(newPreviousDateRange)
    await loadData(newDateRange, newPreviousDateRange)
  }

  const loadData = async (range: DateRange, prevRange: DateRange) => {
    try {
      setIsLoading(true)
      const [currentMetrics, previousMetrics] = await Promise.all([
        analyticsService.getCustomerMetrics(range),
        analyticsService.getCustomerMetrics(prevRange)
      ])

      // Calculate customer lifetime value
      const summary = await analyticsService.getAnalyticsSummary(range, prevRange)
      const lifetimeValue = currentMetrics.totalCustomers > 0
        ? summary.totalRevenue / currentMetrics.totalCustomers
        : 0

      // Calculate new customers (customers who only have 1 order in this period)
      const newCustomers = currentMetrics.totalCustomers - currentMetrics.repeatCustomers

      setCustomerData({
        totalCustomers: currentMetrics.totalCustomers,
        newCustomers: newCustomers,
        repeatCustomers: currentMetrics.repeatCustomers,
        averageOrdersPerCustomer: currentMetrics.averageOrdersPerCustomer,
        customerRetentionRate: currentMetrics.customerRetentionRate,
        customerLifetimeValue: lifetimeValue,
        previousTotalCustomers: previousMetrics.totalCustomers,
        previousNewCustomers: previousMetrics.totalCustomers - previousMetrics.repeatCustomers
      })
    } catch (error) {
      console.error('Error loading customer data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Analytics</h1>
              <p className="text-gray-600">Detailed customer behavior and retention insights</p>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          {(['today', 'week', 'month', 'year'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Metrics Widget */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        </div>
      ) : customerData ? (
        <CustomerMetrics data={customerData} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-96 flex items-center justify-center text-gray-500">
            No customer data available
          </div>
        </div>
      )}

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Segmentation */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segmentation</h3>
          {!isLoading && customerData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                <div>
                  <p className="text-sm text-green-700">New Customers</p>
                  <p className="text-2xl font-bold text-green-900">{customerData.newCustomers}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600">
                    {customerData.totalCustomers > 0
                      ? ((customerData.newCustomers / customerData.totalCustomers) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-xs text-green-700">of total</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div>
                  <p className="text-sm text-blue-700">Returning Customers</p>
                  <p className="text-2xl font-bold text-blue-900">{customerData.repeatCustomers}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600">
                    {customerData.totalCustomers > 0
                      ? ((customerData.repeatCustomers / customerData.totalCustomers) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-xs text-blue-700">of total</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Customer Loyalty */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Metrics</h3>
          {!isLoading && customerData && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 mb-2">Retention Rate</p>
                <div className="flex items-end gap-2 mb-2">
                  <p className="text-3xl font-bold text-purple-900">
                    {customerData.customerRetentionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-purple-700 mb-1">
                    {customerData.customerRetentionRate >= 40
                      ? 'Excellent'
                      : customerData.customerRetentionRate >= 25
                      ? 'Good'
                      : 'Needs Improvement'}
                  </p>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all"
                    style={{ width: `${Math.min(customerData.customerRetentionRate, 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-700 mb-2">Avg Lifetime Value</p>
                <p className="text-2xl font-bold text-orange-900">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                  }).format(customerData.customerLifetimeValue)}
                </p>
                <p className="text-xs text-orange-700 mt-1">per customer</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
