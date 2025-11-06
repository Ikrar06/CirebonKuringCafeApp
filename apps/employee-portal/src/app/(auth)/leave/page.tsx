'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Filter,
  Umbrella,
  Stethoscope,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'

interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: 'annual' | 'sick' | 'unpaid' | 'emergency'
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string | null
}

interface LeaveBalance {
  annual: number
  sick: number
}

export default function LeavePage() {
  const { employee } = useAuth()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([])
  const [balance, setBalance] = useState<LeaveBalance>({ annual: 0, sick: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')

  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: ''
  })

  useEffect(() => {
    fetchLeaveRequests()
  }, [])

  useEffect(() => {
    filterRequests()
  }, [leaveRequests, selectedStatus, selectedType, selectedYear])

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem('employee_auth_token')

      if (!token) {
        setError('Token tidak ditemukan. Silakan login ulang.')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/leave', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setLeaveRequests(data.leaveRequests || [])
        setBalance(data.balance || { annual: 0, sick: 0 })
      } else {
        setError(data.error || 'Gagal mengambil data cuti')
      }
    } catch (err) {
      console.error('Error fetching leave requests:', err)
      setError('Terjadi kesalahan saat mengambil data')
    } finally {
      setIsLoading(false)
    }
  }

  const filterRequests = () => {
    let filtered = [...leaveRequests]

    if (selectedStatus) {
      filtered = filtered.filter(r => r.status === selectedStatus)
    }

    if (selectedType) {
      filtered = filtered.filter(r => r.leave_type === selectedType)
    }

    if (selectedYear) {
      filtered = filtered.filter(r => {
        const year = new Date(r.start_date).getFullYear()
        return year.toString() === selectedYear
      })
    }

    setFilteredRequests(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('employee_auth_token')

      if (!token) {
        setError('Token tidak ditemukan. Silakan login ulang.')
        return
      }

      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setFormData({
          leave_type: 'annual',
          start_date: '',
          end_date: '',
          reason: ''
        })
        setShowForm(false)
        await fetchLeaveRequests()
        toast.success('Pengajuan cuti berhasil dikirim!', {
          description: 'Menunggu persetujuan dari atasan'
        })
      } else {
        setError(data.error || 'Gagal mengajukan cuti')
      }
    } catch (err) {
      console.error('Error submitting leave request:', err)
      setError('Terjadi kesalahan saat mengajukan cuti')
    } finally {
      setFormLoading(false)
    }
  }

  const calculateDuration = () => {
    if (!formData.start_date || !formData.end_date) return 0

    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)

    if (end < start) return 0

    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }

    const labels = {
      pending: 'Menunggu',
      approved: 'Disetujui',
      rejected: 'Ditolak'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles] || ''}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'annual':
        return <Umbrella className="h-5 w-5 text-blue-500" />
      case 'sick':
        return <Stethoscope className="h-5 w-5 text-red-500" />
      case 'emergency':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'unpaid':
        return <Clock className="h-5 w-5 text-gray-500" />
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      annual: 'Cuti Tahunan',
      sick: 'Cuti Sakit',
      emergency: 'Cuti Darurat',
      unpaid: 'Cuti Tanpa Gaji'
    }
    return labels[type as keyof typeof labels] || type
  }

  const years = Array.from(new Set(
    leaveRequests.map(r => new Date(r.start_date).getFullYear())
  )).sort((a, b) => b - a)

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Cuti</h1>
            <p className="text-gray-600 mt-1">Kelola pengajuan cuti Anda</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Ajukan Cuti
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Terjadi Kesalahan</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Saldo Cuti Tahunan</p>
                <p className="text-4xl font-bold mt-2">{balance.annual}</p>
                <p className="text-blue-100 text-sm mt-1">Hari tersisa</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 p-4 rounded-full">
                <Umbrella className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Saldo Cuti Sakit</p>
                <p className="text-4xl font-bold mt-2">{balance.sick}</p>
                <p className="text-red-100 text-sm mt-1">Hari tersisa</p>
              </div>
              <div className="bg-red-400 bg-opacity-30 p-4 rounded-full">
                <Stethoscope className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Form Pengajuan Cuti</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Cuti</label>
                  <select
                    value={formData.leave_type}
                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="annual">Cuti Tahunan</option>
                    <option value="sick">Cuti Sakit</option>
                    <option value="emergency">Cuti Darurat</option>
                    <option value="unpaid">Cuti Tanpa Gaji</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durasi</label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <span className="font-semibold text-gray-900">{calculateDuration()}</span> hari
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alasan Cuti</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  placeholder="Jelaskan alasan pengajuan cuti..."
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Untuk cuti sakit lebih dari 2 hari, harap lampirkan surat keterangan dokter setelah disetujui
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {formLoading ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Filter</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                <option value="">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Cuti</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                <option value="">Semua Jenis</option>
                <option value="annual">Cuti Tahunan</option>
                <option value="sick">Cuti Sakit</option>
                <option value="emergency">Cuti Darurat</option>
                <option value="unpaid">Cuti Tanpa Gaji</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tahun</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                <option value="">Semua Tahun</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Menampilkan <span className="font-semibold">{filteredRequests.length}</span> dari{' '}
            <span className="font-semibold">{leaveRequests.length}</span> pengajuan cuti
          </div>
        </div>

        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Belum ada pengajuan cuti</p>
              <p className="text-gray-500 text-sm mt-1">
                Klik tombol "Ajukan Cuti" untuk membuat pengajuan baru
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getTypeIcon(request.leave_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {getTypeLabel(request.leave_type)}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(request.start_date), 'd MMM yyyy', { locale: id })}
                            {' '}-{' '}
                            {format(new Date(request.end_date), 'd MMM yyyy', { locale: id })}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="font-medium">{request.total_days} hari</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>{request.reason}</span>
                        </div>

                        {request.admin_notes && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-700 mb-1">Catatan Admin:</p>
                            <p className="text-sm">{request.admin_notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        Diajukan {format(new Date(request.created_at), 'd MMM yyyy HH:mm', { locale: id })}
                        {request.reviewed_at && (
                          <> • Diproses {format(new Date(request.reviewed_at), 'd MMM yyyy HH:mm', { locale: id })}</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
