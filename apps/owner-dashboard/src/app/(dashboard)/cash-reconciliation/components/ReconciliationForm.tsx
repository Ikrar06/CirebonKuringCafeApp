'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'

interface ReconciliationFormProps {
  expectedAmount: number
  actualAmount: number
  variance: number
  denominationBreakdown: any
  onSubmit: (data: ReconciliationData) => void
  onCancel: () => void
}

export interface ReconciliationData {
  date: string
  expected_amount: number
  actual_amount: number
  variance: number
  denomination_breakdown: any
  notes: string
  reconciled_by: string
  status: 'balanced' | 'variance_approved' | 'pending_review'
}

export default function ReconciliationForm({
  expectedAmount,
  actualAmount,
  variance,
  denominationBreakdown,
  onSubmit,
  onCancel
}: ReconciliationFormProps) {
  const [notes, setNotes] = useState('')
  const [reconciledBy, setReconciledBy] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reconciledBy.trim()) {
      alert('Please enter the name of the person reconciling')
      return
    }

    setIsSubmitting(true)

    const status = variance === 0 ? 'balanced' : 'pending_review'

    const data: ReconciliationData = {
      date: new Date().toISOString().split('T')[0],
      expected_amount: expectedAmount,
      actual_amount: actualAmount,
      variance: variance,
      denomination_breakdown: denominationBreakdown,
      notes: notes.trim(),
      reconciled_by: reconciledBy.trim(),
      status
    }

    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Complete Reconciliation</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Summary</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-600">Expected</div>
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(expectedAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Actual</div>
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(actualAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Variance</div>
              <div className={`text-sm font-semibold ${
                variance === 0 ? 'text-green-600' :
                variance > 0 ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
              </div>
            </div>
          </div>
        </div>

        {/* Reconciled By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reconciled By <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reconciledBy}
            onChange={(e) => setReconciledBy(e.target.value)}
            placeholder="Enter your name"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes {variance !== 0 && <span className="text-red-500">* (Required for variance)</span>}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              variance !== 0
                ? 'Please explain the variance and any actions taken...'
                : 'Add any additional notes or observations...'
            }
            required={variance !== 0}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {variance !== 0
              ? 'Explain the reason for variance and corrective actions taken'
              : 'Optional: Add any observations or comments about the reconciliation'
            }
          </p>
        </div>

        {/* Denomination Breakdown Summary */}
        {Object.keys(denominationBreakdown).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Denomination Breakdown
            </label>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {Object.entries(denominationBreakdown)
                  .filter(([_, count]) => (count as number) > 0)
                  .map(([value, count]) => (
                    <div key={value} className="flex justify-between">
                      <span className="text-gray-600">
                        {formatCurrency(parseInt(value))}:
                      </span>
                      <span className="font-semibold text-gray-900">{count as number}x</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Warning for Variance */}
        {variance !== 0 && (
          <div className={`p-4 rounded-lg border ${
            variance > 0
              ? 'bg-orange-50 border-orange-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm ${
              variance > 0 ? 'text-orange-900' : 'text-red-900'
            }`}>
              ⚠️ This reconciliation has a variance of {formatCurrency(Math.abs(variance))}.
              {variance > 0 ? ' Cash overage detected.' : ' Cash shortage detected.'}
              {' '}Please ensure you have documented the reason and taken appropriate action before submitting.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Reconciliation'}
          </button>
        </div>
      </form>
    </div>
  )
}
