'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, CheckCircle, AlertTriangle, Clock, Search, Filter, Eye } from 'lucide-react'
import Link from 'next/link'

interface ReconciliationRecord {
  id: string
  date: string
  expected_amount: number
  actual_amount: number
  variance: number
  status: 'balanced' | 'variance_approved' | 'pending_review'
  reconciled_by: string
  notes?: string
  created_at: string
}

export default function ReconciliationHistoryPage() {
  const [records, setRecords] = useState<ReconciliationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null)

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      setIsLoading(true)

      // Fetch from API
      const response = await fetch('/api/cash-reconciliation')
      if (!response.ok) {
        throw new Error('Failed to fetch reconciliation records')
      }

      const { data } = await response.json()

      // Transform data to match our interface
      const transformedRecords: ReconciliationRecord[] = (data || []).map((record: any) => {
        const expected = (record.starting_cash || 0) + (record.system_cash_sales || 0) - (record.system_cash_returns || 0)
        const variance = (record.actual_cash || 0) - expected

        // Map database status to our simplified status
        let status: 'balanced' | 'variance_approved' | 'pending_review' = 'balanced'
        if (record.status === 'discrepancy' || variance !== 0) {
          status = record.variance_approved ? 'variance_approved' : 'pending_review'
        }

        return {
          id: record.id,
          date: record.date,
          expected_amount: expected,
          actual_amount: record.actual_cash || 0,
          variance: variance,
          status: status,
          reconciled_by: record.variance_reason || 'Unknown',
          notes: record.notes,
          created_at: record.created_at || record.closed_at
        }
      })

      setRecords(transformedRecords)
      console.log('Loaded reconciliation records:', transformedRecords.length)
    } catch (error) {
      console.error('Error loading records:', error)
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'balanced':
        return {
          label: 'Balanced',
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        }
      case 'variance_approved':
        return {
          label: 'Variance Approved',
          color: 'bg-blue-100 text-blue-800',
          icon: CheckCircle,
          iconColor: 'text-blue-600'
        }
      case 'pending_review':
        return {
          label: 'Pending Review',
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock,
          iconColor: 'text-yellow-600'
        }
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800',
          icon: AlertTriangle,
          iconColor: 'text-gray-600'
        }
    }
  }

  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchQuery ||
      record.reconciled_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.date.includes(searchQuery) ||
      record.notes?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = !filterStatus || record.status === filterStatus

    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/cash-reconciliation"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reconciliation History</h1>
            <p className="text-gray-600">View and review past cash reconciliations</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by date, person, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            >
              <option value="">All Statuses</option>
              <option value="balanced">Balanced</option>
              <option value="variance_approved">Variance Approved</option>
              <option value="pending_review">Pending Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Records Found</h3>
            <p className="text-gray-600">No reconciliation records match your search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => {
                  const statusConfig = getStatusConfig(record.status)
                  const StatusIcon = statusConfig.icon

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(record.date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(record.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(record.expected_amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(record.actual_amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${
                          record.variance === 0 ? 'text-green-600' :
                          record.variance > 0 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {record.variance >= 0 ? '+' : ''}{formatCurrency(record.variance)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon className={`h-3 w-3 ${statusConfig.iconColor}`} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.reconciled_by}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Reconciliation Details</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Date</div>
                  <div className="text-base font-semibold text-gray-900">
                    {new Date(selectedRecord.date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Reconciled By</div>
                  <div className="text-base font-semibold text-gray-900">{selectedRecord.reconciled_by}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-700 mb-1">Expected Amount</div>
                  <div className="text-lg font-bold text-blue-900">
                    {formatCurrency(selectedRecord.expected_amount)}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-700 mb-1">Actual Amount</div>
                  <div className="text-lg font-bold text-green-900">
                    {formatCurrency(selectedRecord.actual_amount)}
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${
                  selectedRecord.variance === 0 ? 'bg-gray-50' :
                  selectedRecord.variance > 0 ? 'bg-orange-50' :
                  'bg-red-50'
                }`}>
                  <div className={`text-sm mb-1 ${
                    selectedRecord.variance === 0 ? 'text-gray-700' :
                    selectedRecord.variance > 0 ? 'text-orange-700' :
                    'text-red-700'
                  }`}>
                    Variance
                  </div>
                  <div className={`text-lg font-bold ${
                    selectedRecord.variance === 0 ? 'text-gray-900' :
                    selectedRecord.variance > 0 ? 'text-orange-900' :
                    'text-red-900'
                  }`}>
                    {selectedRecord.variance >= 0 ? '+' : ''}{formatCurrency(selectedRecord.variance)}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Status</div>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(selectedRecord.status).color}`}>
                  {getStatusConfig(selectedRecord.status).label}
                </span>
              </div>

              {selectedRecord.notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Notes</div>
                  <p className="text-sm text-gray-600">{selectedRecord.notes}</p>
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-700">
                  Submitted on {new Date(selectedRecord.created_at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
