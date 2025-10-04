'use client'

import { useState } from 'react'
import { DollarSign, Calculator, TrendingUp, TrendingDown } from 'lucide-react'

interface CashCounterProps {
  expectedAmount: number
  actualAmount: number
}

export default function CashCounter({ expectedAmount, actualAmount }: CashCounterProps) {
  const variance = actualAmount - expectedAmount
  const variancePercent = expectedAmount > 0 ? (variance / expectedAmount) * 100 : 0
  const isOver = variance > 0
  const isUnder = variance < 0
  const isMatch = variance === 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <DollarSign className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cash Summary</h3>
          <p className="text-sm text-gray-600">Compare expected vs actual amounts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Expected Amount */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Expected</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(expectedAmount)}</p>
          <p className="text-xs text-blue-700 mt-1">From system records</p>
        </div>

        {/* Actual Amount */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Actual Count</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(actualAmount)}</p>
          <p className="text-xs text-green-700 mt-1">Physical cash counted</p>
        </div>

        {/* Variance */}
        <div className={`rounded-lg p-4 ${
          isMatch ? 'bg-gray-50' :
          isOver ? 'bg-orange-50' :
          'bg-red-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isMatch ? (
              <Calculator className="h-4 w-4 text-gray-600" />
            ) : isOver ? (
              <TrendingUp className="h-4 w-4 text-orange-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              isMatch ? 'text-gray-900' :
              isOver ? 'text-orange-900' :
              'text-red-900'
            }`}>
              Variance
            </span>
          </div>
          <p className={`text-2xl font-bold ${
            isMatch ? 'text-gray-900' :
            isOver ? 'text-orange-900' :
            'text-red-900'
          }`}>
            {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
          </p>
          <p className={`text-xs mt-1 ${
            isMatch ? 'text-gray-700' :
            isOver ? 'text-orange-700' :
            'text-red-700'
          }`}>
            {isMatch ? 'Perfect match!' :
             isOver ? `${variancePercent.toFixed(2)}% over` :
             `${Math.abs(variancePercent).toFixed(2)}% under`}
          </p>
        </div>
      </div>

      {/* Variance Alert */}
      {!isMatch && (
        <div className={`mt-4 p-4 rounded-lg border ${
          isOver ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {isOver ? (
              <TrendingUp className="h-5 w-5 text-orange-600 mt-0.5" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div>
              <h4 className={`font-medium ${
                isOver ? 'text-orange-900' : 'text-red-900'
              }`}>
                {isOver ? 'Cash Overage Detected' : 'Cash Shortage Detected'}
              </h4>
              <p className={`text-sm mt-1 ${
                isOver ? 'text-orange-700' : 'text-red-700'
              }`}>
                {isOver
                  ? `There is ${formatCurrency(variance)} more cash than expected. Please verify the count and check for any unrecorded sales.`
                  : `There is ${formatCurrency(Math.abs(variance))} less cash than expected. Please recount and check for any errors or missing transactions.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {isMatch && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Calculator className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Cash Balanced</h4>
              <p className="text-sm text-green-700 mt-1">
                The physical cash count matches the system records perfectly. No discrepancies found.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
