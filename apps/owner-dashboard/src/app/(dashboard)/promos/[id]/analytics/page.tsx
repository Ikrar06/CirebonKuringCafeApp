'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, TrendingUp, Users, DollarSign, Activity, Calendar, Tag } from 'lucide-react'
import Link from 'next/link'

export default function PromoAnalyticsPage() {
  const params = useParams()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [params.id])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/promos/${params.id}/analytics`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const result = await response.json()
      setData(result.data)
    } catch (error) {
      console.error('Error loading analytics:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center">
        <p className="text-gray-600">Analytics not found</p>
        <Link href="/promos" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Promos
        </Link>
      </div>
    )
  }

  const { promo, analytics } = data
  const maxUsage = Math.max(...(analytics.usage_timeline?.map((u: any) => u.uses) || [1]))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/promos/${params.id}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Promo Analytics</h1>
            <p className="text-gray-600">{promo.name}</p>
          </div>
        </div>
      </div>

      {/* Promo Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Tag className="h-8 w-8 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-purple-900 mb-1">{promo.name}</h2>
            {promo.description && (
              <p className="text-purple-800 mb-2">{promo.description}</p>
            )}
            <div className="flex items-center gap-3">
              {promo.code && (
                <span className="px-3 py-1 bg-purple-100 rounded-lg text-purple-900 font-mono font-bold">
                  {promo.code}
                </span>
              )}
              <span className="text-2xl font-bold text-purple-900">
                {promo.promo_type === 'percentage'
                  ? `${promo.discount_value}% OFF`
                  : `${formatCurrency(promo.discount_value)} OFF`}
              </span>
              <span className={`px-3 py-1 rounded-lg font-medium ${
                promo.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {promo.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Uses</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.total_uses}</p>
            </div>
          </div>
          {promo.max_uses_total && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Limit</span>
                <span className="font-semibold text-gray-900">{promo.max_uses_total}</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min((analytics.total_uses / promo.max_uses_total) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Discount Given</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.total_discount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Discount</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(analytics.average_discount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Unique Customers</p>
              <p className="text-3xl font-bold text-orange-600">
                {analytics.unique_customers}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Timeline */}
      {analytics.usage_timeline && analytics.usage_timeline.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Timeline</h3>

          <div className="space-y-2">
            {analytics.usage_timeline.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-600">
                  {formatDate(item.date)}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-full h-8 relative">
                    <div
                      className="bg-blue-600 h-8 rounded-full flex items-center px-3 text-white text-sm font-semibold"
                      style={{ width: `${(item.uses / maxUsage) * 100}%`, minWidth: '60px' }}
                    >
                      {item.uses} {item.uses === 1 ? 'use' : 'uses'}
                    </div>
                  </div>
                </div>
                <div className="w-32 text-right text-sm font-semibold text-green-600">
                  {formatCurrency(item.discount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Usage */}
      {analytics.recent_usage && analytics.recent_usage.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Usage</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date & Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Discount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Final Amount</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent_usage.map((usage: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDateTime(usage.used_at)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {usage.customer_phone || usage.customer_email || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {usage.order_amount ? formatCurrency(parseFloat(usage.order_amount)) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-green-600">
                      -{formatCurrency(parseFloat(usage.discount_amount || 0))}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                      {usage.final_amount ? formatCurrency(parseFloat(usage.final_amount)) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!analytics.recent_usage || analytics.recent_usage.length === 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Usage Data Yet</h3>
          <p className="text-gray-600">
            This promo hasn't been used yet. Share the code with customers to start tracking usage.
          </p>
        </div>
      )}
    </div>
  )
}
