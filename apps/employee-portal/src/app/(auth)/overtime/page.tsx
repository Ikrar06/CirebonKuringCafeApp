'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Clock, Plus, Filter, AlertCircle, CheckCircle, XCircle,
  Calendar, Loader2, X as XIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'

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
  updated_at: string | null
}

export default function OvertimePage() {
  const { employee } = useAuth()
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    reason: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Filter
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (employee) {
      fetchOvertimeRequests()
    }
  }, [employee, statusFilter])

  const fetchOvertimeRequests = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        setError('Token tidak ditemukan')
        return
      }

      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/overtime?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setOvertimeRequests(data.overtimeRequests)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    try {
      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        setFormError('Token tidak ditemukan')
        return
      }

      const response = await fetch('/api/overtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Pengajuan lembur berhasil!', {
          description: data.message || 'Menunggu persetujuan atasan'
        })
        setShowForm(false)
        setFormData({
          date: '',
          start_time: '',
          end_time: '',
          reason: ''
        })
        fetchOvertimeRequests()
      } else {
        setFormError(data.error || 'Gagal mengajukan lembur')
      }
    } catch (err) {
      setFormError('Terjadi kesalahan saat mengajukan lembur')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (requestId: string) => {
    toast('Yakin ingin membatalkan pengajuan lembur ini?', {
      action: {
        label: 'Batalkan',
        onClick: async () => {
          try {
            const token = localStorage.getItem('employee_auth_token')
            if (!token) {
              toast.error('Token tidak ditemukan')
              return
            }

            const response = await fetch('/api/overtime', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ overtimeRequestId: requestId })
            })

            const data = await response.json()

            if (response.ok) {
              toast.success('Pengajuan lembur berhasil dibatalkan')
              fetchOvertimeRequests()
            } else {
              toast.error(data.error || 'Gagal membatalkan pengajuan')
            }
          } catch (err) {
            toast.error('Terjadi kesalahan saat membatalkan pengajuan')
          }
        },
      },
      cancel: {
        label: 'Tidak',
        onClick: () => {},
      },
    })
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
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      cancelled: XCircle
    }
    const Icon = icons[status as keyof typeof icons]
    return (
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4" />
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges]}`}>
          {text[status as keyof typeof text] || status}
        </span>
      </div>
    )
  }

  if (!employee) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lembur</h1>
            <p className="text-gray-600 mt-1">Kelola pengajuan lembur Anda</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            {showForm ? (
              <>
                <XIcon className="h-5 w-5" />
                <span>Batal</span>
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span>Ajukan Lembur</span>
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ajukan Lembur Baru</h2>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waktu Mulai
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waktu Selesai
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alasan Lembur
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  placeholder="Jelaskan alasan lembur..."
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormError('')
                    setFormData({
                      date: '',
                      start_time: '',
                      end_time: '',
                      reason: ''
                    })
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span>Ajukan Lembur</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-700">
              <Filter className="h-5 w-5" />
              <span className="font-medium">Filter:</span>
            </div>
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

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : overtimeRequests.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada pengajuan lembur</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {overtimeRequests.map((request) => (
                <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {getStatusBadge(request.status)}
                        <span className="text-sm text-gray-500">
                          Diajukan {format(new Date(request.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Tanggal</p>
                          <p className="font-medium text-gray-900">
                            {format(new Date(request.date), 'dd MMMM yyyy', { locale: id })}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Waktu</p>
                          <p className="font-medium text-gray-900">
                            {request.start_time} - {request.end_time}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Durasi</p>
                          <p className="font-medium text-gray-900">{request.hours} jam</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-1">Alasan:</p>
                        <p className="text-sm text-gray-900">{request.reason}</p>
                      </div>

                      {request.review_notes && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-600 mb-1">Catatan Review:</p>
                          <p className="text-sm text-gray-900">{request.review_notes}</p>
                          {request.reviewed_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Direview {format(new Date(request.reviewed_at), 'dd MMM yyyy HH:mm', { locale: id })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(request.id)}
                        className="ml-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
