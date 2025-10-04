'use client'

import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface CashFlowData {
  income: number
  expenses: number
  netCashFlow: number
  previousIncome: number
  previousExpenses: number
}

interface CashFlowWidgetProps {
  data: CashFlowData
}

export default function CashFlowWidget({ data }: CashFlowWidgetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const incomeGrowth = data.previousIncome > 0
    ? ((data.income - data.previousIncome) / data.previousIncome) * 100
    : 0

  const expenseGrowth = data.previousExpenses > 0
    ? ((data.expenses - data.previousExpenses) / data.previousExpenses) * 100
    : 0

  const isPositiveCashFlow = data.netCashFlow > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cash Flow</h3>
          <p className="text-sm text-gray-600">Income vs Expenses</p>
        </div>
        <div className={`p-3 rounded-lg ${isPositiveCashFlow ? 'bg-green-100' : 'bg-red-100'}`}>
          <DollarSign className={`h-6 w-6 ${isPositiveCashFlow ? 'text-green-600' : 'text-red-600'}`} />
        </div>
      </div>

      {/* Net Cash Flow */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Net Cash Flow</p>
        <div className="flex items-center gap-2">
          <p className={`text-3xl font-bold ${
            isPositiveCashFlow ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(Math.abs(data.netCashFlow))}
          </p>
          {isPositiveCashFlow ? (
            <TrendingUp className="h-6 w-6 text-green-600" />
          ) : (
            <TrendingDown className="h-6 w-6 text-red-600" />
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {isPositiveCashFlow ? 'Positive cash flow' : 'Negative cash flow'}
        </p>
      </div>

      {/* Income */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">Income</span>
          </div>
          {incomeGrowth !== 0 && (
            <span className={`text-xs font-medium ${
              incomeGrowth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {incomeGrowth > 0 ? '+' : ''}{incomeGrowth.toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-xl font-bold text-gray-900">{formatCurrency(data.income)}</p>
        <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-green-500 h-full rounded-full transition-all"
            style={{
              width: `${data.income > 0 ? (data.income / (data.income + data.expenses)) * 100 : 0}%`
            }}
          />
        </div>
      </div>

      {/* Expenses */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4 text-red-600" />
            <span className="text-sm text-gray-600">Expenses</span>
          </div>
          {expenseGrowth !== 0 && (
            <span className={`text-xs font-medium ${
              expenseGrowth > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {expenseGrowth > 0 ? '+' : ''}{expenseGrowth.toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-xl font-bold text-gray-900">{formatCurrency(data.expenses)}</p>
        <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-red-500 h-full rounded-full transition-all"
            style={{
              width: `${data.expenses > 0 ? (data.expenses / (data.income + data.expenses)) * 100 : 0}%`
            }}
          />
        </div>
      </div>

      {/* Cash Flow Ratio */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Income Ratio</p>
            <p className="text-lg font-semibold text-green-600">
              {data.income > 0 ? ((data.income / (data.income + data.expenses)) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Expense Ratio</p>
            <p className="text-lg font-semibold text-red-600">
              {data.expenses > 0 ? ((data.expenses / (data.income + data.expenses)) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
