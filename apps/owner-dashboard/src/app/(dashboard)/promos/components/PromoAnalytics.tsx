'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Link from 'next/link'

interface PromoAnalyticsProps {
  promoId: string
  showDetails?: boolean
}

interface AnalyticsData {
  total_uses: number
  total_discount: number
  average_discount: number
  unique_customers: number
  usage_timeline?: Array<{
    date: string
    uses: number
    discount: number
  }>
}

export default function PromoAnalytics({ promoId, showDetails = false }: PromoAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [promoId])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/promos/${promoId}/analytics`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const { data } = await response.json()
      setAnalytics(data.analytics)
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

  const getTrend = () => {
    if (!analytics?.usage_timeline || analytics.usage_timeline.length < 2) {
      return { direction: 'neutral', percentage: 0 }
    }

    const timeline = analytics.usage_timeline
    const recentUses = timeline.slice(-7).reduce((sum, day) => sum + day.uses, 0)
    const previousUses = timeline.slice(-14, -7).reduce((sum, day) => sum + day.uses, 0)

    if (previousUses === 0) {
      return { direction: 'up', percentage: 100 }
    }

    const change = ((recentUses - previousUses) / previousUses) * 100
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(Math.round(change))
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  const trend = getTrend()

  const metrics = [
    {
      label: 'Total Uses',
      value: analytics.total_uses,
      icon: Activity,
      color: 'blue',
      format: (val: number) => val.toString()
    },
    {
      label: 'Total Discount',
      value: analytics.total_discount,
      icon: DollarSign,
      color: 'green',
      format: formatCurrency
    },
    {
      label: 'Average Discount',
      value: analytics.average_discount,
      icon: TrendingUp,
      color: 'purple',
      format: formatCurrency
    },
    {
      label: 'Unique Customers',
      value: analytics.unique_customers,
      icon: Users,
      color: 'orange',
      format: (val: number) => val.toString()
    }
  ]

  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'text-orange-600' }
  }

  return (
    <div className="space-y-4">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          const colors = colorClasses[metric.color]

          return (
            <div key={metric.label} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{metric.label}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>
                    {metric.format(metric.value)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trend Indicator */}
      {showDetails && analytics.usage_timeline && analytics.usage_timeline.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Usage Trend</h3>
              <p className="text-sm text-gray-600">Last 7 days vs previous 7 days</p>
            </div>
            <div className="flex items-center gap-2">
              {trend.direction === 'up' && (
                <>
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">+{trend.percentage}%</span>
                </>
              )}
              {trend.direction === 'down' && (
                <>
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">-{trend.percentage}%</span>
                </>
              )}
              {trend.direction === 'neutral' && (
                <span className="text-2xl font-bold text-gray-600">0%</span>
              )}
            </div>
          </div>

          {/* Mini Timeline */}
          <div className="mt-4 flex items-end gap-1 h-20">
            {analytics.usage_timeline.slice(-14).map((day, index) => {
              const maxUses = Math.max(...analytics.usage_timeline!.slice(-14).map(d => d.uses))
              const height = maxUses > 0 ? (day.uses / maxUses) * 100 : 0

              return (
                <div
                  key={index}
                  className="flex-1 relative group"
                  style={{ height: '100%' }}
                >
                  <div
                    className={`absolute bottom-0 w-full rounded-t transition-all ${
                      index >= 7 ? 'bg-blue-400' : 'bg-gray-300'
                    } group-hover:bg-blue-600`}
                    style={{ height: `${height}%` }}
                  >
                    <div className="hidden group-hover:block absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {day.uses} uses
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>14 days ago</span>
            <span>Today</span>
          </div>
        </div>
      )}

      {/* View Full Analytics Link */}
      {showDetails && (
        <div className="text-center">
          <Link
            href={`/promos/${promoId}/analytics`}
            className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            View Full Analytics
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
