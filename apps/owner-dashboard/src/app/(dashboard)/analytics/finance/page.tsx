'use client'

import { useState, useEffect } from 'react'
import { DollarSign } from 'lucide-react'
import { analyticsService, DateRange } from '@/services/analyticsService'
import CashFlowWidget from '../components/CashFlowWidget'
import ProfitMarginAnalysis from '../components/ProfitMarginAnalysis'

type PeriodType = 'today' | 'week' | 'month' | 'year'

export default function FinanceAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodType>('month')
  const [dateRange, setDateRange] = useState<DateRange>(
    analyticsService.getDateRangeForPeriod('month')
  )
  const [previousDateRange, setPreviousDateRange] = useState<DateRange>(
    analyticsService.getPreviousPeriod(analyticsService.getDateRangeForPeriod('month'))
  )
  const [isLoading, setIsLoading] = useState(true)
  const [cashFlowData, setCashFlowData] = useState<any>(null)
  const [profitData, setProfitData] = useState<any>(null)

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
      const [currentSummary, previousSummary, categoryData] = await Promise.all([
        analyticsService.getAnalyticsSummary(range, prevRange),
        analyticsService.getAnalyticsSummary(prevRange, {
          startDate: new Date(new Date(prevRange.startDate).getTime() - (new Date(prevRange.endDate).getTime() - new Date(prevRange.startDate).getTime())).toISOString(),
          endDate: prevRange.startDate
        }),
        analyticsService.getSalesByCategory(range)
      ])

      // Get menu performance for category breakdown
      const menuPerf = await analyticsService.getMenuPerformance(range)
      const categoryBreakdown = categoryData.map(cat => {
        const items = menuPerf.filter(item => item.category === cat.category)
        const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0)
        const totalCost = items.reduce((sum, item) => sum + (item.revenue * (1 - item.profitMargin / 100)), 0)
        const profit = totalRevenue - totalCost
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

        return {
          category: cat.category,
          revenue: totalRevenue,
          cost: totalCost,
          profit: profit,
          margin: margin
        }
      }).filter(cat => cat.revenue > 0)

      // Cash flow data
      const income = currentSummary.totalRevenue
      const expenses = currentSummary.totalRevenue - currentSummary.totalProfit
      const netCashFlow = currentSummary.totalProfit
      const previousIncome = previousSummary.totalRevenue
      const previousExpenses = previousSummary.totalRevenue - previousSummary.totalProfit

      setCashFlowData({
        income,
        expenses,
        netCashFlow,
        previousIncome,
        previousExpenses
      })

      // Profit margin data
      setProfitData({
        totalRevenue: currentSummary.totalRevenue,
        totalCost: currentSummary.totalRevenue - currentSummary.totalProfit,
        grossProfit: currentSummary.totalProfit,
        profitMargin: currentSummary.profitMargin,
        targetMargin: 30, // Default target margin
        previousRevenue: previousSummary.totalRevenue,
        previousCost: previousSummary.totalRevenue - previousSummary.totalProfit,
        previousProfit: previousSummary.totalProfit,
        categoryBreakdown
      })
    } catch (error) {
      console.error('Error loading finance data:', error)
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
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
              <p className="text-gray-600">Cash flow, profit margins, and financial insights</p>
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
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cash Flow Widget */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
        </div>
      ) : cashFlowData ? (
        <CashFlowWidget data={cashFlowData} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-80 flex items-center justify-center text-gray-500">
            No cash flow data available
          </div>
        </div>
      )}

      {/* Profit Margin Analysis */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        </div>
      ) : profitData ? (
        <ProfitMarginAnalysis data={profitData} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-96 flex items-center justify-center text-gray-500">
            No profit margin data available
          </div>
        </div>
      )}
    </div>
  )
}
