'use client'

import { useState, useEffect } from 'react'
import {
  Calendar, Clock, CheckCircle, XCircle, AlertCircle, Filter,
  Users, Umbrella, Stethoscope, FileText, Search, Eye, CheckCheck, X
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'

interface Employee {
  id: string
  full_name: string
  employee_code: string
  position: string
  annual_leave_balance: number
  sick_leave_balance: number
}

interface LeaveRequest {
  id: string
  employee_id: string
  employee: Employee
  leave_type: 'annual' | 'sick' | 'unpaid' | 'emergency'
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
}

interface Summary {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
}

export default function LeaveRequestsPage() {
  const { user } = useAuth()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all')

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchLeaveRequests()
  }, [statusFilter, leaveTypeFilter])

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (leaveTypeFilter !== 'all') {
        params.append('leaveType', leaveTypeFilter)
      }

      const response = await fetch(`/api/leave-requests?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setLeaveRequests(data.leaveRequests)
        setSummary(data.summary)
      } else {
        setError(data.error || 'Gagal memuat data')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewRequest = async () => {
    if (!selectedRequest || !modalAction || !user) return

    try {
      setProcessing(true)
      const response = await fetch('/api/leave-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveRequestId: selectedRequest.id,
          action: modalAction,
          reviewNotes,
          reviewedBy: user.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh data
        await fetchLeaveRequests()
        setShowModal(false)
        setSelectedRequest(null)
        setReviewNotes('')
        setModalAction(null)
        alert(data.message)
      } else {
        alert(data.error || 'Gagal memproses permintaan')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat memproses permintaan')
    } finally {
      setProcessing(false)
    }
  }

  const openModal = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setModalAction(action)
    setShowModal(true)
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    const text = {
      pending: 'Pending',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      cancelled: 'Dibatalkan'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {text[status as keyof typeof text] || status}
      </span>
    )
  }

  const getLeaveTypeText = (type: string) => {
    const types = {
      annual: 'Cuti Tahunan',
      sick: 'Cuti Sakit',
      unpaid: 'Tanpa Gaji',
      emergency: 'Darurat'
    }
    return types[type as keyof typeof types] || type
  }

  const getLeaveTypeIcon = (type: string) => {
    const icons = {
      annual: Umbrella,
      sick: Stethoscope,
      unpaid: FileText,
      emergency: AlertCircle
    }
    const Icon = icons[type as keyof typeof icons] || FileText
    return <Icon className="h-4 w-4" />
  }

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = request.employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          request.employee.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <p className="text-gray-600 mt-1">Kelola pengajuan cuti karyawan</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <Calendar className="h-8 w-8 text-gray-500" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{summary.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-xl border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 mb-1">Disetujui</p>
              <p className="text-2xl font-bold text-green-900">{summary.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 mb-1">Ditolak</p>
              <p className="text-2xl font-bold text-red-900">{summary.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Dibatalkan</p>
              <p className="text-2xl font-bold text-gray-900">{summary.cancelled}</p>
            </div>
            <XCircle className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="h-4 w-4 inline mr-2" />
              Cari Karyawan
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nama atau kode karyawan"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-2" />
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Umbrella className="h-4 w-4 inline mr-2" />
              Jenis Cuti
            </label>
            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            >
              <option value="all">Semua Jenis</option>
              <option value="annual">Cuti Tahunan</option>
              <option value="sick">Cuti Sakit</option>
              <option value="unpaid">Tanpa Gaji</option>
              <option value="emergency">Darurat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
            <p className="text-gray-600 mt-4">Memuat data...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600">Tidak ada pengajuan cuti</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Karyawan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jenis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Periode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durasi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal Ajuan
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{request.employee.full_name}</div>
                        <div className="text-sm text-gray-500">{request.employee.employee_code} • {request.employee.position}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-gray-700">
                        {getLeaveTypeIcon(request.leave_type)}
                        <span className="text-sm">{getLeaveTypeText(request.leave_type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {format(new Date(request.start_date), 'dd MMM yyyy', { locale: id })}
                      </div>
                      <div className="text-sm text-gray-500">
                        s/d {format(new Date(request.end_date), 'dd MMM yyyy', { locale: id })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{request.total_days} hari</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(request.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {request.status === 'pending' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openModal(request, 'approve')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Setujui"
                          >
                            <CheckCheck className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openModal(request, 'reject')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Tolak"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalAction === 'approve' ? 'Setujui' : 'Tolak'} Pengajuan Cuti
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Request Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Karyawan:</span>
                  <span className="font-medium">{selectedRequest?.employee.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Jenis Cuti:</span>
                  <span className="font-medium">{getLeaveTypeText(selectedRequest?.leave_type || 'annual')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Periode:</span>
                  <span className="font-medium">
                    {selectedRequest?.start_date && format(new Date(selectedRequest.start_date), 'dd MMM yyyy', { locale: id })} - {selectedRequest?.end_date && format(new Date(selectedRequest.end_date), 'dd MMM yyyy', { locale: id })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Durasi:</span>
                  <span className="font-medium">{selectedRequest?.total_days} hari</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600 block mb-2">Alasan:</span>
                  <p className="text-sm text-gray-900">{selectedRequest?.reason}</p>
                </div>
              </div>

              {/* Review Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan (opsional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  placeholder="Tambahkan catatan untuk karyawan..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={processing}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleReviewRequest}
                  disabled={processing}
                  className={`px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                    modalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processing ? 'Memproses...' : modalAction === 'approve' ? 'Setujui' : 'Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
