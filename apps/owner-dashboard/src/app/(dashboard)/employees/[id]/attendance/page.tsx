'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Download,
  RefreshCw,
  User
} from 'lucide-react'

interface AttendanceRecord {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  clock_in_location?: string
  clock_out_location?: string
  status: 'present' | 'late' | 'absent' | 'on_leave'
  work_hours: number
  overtime_hours: number
  notes?: string
}

interface Employee {
  id: string
  full_name: string
  position: string
  employee_code: string
}

export default function EmployeeAttendancePage() {
  const params = useParams()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // Current month YYYY-MM
  )

  useEffect(() => {
    loadEmployee()
    loadAttendance()
  }, [employeeId, filterMonth])

  const loadEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const { data } = await response.json()
        setEmployee(data)
      }
    } catch (error) {
      console.error('Error loading employee:', error)
    }
  }

  const loadAttendance = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/employees/${employeeId}/attendance?month=${filterMonth}`
      )
      if (response.ok) {
        const { data } = await response.json()
        setAttendance(data || [])
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter attendance
  const filteredAttendance = attendance.filter(record => {
    if (!filterStatus) return true
    return record.status === filterStatus
  })

  // Calculate stats
  const stats = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'present' || a.status === 'late').length,
    late: attendance.filter(a => a.status === 'late').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    onLeave: attendance.filter(a => a.status === 'on_leave').length,
    totalHours: attendance.reduce((sum, a) => sum + a.work_hours, 0),
    overtimeHours: attendance.reduce((sum, a) => sum + a.overtime_hours, 0)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800',
      late: 'bg-yellow-100 text-yellow-800',
      absent: 'bg-red-100 text-red-800',
      on_leave: 'bg-blue-100 text-blue-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4" />
      case 'late':
        return <AlertTriangle className="h-4 w-4" />
      case 'absent':
        return <XCircle className="h-4 w-4" />
      case 'on_leave':
        return <Calendar className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      present: 'Present',
      late: 'Late',
      absent: 'Absent',
      on_leave: 'On Leave'
    }
    return labels[status as keyof typeof labels] || status
  }

  const handleExport = () => {
    // Export attendance data to CSV
    const headers = ['Date', 'Clock In', 'Clock Out', 'Status', 'Work Hours', 'Overtime Hours', 'Notes']
    const rows = filteredAttendance.map(record => [
      record.date,
      record.clock_in || '-',
      record.clock_out || '-',
      getStatusLabel(record.status),
      record.work_hours.toFixed(2),
      record.overtime_hours.toFixed(2),
      record.notes || '-'
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${employee?.full_name}_${filterMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!employee) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/employees"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance History</h1>
            <p className="text-gray-600 flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{employee.full_name}</span>
              <span className="text-gray-400">•</span>
              <span className="capitalize">{employee.position}</span>
              <span className="text-gray-400">•</span>
              <span className="text-sm">{employee.employee_code}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Total Days</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Present</p>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Late</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Absent</p>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">On Leave</p>
          <p className="text-2xl font-bold text-blue-600">{stats.onLeave}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Work Hours</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(0)}h</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Overtime</p>
          <p className="text-2xl font-bold text-orange-600">{stats.overtimeHours.toFixed(0)}h</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-4 flex-1">
            <Filter className="h-5 w-5 text-gray-400" />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="present">Present Only</option>
              <option value="late">Late Only</option>
              <option value="absent">Absent Only</option>
              <option value="on_leave">On Leave Only</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadAttendance}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Records</h3>
            <p className="text-gray-600">No attendance records found for the selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        {record.clock_in || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        {record.clock_out || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.clock_in_location ? (
                        <div className="text-xs text-gray-600 flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="truncate max-w-[150px]" title={record.clock_in_location}>
                            {record.clock_in_location}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {record.work_hours.toFixed(1)}h
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.overtime_hours > 0 ? (
                        <div className="text-sm font-medium text-orange-600">
                          +{record.overtime_hours.toFixed(1)}h
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {getStatusIcon(record.status)}
                        <span>{getStatusLabel(record.status)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
