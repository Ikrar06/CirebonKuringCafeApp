'use client'

import { useState, useEffect } from 'react'
import { Calculator, History, RefreshCw, CheckCircle, XCircle, Info } from 'lucide-react'
import Link from 'next/link'
import DenominationCalculator, { DenominationBreakdown } from './components/DenominationCalculator'
import CashCounter from './components/CashCounter'
import VarianceAnalysis from './components/VarianceAnalysis'
import ReconciliationForm, { ReconciliationData } from './components/ReconciliationForm'

export default function CashReconciliationPage() {
  const [expectedAmount, setExpectedAmount] = useState(0)
  const [actualAmount, setActualAmount] = useState(0)
  const [denominationBreakdown, setDenominationBreakdown] = useState<DenominationBreakdown>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null)
  const [expectedDetails, setExpectedDetails] = useState<{starting_cash: number, cash_sales: number, total_orders: number} | null>(null)

  useEffect(() => {
    loadExpectedAmount()
  }, [])

  const loadExpectedAmount = async () => {
    try {
      setIsLoading(true)
      const today = new Date().toISOString().split('T')[0]

      // Fetch expected amount from API
      const response = await fetch(`/api/cash-reconciliation/expected?date=${today}`)
      if (!response.ok) {
        throw new Error('Failed to fetch expected amount')
      }

      const { data } = await response.json()
      setExpectedAmount(data.expected_amount || 0)
      setExpectedDetails({
        starting_cash: data.starting_cash || 0,
        cash_sales: data.cash_sales || 0,
        total_orders: data.total_orders || 0
      })

      console.log('Expected amount loaded:', data)
    } catch (error) {
      console.error('Error loading expected amount:', error)
      // Fallback to default
      setExpectedAmount(500000)
      setExpectedDetails({
        starting_cash: 500000,
        cash_sales: 0,
        total_orders: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDenominationChange = (total: number, breakdown: DenominationBreakdown) => {
    setActualAmount(total)
    setDenominationBreakdown(breakdown)
  }

  const handleSubmitReconciliation = async (data: ReconciliationData) => {
    try {
      console.log('Submitting reconciliation:', data)

      // Get expected amount details
      const today = new Date().toISOString().split('T')[0]
      const expectedResponse = await fetch(`/api/cash-reconciliation/expected?date=${today}`)
      const { data: expectedData } = await expectedResponse.json()

      // Submit reconciliation to API
      const response = await fetch('/api/cash-reconciliation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: data.date,
          starting_cash: expectedData.starting_cash,
          system_cash_sales: expectedData.cash_sales,
          actual_cash: data.actual_amount,
          denomination_breakdown: data.denomination_breakdown,
          notes: data.notes,
          reconciled_by: data.reconciled_by
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit reconciliation')
      }

      const result = await response.json()
      console.log('Reconciliation submitted:', result)

      // Show success notification
      setNotification({
        type: 'success',
        message: 'Reconciliation submitted successfully!'
      })

      // Reset form
      setShowForm(false)
      setActualAmount(0)
      setDenominationBreakdown({})

      // Reload expected amount
      loadExpectedAmount()

      // Auto hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000)
    } catch (error: any) {
      console.error('Error submitting reconciliation:', error)
      setNotification({
        type: 'error',
        message: error.message || 'Failed to submit reconciliation'
      })

      // Auto hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const variance = actualAmount - expectedAmount

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg border ${
            notification.type === 'success' ? 'bg-green-50 border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {notification.type === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
            {notification.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
            <p className={`font-medium ${
              notification.type === 'success' ? 'text-green-900' :
              notification.type === 'error' ? 'text-red-900' :
              'text-blue-900'
            }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 p-1 hover:bg-black/5 rounded"
            >
              <XCircle className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calculator className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cash Reconciliation</h1>
              <p className="text-gray-600">Count and verify daily cash against system records</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadExpectedAmount}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/cash-reconciliation/history"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            View History
          </Link>
        </div>
      </div>

      {/* Date Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">Reconciliation Date</h3>
            <p className="text-lg font-semibold text-blue-900 mt-1">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-700">Today's Cash Count</p>
          </div>
        </div>
      </div>

      {/* Expected Amount Info */}
      {expectedDetails && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">Expected Cash Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-purple-700">Starting Cash (Modal)</p>
                  <p className="text-lg font-bold text-purple-900">{formatCurrency(expectedDetails.starting_cash)}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-700">Today's Cash Sales ({expectedDetails.total_orders} orders)</p>
                  <p className="text-lg font-bold text-purple-900">{formatCurrency(expectedDetails.cash_sales)}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-700">Total Expected</p>
                  <p className="text-lg font-bold text-purple-900">{formatCurrency(expectedAmount)}</p>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                💡 Expected amount = Starting cash + Cash sales from today's orders
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Cash Counter Summary */}
          <CashCounter
            expectedAmount={expectedAmount}
            actualAmount={actualAmount}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Denomination Calculator */}
            <DenominationCalculator onTotalChange={handleDenominationChange} />

            {/* Variance Analysis */}
            <VarianceAnalysis
              variance={variance}
              expectedAmount={expectedAmount}
              actualAmount={actualAmount}
            />
          </div>

          {/* Reconciliation Form */}
          {actualAmount > 0 && !showForm && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-lg"
              >
                Proceed to Submit Reconciliation
              </button>
            </div>
          )}

          {showForm && (
            <ReconciliationForm
              expectedAmount={expectedAmount}
              actualAmount={actualAmount}
              variance={variance}
              denominationBreakdown={denominationBreakdown}
              onSubmit={handleSubmitReconciliation}
              onCancel={() => setShowForm(false)}
            />
          )}

          {/* Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">How to Use Cash Reconciliation</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gray-900">1.</span>
                <span>Count all physical cash in the register/drawer by denomination</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gray-900">2.</span>
                <span>Enter the count for each denomination in the calculator</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gray-900">3.</span>
                <span>Review the variance analysis - the system will compare your count against expected sales</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gray-900">4.</span>
                <span>If there's a variance, provide detailed notes explaining the discrepancy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gray-900">5.</span>
                <span>Submit the reconciliation report for management review</span>
              </li>
            </ol>
          </div>
        </>
      )}
    </div>
  )
}
