'use client'

import { Clock, TrendingUp, Users, DollarSign } from 'lucide-react'
import BarChart from '@/components/charts/BarChart'

interface HourData {
  hour: number
  orders: number
  revenue: number
  averageOrderValue: number
}

interface PeakHoursAnalysisProps {
  data: HourData[]
}

export default function PeakHoursAnalysis({ data }: PeakHoursAnalysisProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    if (hour < 12) return `${hour} AM`
    return `${hour - 12} PM`
  }

  // Ensure we have valid data
  const validData = data && Array.isArray(data) ? data : []

  const topPeakHours = [...validData]
    .filter(h => h.orders > 0)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5)

  // Prepare data for BarChart
  const chartData = validData
    .filter(h => h.hour >= 0 && h.hour <= 23) // Only valid hours
    .map(h => ({
      label: h.hour.toString(),
      value: h.orders,
      color: topPeakHours.some(peak => peak.hour === h.hour) ? '#F97316' : '#3B82F6' // orange for top 5, blue for others
    }))

  const totalOrders = validData.reduce((sum, h) => sum + h.orders, 0)

  // Categorize hours
  const morningHours = validData.filter(h => h.hour >= 6 && h.hour < 12)
  const afternoonHours = validData.filter(h => h.hour >= 12 && h.hour < 18)
  const eveningHours = validData.filter(h => h.hour >= 18 || h.hour < 6)

  const morningOrders = morningHours.reduce((sum, h) => sum + h.orders, 0)
  const afternoonOrders = afternoonHours.reduce((sum, h) => sum + h.orders, 0)
  const eveningOrders = eveningHours.reduce((sum, h) => sum + h.orders, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Peak Hours Analysis</h3>
          <p className="text-sm text-gray-600">Busiest hours for your restaurant</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
          <Clock className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      {/* Time Period Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">Morning (6AM-12PM)</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{morningOrders}</p>
          <p className="text-xs text-yellow-700 mt-1">
            {totalOrders > 0 ? ((morningOrders / totalOrders) * 100).toFixed(1) : 0}% of total
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700">Afternoon (12PM-6PM)</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{afternoonOrders}</p>
          <p className="text-xs text-orange-700 mt-1">
            {totalOrders > 0 ? ((afternoonOrders / totalOrders) * 100).toFixed(1) : 0}% of total
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span className="text-sm text-indigo-700">Evening (6PM-6AM)</span>
          </div>
          <p className="text-2xl font-bold text-indigo-900">{eveningOrders}</p>
          <p className="text-xs text-indigo-700 mt-1">
            {totalOrders > 0 ? ((eveningOrders / totalOrders) * 100).toFixed(1) : 0}% of total
          </p>
        </div>
      </div>

      {/* Hourly Chart */}
      {validData.filter(h => h.orders > 0).length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart using BarChart component */}
          <BarChart
            data={chartData}
            height={250}
            showGrid={true}
            showValues={false}
            barGradient={false}
            valueFormatter={(value) => `${value} orders`}
          />

          {/* Top Peak Hours */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Top 5 Busiest Hours</h4>
            <div className="space-y-2">
              {topPeakHours.map((hour, index) => (
                <div key={hour.hour} className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{formatHour(hour.hour)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="h-3 w-3" />
                      <span>{hour.orders} orders</span>
                    </div>
                    <div className="flex items-center gap-1 font-medium text-gray-900">
                      <DollarSign className="h-3 w-3" />
                      <span>{formatCurrency(hour.revenue)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Staffing Recommendations</h4>
            <div className="space-y-2 text-sm">
              {topPeakHours.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-blue-800">
                    Peak hour is <span className="font-semibold">{formatHour(topPeakHours[0].hour)}</span> with{' '}
                    <span className="font-semibold">{topPeakHours[0].orders} orders</span>. Ensure adequate staffing during this time.
                  </p>
                </div>
              )}

              {afternoonOrders > morningOrders && afternoonOrders > eveningOrders && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                  <Clock className="h-4 w-4 text-orange-600 mt-0.5" />
                  <p className="text-orange-800">
                    Afternoon (12PM-6PM) is your busiest period with <span className="font-semibold">{afternoonOrders} orders</span>. Plan lunch shift accordingly.
                  </p>
                </div>
              )}

              {morningOrders < totalOrders * 0.2 && (
                <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-600 mt-0.5" />
                  <p className="text-purple-800">
                    Morning sales are low. Consider breakfast promotions to attract more customers.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
