'use client'

import { useState, useEffect } from 'react'
import { Banknote, Coins } from 'lucide-react'

interface DenominationCalculatorProps {
  onTotalChange: (total: number, breakdown: DenominationBreakdown) => void
}

export interface DenominationBreakdown {
  [key: string]: number
}

const DENOMINATIONS = [
  { value: 100000, label: 'Rp 100.000', type: 'note' },
  { value: 50000, label: 'Rp 50.000', type: 'note' },
  { value: 20000, label: 'Rp 20.000', type: 'note' },
  { value: 10000, label: 'Rp 10.000', type: 'note' },
  { value: 5000, label: 'Rp 5.000', type: 'note' },
  { value: 2000, label: 'Rp 2.000', type: 'note' },
  { value: 1000, label: 'Rp 1.000', type: 'note' },
  { value: 500, label: 'Rp 500', type: 'coin' },
  { value: 200, label: 'Rp 200', type: 'coin' },
  { value: 100, label: 'Rp 100', type: 'coin' }
]

export default function DenominationCalculator({ onTotalChange }: DenominationCalculatorProps) {
  const [counts, setCounts] = useState<DenominationBreakdown>({})
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const newTotal = DENOMINATIONS.reduce((sum, denom) => {
      const count = counts[denom.value] || 0
      return sum + (denom.value * count)
    }, 0)

    setTotal(newTotal)
    onTotalChange(newTotal, counts)
  }, [counts, onTotalChange])

  const handleCountChange = (value: number, count: string) => {
    const numCount = parseInt(count) || 0
    setCounts(prev => ({
      ...prev,
      [value]: numCount
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const resetAll = () => {
    setCounts({})
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Cash Denomination Calculator</h3>
        <button
          onClick={resetAll}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {/* Banknotes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="h-4 w-4 text-green-600" />
            <h4 className="text-sm font-medium text-gray-700">Banknotes</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DENOMINATIONS.filter(d => d.type === 'note').map(denom => {
              const count = counts[denom.value] || 0
              const subtotal = denom.value * count

              return (
                <div key={denom.value} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{denom.label}</div>
                    {count > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {count} × {formatCurrency(denom.value)} = {formatCurrency(subtotal)}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={count || ''}
                    onChange={(e) => handleCountChange(denom.value, e.target.value)}
                    placeholder="0"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Coins */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Coins className="h-4 w-4 text-orange-600" />
            <h4 className="text-sm font-medium text-gray-700">Coins</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DENOMINATIONS.filter(d => d.type === 'coin').map(denom => {
              const count = counts[denom.value] || 0
              const subtotal = denom.value * count

              return (
                <div key={denom.value} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{denom.label}</div>
                    {count > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {count} × {formatCurrency(denom.value)} = {formatCurrency(subtotal)}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={count || ''}
                    onChange={(e) => handleCountChange(denom.value, e.target.value)}
                    placeholder="0"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">Total Cash Count</span>
          <span className="text-2xl font-bold text-green-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
