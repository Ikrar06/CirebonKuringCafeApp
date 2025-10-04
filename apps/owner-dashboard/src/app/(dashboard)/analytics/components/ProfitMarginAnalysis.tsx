'use client'

import { TrendingUp, TrendingDown, DollarSign, Percent, AlertCircle } from 'lucide-react'

interface ProfitMarginData {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  profitMargin: number
  targetMargin: number
  previousRevenue?: number
  previousCost?: number
  previousProfit?: number
  categoryBreakdown?: {
    category: string
    revenue: number
    cost: number
    profit: number
    margin: number
  }[]
}

interface ProfitMarginAnalysisProps {
  data: ProfitMarginData
}

export default function ProfitMarginAnalysis({ data }: ProfitMarginAnalysisProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const marginStatus = data.profitMargin >= data.targetMargin ? 'healthy' :
                       data.profitMargin >= data.targetMargin * 0.8 ? 'warning' : 'critical'

  const revenueGrowth = data.previousRevenue && data.previousRevenue > 0
    ? ((data.totalRevenue - data.previousRevenue) / data.previousRevenue) * 100
    : 0

  const profitGrowth = data.previousProfit && data.previousProfit > 0
    ? ((data.grossProfit - data.previousProfit) / data.previousProfit) * 100
    : 0

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-600 bg-green-50'
    if (margin >= 25) return 'text-blue-600 bg-blue-50'
    if (margin >= 15) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getMarginBorderColor = (margin: number) => {
    if (margin >= 40) return 'border-green-200'
    if (margin >= 25) return 'border-blue-200'
    if (margin >= 15) return 'border-yellow-200'
    return 'border-red-200'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Profit Margin Analysis</h3>
          <p className="text-sm text-gray-600">Revenue, costs, and profitability breakdown</p>
        </div>
        <div className={`p-3 rounded-lg ${
          marginStatus === 'healthy' ? 'bg-green-100' :
          marginStatus === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          <Percent className={`h-6 w-6 ${
            marginStatus === 'healthy' ? 'text-green-600' :
            marginStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
          }`} />
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Revenue */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-700">Total Revenue</span>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900 mb-1">
            {formatCurrency(data.totalRevenue)}
          </p>
          {revenueGrowth !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`h-3 w-3 ${revenueGrowth < 0 ? 'rotate-180' : ''}`} />
              <span>{revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Total Cost */}
        <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-red-700">Total Cost</span>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900 mb-1">
            {formatCurrency(data.totalCost)}
          </p>
          <p className="text-xs text-red-700">
            {data.totalRevenue > 0 ? ((data.totalCost / data.totalRevenue) * 100).toFixed(1) : 0}% of revenue
          </p>
        </div>

        {/* Gross Profit */}
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700">Gross Profit</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900 mb-1">
            {formatCurrency(data.grossProfit)}
          </p>
          {profitGrowth !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              profitGrowth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`h-3 w-3 ${profitGrowth < 0 ? 'rotate-180' : ''}`} />
              <span>{profitGrowth > 0 ? '+' : ''}{profitGrowth.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Profit Margin Overview */}
      <div className="mb-6 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Profit Margin</p>
            <div className="flex items-center gap-3">
              <p className={`text-4xl font-bold ${
                marginStatus === 'healthy' ? 'text-green-600' :
                marginStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.profitMargin.toFixed(1)}%
              </p>
              {marginStatus === 'healthy' ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className={`h-6 w-6 ${
                  marginStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`} />
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Target Margin</p>
            <p className="text-3xl font-bold text-gray-900">{data.targetMargin}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Progress to Target</span>
            <span>{((data.profitMargin / data.targetMargin) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                marginStatus === 'healthy' ? 'bg-green-500' :
                marginStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((data.profitMargin / data.targetMargin) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className={`mt-4 p-3 rounded-lg ${
          marginStatus === 'healthy' ? 'bg-green-100' :
          marginStatus === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          <p className={`text-sm ${
            marginStatus === 'healthy' ? 'text-green-800' :
            marginStatus === 'warning' ? 'text-yellow-800' : 'text-red-800'
          }`}>
            {marginStatus === 'healthy'
              ? '✓ Excellent! Your profit margin exceeds the target. Keep up the great work!'
              : marginStatus === 'warning'
              ? '⚠ Warning: Profit margin is below target. Review pricing and costs.'
              : '✗ Critical: Profit margin is significantly below target. Immediate action required.'}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {data.categoryBreakdown && data.categoryBreakdown.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Profit Margin by Category</h4>
          <div className="space-y-3">
            {data.categoryBreakdown
              .sort((a, b) => b.margin - a.margin)
              .map((cat) => (
                <div key={cat.category} className={`p-4 rounded-lg border ${getMarginBorderColor(cat.margin)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-gray-900">{cat.category}</h5>
                        <span className={`px-2 py-1 rounded-lg text-sm font-bold ${getMarginColor(cat.margin)}`}>
                          {cat.margin.toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                        <div>
                          <p className="text-gray-500">Revenue</p>
                          <p className="font-medium text-gray-900">{formatCurrency(cat.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Cost</p>
                          <p className="font-medium text-gray-900">{formatCurrency(cat.cost)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Profit</p>
                          <p className="font-medium text-gray-900">{formatCurrency(cat.profit)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Margin Bar */}
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cat.margin >= 40 ? 'bg-green-500' :
                        cat.margin >= 25 ? 'bg-blue-500' :
                        cat.margin >= 15 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(cat.margin, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recommendations</h4>
        <div className="space-y-2 text-sm">
          {data.profitMargin < data.targetMargin && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <p className="text-yellow-800">
                To reach your target margin of {data.targetMargin}%, you need to increase profit by{' '}
                <span className="font-semibold">
                  {formatCurrency((data.totalRevenue * (data.targetMargin / 100)) - data.grossProfit)}
                </span>.
              </p>
            </div>
          )}

          {data.categoryBreakdown && data.categoryBreakdown.some(cat => cat.margin < 15) && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-red-800">
                Some categories have low profit margins (below 15%). Consider reviewing pricing or reducing costs for these items.
              </p>
            </div>
          )}

          {data.categoryBreakdown && data.categoryBreakdown.some(cat => cat.margin >= 40) && (
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-green-800">
                Some categories have excellent profit margins (40%+). Consider promoting these high-margin items more.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
