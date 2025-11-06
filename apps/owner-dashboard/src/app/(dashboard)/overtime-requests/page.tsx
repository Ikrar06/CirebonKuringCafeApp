'use client'

import { useState, useEffect } from 'react'
import {
  Clock,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  AlertCircle,
  User
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'

interface OvertimeRequest {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
  hours: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  employee: {
    id: string
    full_name: string
    employee_code: string
    position: string
  }
}

interface Summary {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
  totalHours: number
  approvedHours: number
}

export default function OvertimeRequestsPage() {
  const { user } = useAuth()
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<OvertimeRequest[]>([])
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    totalHours: 0,
    approvedHours: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null)
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve')
  const [reviewNotes, setReviewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchOvertimeRequests()
  }, [])

  useEffect(() => {
    filterRequests()
  }, [overtimeRequests, statusFilter, searchQuery])

  const fetchOvertimeRequests = async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      const response = await fetch(`/api/overtime-requests?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setOvertimeRequests(data.overtimeRequests)
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

  const filterRequests = () => {
    let filtered = [...overtimeRequests]

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(req =>
        req.employee.full_name.toLowerCase().includes(query) ||
        req.employee.employee_code.toLowerCase().includes(query) ||
        req.employee.position.toLowerCase().includes(query)
      )
    }

    setFilteredRequests(filtered)
  }

  const handleReviewRequest = async () => {
    if (!selectedRequest || !modalAction || !user) return

    try {
      setSubmitting(true)

      const response = await fetch('/api/overtime-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          overtimeRequestId: selectedRequest.id,
          action: modalAction,
          reviewNotes,
          reviewedBy: user.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        setShowModal(false)
        setSelectedRequest(null)
        setReviewNotes('')
        fetchOvertimeRequests()
      } else {
        alert(data.error || 'Gagal memproses pengajuan')
      }
    } catch (err) {
      alert('Terjadi kesalahan saat memproses pengajuan')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const openModal = (request: OvertimeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setModalAction(action)
    setReviewNotes('')
    setShowModal(true)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
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
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {text[status as keyof typeof text] || status}
      </span>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overtime Requests</h1>
        <p className="text-gray-600 mt-1">Kelola pengajuan lembur karyawan</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Pengajuan</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <Clock className="h-10 w-10 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
            </div>
            <Clock className="h-10 w-10 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Disetujui</p>
              <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Jam (Disetujui)</p>
              <p className="text-2xl font-bold text-blue-600">{summary.approvedHours.toFixed(1)}</p>
            </div>
            <Clock className="h-10 w-10 text-blue-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Cari nama, kode, atau posisi karyawan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Memuat data...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600">Tidak ada pengajuan lembur</p>
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
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durasi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alasan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.employee.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.employee.employee_code} " {request.employee.position}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        {format(new Date(request.date), 'dd MMM yyyy', { locale: id })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.start_time} - {request.end_time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{request.hours} jam</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 max-w-xs truncate">{request.reason}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {request.status === 'pending' ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal(request, 'approve')}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => openModal(request, 'reject')}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">
                          {request.reviewed_at && format(new Date(request.reviewed_at), 'dd MMM yyyy', { locale: id })}
                        </span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {modalAction === 'approve' ? 'Setujui' : 'Tolak'} Pengajuan Lembur
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Karyawan</p>
                <p className="font-medium text-gray-900">{selectedRequest.employee.full_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Tanggal</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(selectedRequest.date), 'dd MMMM yyyy', { locale: id })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Waktu & Durasi</p>
                <p className="font-medium text-gray-900">
                  {selectedRequest.start_time} - {selectedRequest.end_time} ({selectedRequest.hours} jam)
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Alasan</p>
                <p className="text-sm text-gray-900">{selectedRequest.reason}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  placeholder="Tambahkan catatan untuk karyawan..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedRequest(null)
                  setReviewNotes('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                onClick={handleReviewRequest}
                disabled={submitting}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2 ${
                  modalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    {modalAction === 'approve' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span>{modalAction === 'approve' ? 'Setujui' : 'Tolak'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
