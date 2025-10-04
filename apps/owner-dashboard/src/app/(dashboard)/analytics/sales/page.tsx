'use client'

import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { analyticsService, DateRange, PeakHourData } from '@/services/analyticsService'
import RevenueChart from '../components/RevenueChart'
import MenuPerformance from '../components/MenuPerformance'
import PeakHoursAnalysis from '../components/PeakHoursAnalysis'

type PeriodType = 'today' | 'week' | 'month' | 'year'

export default function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodType>('month')
  const [dateRange, setDateRange] = useState<DateRange>(
    analyticsService.getDateRangeForPeriod('month')
  )
  const [previousDateRange, setPreviousDateRange] = useState<DateRange>(
    analyticsService.getPreviousPeriod(analyticsService.getDateRangeForPeriod('month'))
  )
  const [peakHours, setPeakHours] = useState<PeakHourData[]>([])
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
    loadPeakHours(newDateRange)
  }

  const loadPeakHours = async (range: DateRange) => {
    try {
      setIsLoading(true)
      const data = await analyticsService.getPeakHours(range)
      setPeakHours(data)
    } catch (error) {
      console.error('Error loading peak hours:', error)
    } finally {
      setIsLoading(false)
    }
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
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
              <p className="text-gray-600">Revenue trends and menu performance insights</p>
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
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Chart */}
      <RevenueChart dateRange={dateRange} previousDateRange={previousDateRange} />

      {/* Peak Hours Analysis */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
      ) : (
        <PeakHoursAnalysis data={peakHoursData} />
      )}

      {/* Menu Performance */}
      <MenuPerformance dateRange={dateRange} />
    </div>
  )
}
