'use client'

import { useState, useEffect } from 'react'
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import OvertimeApproval from '../components/OvertimeApproval'

interface OvertimeRequest {
  id: string
  employee_id: string
  employee_name: string
  employee_position: string
  date: string
  clock_in: string
  clock_out: string
  regular_hours: number
  overtime_hours: number
  overtime_pay: number
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  requested_at: string
}

export default function OvertimeRequestsPage() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/overtime-requests')
      if (response.ok) {
        const { data } = await response.json()
        setRequests(data || [])
      }
    } catch (error) {
      console.error('Error loading overtime requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprovalComplete = () => {
    setSelectedRequest(null)
    loadRequests()
  }

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (!filterStatus) return true
    return req.status === filterStatus
  })

  // Calculate stats
  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    totalPay: requests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.overtime_pay, 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected'
    }
    return labels[status as keyof typeof labels] || status
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overtime Requests</h1>
        <p className="text-gray-600">Review and approve employee overtime requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <span className="text-xs text-gray-500 uppercase">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Approved</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-xs text-gray-600 mt-1">This month</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="h-6 w-6 text-red-600" />
            <span className="text-xs text-gray-500 uppercase">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          <p className="text-xs text-gray-600 mt-1">This month</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-6 w-6 text-purple-600" />
            <span className="text-xs text-gray-500 uppercase">Total Pay</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalPay)}</p>
          <p className="text-xs text-gray-600 mt-1">Approved overtime</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
          >
            <option value="">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
          <button
            onClick={loadRequests}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-500 animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Overtime Requests</h3>
            <p className="text-gray-600">There are no overtime requests to display</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.employee_name}</div>
                        <div className="text-xs text-gray-500 capitalize">{request.employee_position}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                        {new Date(request.date).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.clock_in} - {request.clock_out}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {request.regular_hours.toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-500">Regular</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-orange-600">
                        +{request.overtime_hours.toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-500">Overtime</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(request.overtime_pay)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {request.status === 'pending' ? (
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {selectedRequest && (
        <OvertimeApproval
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onComplete={handleApprovalComplete}
        />
      )}
    </div>
  )
}
