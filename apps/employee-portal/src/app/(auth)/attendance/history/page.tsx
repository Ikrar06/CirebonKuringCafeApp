'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  status: string
  late_minutes: number
  regular_hours: number
  overtime_hours: number
  overtime_approved: boolean
  early_leave_minutes: number
  scheduled_in: string
  scheduled_out: string
  shift_type: string
  clock_in_distance: number
  clock_out_distance: number | null
}

interface Stats {
  totalDays: number
  onTime: number
  late: number
  totalLateMinutes: number
  totalRegularHours: number
  totalOvertimeHours: number
  earlyLeaves: number
}

export default function AttendanceHistoryPage() {
  useAuth()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<Stats>({
    totalDays: 0,
    onTime: 0,
    late: 0,
    totalLateMinutes: 0,
    totalRegularHours: 0,
    totalOvertimeHours: 0,
    earlyLeaves: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchAttendanceHistory()
  }, [selectedMonth, selectedYear])

  const fetchAttendanceHistory = async () => {
    try {
      setIsLoading(true)
      setError('')

      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        setError('Token tidak ditemukan. Silakan login ulang.')
        return
      }

      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString()
      })

      const response = await fetch(`/api/attendance/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setAttendanceRecords(data.attendanceRecords || [])
        setStats(data.stats || {
          totalDays: 0,
          onTime: 0,
          late: 0,
          totalLateMinutes: 0,
          totalRegularHours: 0,
          totalOvertimeHours: 0,
          earlyLeaves: 0
        })
      } else {
        setError(data.error || 'Gagal mengambil data riwayat absensi')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat mengambil data')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      present: 'bg-green-100 text-green-800',
      on_time: 'bg-green-100 text-green-800',
      late: 'bg-red-100 text-red-800',
      absent: 'bg-gray-100 text-gray-800',
      leave: 'bg-blue-100 text-blue-800'
    }

    const labels = {
      present: 'Hadir',
      on_time: 'Tepat Waktu',
      late: 'Terlambat',
      absent: 'Tidak Hadir',
      leave: 'Cuti'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const monthName = format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: id })

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Memuat data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Absensi</h1>
          <p className="text-gray-600 mt-1">Lihat riwayat kehadiran Anda</p>
        </div>

        {/* Month Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>

            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Hadir</p>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDays}</p>
            <p className="text-xs text-gray-500 mt-1">Hari kerja</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Tepat Waktu</p>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.onTime}</p>
            <p className="text-xs text-gray-500 mt-1">Hari</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Terlambat</p>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.totalLateMinutes} menit total</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Lembur</p>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOvertimeHours.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Jam</p>
          </div>
        </div>

        {/* Attendance Records List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Detail Absensi</h2>
          </div>

          {attendanceRecords.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Belum ada data absensi</p>
              <p className="text-gray-500 text-sm mt-1">
                Data absensi untuk bulan ini akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {attendanceRecords.map((record) => (
                <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <p className="font-medium text-gray-900">
                          {format(new Date(record.date), 'EEEE, d MMMM yyyy', { locale: id })}
                        </p>
                        {getStatusBadge(record.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Clock In</p>
                          <p className="font-medium text-gray-900">
                            {record.clock_in ? format(new Date(record.clock_in), 'HH:mm') : '-'}
                            {record.scheduled_in && (
                              <span className="text-gray-500 text-xs ml-1">
                                (jadwal: {record.scheduled_in})
                              </span>
                            )}
                          </p>
                          {record.late_minutes > 0 && (
                            <p className="text-xs text-red-600">
                              Terlambat {record.late_minutes} menit
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-gray-600">Clock Out</p>
                          <p className="font-medium text-gray-900">
                            {record.clock_out ? format(new Date(record.clock_out), 'HH:mm') : '-'}
                            {record.scheduled_out && (
                              <span className="text-gray-500 text-xs ml-1">
                                (jadwal: {record.scheduled_out})
                              </span>
                            )}
                          </p>
                          {record.early_leave_minutes > 0 && (
                            <p className="text-xs text-orange-600">
                              Pulang {record.early_leave_minutes} menit lebih awal
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-gray-600">Jam Kerja</p>
                          <p className="font-medium text-gray-900">
                            {record.regular_hours.toFixed(1)} jam
                          </p>
                          {record.overtime_hours > 0 && (
                            <p className={`text-xs ${record.overtime_approved ? 'text-green-600' : 'text-orange-600'}`}>
                              + {record.overtime_hours.toFixed(1)} jam lembur
                              {record.overtime_approved ? ' (disetujui)' : ' (pending)'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Ringkasan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-blue-800">
            <div>
              <p className="text-blue-700">Total Jam Kerja</p>
              <p className="font-semibold">{stats.totalRegularHours.toFixed(1)} jam</p>
            </div>
            <div>
              <p className="text-blue-700">Total Lembur</p>
              <p className="font-semibold">{stats.totalOvertimeHours.toFixed(1)} jam</p>
            </div>
            <div>
              <p className="text-blue-700">Tingkat Ketepatan</p>
              <p className="font-semibold">
                {stats.totalDays > 0 ? Math.round((stats.onTime / stats.totalDays) * 100) : 0}%
              </p>
            </div>
            <div>
              <p className="text-blue-700">Pulang Awal</p>
              <p className="font-semibold">{stats.earlyLeaves} kali</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
