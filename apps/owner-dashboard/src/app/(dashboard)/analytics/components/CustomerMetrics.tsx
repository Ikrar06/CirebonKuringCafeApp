'use client'

import { Users, TrendingUp, Calendar, UserCheck, UserPlus, Repeat } from 'lucide-react'

interface CustomerMetricsData {
  totalCustomers: number
  newCustomers: number
  repeatCustomers: number
  averageOrdersPerCustomer: number
  customerRetentionRate: number
  customerLifetimeValue: number
  previousTotalCustomers?: number
  previousNewCustomers?: number
}

interface CustomerMetricsProps {
  data: CustomerMetricsData
}

export default function CustomerMetrics({ data }: CustomerMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const customerGrowth = data.previousTotalCustomers && data.previousTotalCustomers > 0
    ? ((data.totalCustomers - data.previousTotalCustomers) / data.previousTotalCustomers) * 100
    : 0

  const newCustomerGrowth = data.previousNewCustomers && data.previousNewCustomers > 0
    ? ((data.newCustomers - data.previousNewCustomers) / data.previousNewCustomers) * 100
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Customer Analytics</h3>
          <p className="text-sm text-gray-600">Customer behavior and retention metrics</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
          <Users className="h-6 w-6 text-purple-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Customers */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-700">Total Customers</span>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900 mb-1">
            {data.totalCustomers}
          </p>
          {customerGrowth !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              customerGrowth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`h-3 w-3 ${customerGrowth < 0 ? 'rotate-180' : ''}`} />
              <span>{customerGrowth > 0 ? '+' : ''}{customerGrowth.toFixed(1)}% from previous period</span>
            </div>
          )}
        </div>

        {/* New Customers */}
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700">New Customers</span>
            <UserPlus className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900 mb-1">
            {data.newCustomers}
          </p>
          {newCustomerGrowth !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              newCustomerGrowth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`h-3 w-3 ${newCustomerGrowth < 0 ? 'rotate-180' : ''}`} />
              <span>{newCustomerGrowth > 0 ? '+' : ''}{newCustomerGrowth.toFixed(1)}% growth</span>
            </div>
          )}
        </div>

        {/* Repeat Customers */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-700">Repeat Customers</span>
            <Repeat className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900 mb-1">
            {data.repeatCustomers}
          </p>
          <p className="text-xs text-purple-700">
            {data.totalCustomers > 0
              ? ((data.repeatCustomers / data.totalCustomers) * 100).toFixed(1)
              : 0}% of total
          </p>
        </div>

        {/* Average Orders Per Customer */}
        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-orange-700">Avg Orders/Customer</span>
            <Calendar className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900 mb-1">
            {data.averageOrdersPerCustomer.toFixed(1)}
          </p>
          <p className="text-xs text-orange-700">
            {data.averageOrdersPerCustomer >= 2
              ? 'Great engagement!'
              : 'Room for improvement'}
          </p>
        </div>

        {/* Retention Rate */}
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-indigo-700">Retention Rate</span>
            <UserCheck className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-indigo-900 mb-1">
            {data.customerRetentionRate.toFixed(1)}%
          </p>
          <div className="mt-2 bg-white rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(data.customerRetentionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Customer Lifetime Value */}
        <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg border border-pink-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-pink-700">Lifetime Value</span>
            <TrendingUp className="h-5 w-5 text-pink-600" />
          </div>
          <p className="text-2xl font-bold text-pink-900 mb-1">
            {formatCurrency(data.customerLifetimeValue)}
          </p>
          <p className="text-xs text-pink-700">Average per customer</p>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Customer Insights</h4>
        <div className="space-y-2 text-sm">
          {data.customerRetentionRate >= 40 ? (
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-green-800">
                Excellent retention rate! Your customers are loyal and coming back regularly.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-yellow-600 mt-0.5" />
              <p className="text-yellow-800">
                Consider implementing loyalty programs or special offers to improve customer retention.
              </p>
            </div>
          )}

          {data.averageOrdersPerCustomer < 2 && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Repeat className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-blue-800">
                Focus on encouraging repeat visits through promotions and excellent service.
              </p>
            </div>
          )}

          {data.newCustomers > data.repeatCustomers && (
            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
              <UserPlus className="h-4 w-4 text-purple-600 mt-0.5" />
              <p className="text-purple-800">
                You're attracting new customers well! Now focus on converting them to repeat customers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
