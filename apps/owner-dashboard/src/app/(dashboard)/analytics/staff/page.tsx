'use client'

import { useState, useEffect } from 'react'
import { Users, TrendingUp, Clock, Calendar, Award, AlertCircle } from 'lucide-react'

type PeriodType = 'today' | 'week' | 'month' | 'year'

interface EmployeeStats {
  id: string
  name: string
  role: string
  totalShifts: number
  hoursWorked: number
  attendance: number
  performance: number
}

export default function StaffAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodType>('month')
  const [isLoading, setIsLoading] = useState(true)
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [averageAttendance, setAverageAttendance] = useState(0)
  const [totalHoursWorked, setTotalHoursWorked] = useState(0)

  useEffect(() => {
    handlePeriodChange(period)
  }, [])

  const handlePeriodChange = async (newPeriod: PeriodType) => {
    setPeriod(newPeriod)
    await loadData(newPeriod)
  }

  const getDateRange = (period: PeriodType) => {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
    }

    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    }
  }

  const loadData = async (period: PeriodType) => {
    try {
      setIsLoading(true)
      const { startDate, endDate } = getDateRange(period)

      console.log('Loading staff analytics for period:', period)
      console.log('Date range:', startDate, 'to', endDate)

      // Get employees from API (bypasses RLS)
      const response = await fetch('/api/employees')
      if (!response.ok) {
        throw new Error('Failed to fetch employees')
      }

      const { data: employeesData } = await response.json()
      const employees = (employeesData || [])
        .filter((emp: any) => emp.is_active)
        .map((emp: any) => ({
          id: emp.id,
          full_name: emp.full_name,
          position: emp.position,
          employment_status: emp.is_active ? 'active' : 'inactive'
        }))

      console.log('Found employees from API:', employees.length)
      setTotalEmployees(employees.length)

      // Fetch attendance data from API
      const attResponse = await fetch(`/api/attendance?start_date=${startDate.split('T')[0]}&end_date=${endDate.split('T')[0]}`)
      const { data: attendance = [] } = await attResponse.json()
      console.log('Found attendance records:', attendance.length)

      // Fetch shift schedules from API
      const shiftsResponse = await fetch(`/api/shift-schedules?startDate=${startDate.split('T')[0]}&endDate=${endDate.split('T')[0]}`)
      const { data: shiftsData = [] } = await shiftsResponse.json()
      const shifts = shiftsData.map((s: any) => ({
        employee_id: s.employee_id,
        shift_date: s.date,
        start_time: s.shift_start,
        end_time: s.shift_end,
        status: 'scheduled'
      }))
      console.log('Found shift schedules:', shifts.length)

      // Calculate stats for each employee
      const stats: EmployeeStats[] = (employees || []).map((emp: any) => {
        const empAttendance = attendance.filter((a: any) => a.employee_id === emp.id)
        const empShifts = shifts.filter((s: any) => s.employee_id === emp.id)

        // Calculate hours worked
        const hoursWorked = empAttendance.reduce((total: number, att: any) => {
          if (att.check_out_time) {
            const checkIn = new Date(`${att.date}T${att.check_in_time}`)
            const checkOut = new Date(`${att.date}T${att.check_out_time}`)
            const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
            return total + hours
          }
          return total
        }, 0)

        // Calculate attendance rate
        const scheduledShifts = empShifts.length
        const attendedShifts = empAttendance.filter((a: any) => a.status === 'present' || a.status === 'late').length
        const attendanceRate = scheduledShifts > 0 ? (attendedShifts / scheduledShifts) * 100 : 0

        // Simple performance score based on attendance and punctuality
        const onTimeShifts = empAttendance.filter((a: any) => {
          if (!a.check_in_time) return false
          const checkIn = new Date(`${a.date}T${a.check_in_time}`)
          const shift = empShifts.find((s: any) => {
            const shiftDate = new Date(s.shift_date + 'T' + s.start_time)
            return Math.abs(shiftDate.getTime() - checkIn.getTime()) < 3600000 // within 1 hour
          })
          return shift !== undefined && a.status === 'present'
        }).length
        const punctualityRate = attendedShifts > 0 ? (onTimeShifts / attendedShifts) * 100 : 0
        const performanceScore = (attendanceRate * 0.7 + punctualityRate * 0.3)

        return {
          id: emp.id,
          name: emp.full_name,
          role: emp.position,
          totalShifts: scheduledShifts,
          hoursWorked: Math.round(hoursWorked * 10) / 10,
          attendance: Math.round(attendanceRate * 10) / 10,
          performance: Math.round(performanceScore * 10) / 10
        }
      })

      console.log('Employee stats calculated:', stats.length)
      setEmployeeStats(stats.sort((a, b) => b.performance - a.performance))

      // Calculate averages
      const avgAttendance = stats.length > 0
        ? stats.reduce((sum, s) => sum + s.attendance, 0) / stats.length
        : 0
      const totalHours = stats.reduce((sum, s) => sum + s.hoursWorked, 0)

      setAverageAttendance(Math.round(avgAttendance * 10) / 10)
      setTotalHoursWorked(Math.round(totalHours * 10) / 10)

      console.log('Stats summary:', {
        totalEmployees: employees?.length,
        avgAttendance,
        totalHours,
        employeeStats: stats.length
      })

    } catch (error) {
      console.error('Error loading staff data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-800' }
    if (score >= 75) return { text: 'Good', color: 'bg-blue-100 text-blue-800' }
    if (score >= 60) return { text: 'Fair', color: 'bg-yellow-100 text-yellow-800' }
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800' }
  }

  return (
    <div className="p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Performance</h1>
              <p className="text-gray-600">Attendance, shifts, and performance metrics</p>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          {(['today', 'week', 'month', 'year'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 opacity-80" />
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-1">Total Active Employees</p>
            <p className="text-3xl font-bold">{isLoading ? '...' : totalEmployees}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Average Attendance</p>
            <p className="text-3xl font-bold text-gray-900">
              {isLoading ? '...' : `${averageAttendance}%`}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Hours Worked</p>
            <p className="text-3xl font-bold text-gray-900">
              {isLoading ? '...' : `${totalHoursWorked}h`}
            </p>
          </div>
        </div>
      </div>

      {/* Employee Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Employee Performance Rankings</h3>
          <p className="text-sm text-gray-600">Based on attendance and punctuality</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        ) : employeeStats.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No employee data available
          </div>
        ) : (
          <div className="space-y-3">
            {employeeStats.map((emp, index) => {
              const badge = getPerformanceBadge(emp.performance)
              return (
                <div
                  key={emp.id}
                  className={`p-4 rounded-lg border ${getPerformanceColor(emp.performance)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>

                      {/* Employee Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{emp.name}</h4>
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            {emp.role}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                            {badge.text}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Performance Score</p>
                            <p className="font-semibold text-gray-900">{emp.performance}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Attendance</p>
                            <p className="font-semibold text-gray-900">{emp.attendance}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Total Shifts</p>
                            <p className="font-semibold text-gray-900">{emp.totalShifts}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Hours Worked</p>
                            <p className="font-semibold text-gray-900">{emp.hoursWorked}h</p>
                          </div>
                        </div>
                      </div>

                      {/* Performance Indicator */}
                      {emp.performance >= 90 && (
                        <Award className="h-6 w-6 text-yellow-500" />
                      )}
                      {emp.performance < 60 && (
                        <AlertCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Performance Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!isLoading && employeeStats.length > 0 && (
            <>
              {/* Top Performer */}
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-600" />
                  Top Performer
                </h4>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{employeeStats[0]?.name}</span> leads with{' '}
                  <span className="font-semibold">{employeeStats[0]?.performance}%</span> performance score.
                </p>
              </div>

              {/* Attendance Rate */}
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Attendance Overview
                </h4>
                <p className="text-sm text-gray-600">
                  Average attendance rate is <span className="font-semibold">{averageAttendance}%</span>.
                  {averageAttendance >= 90
                    ? ' Excellent team reliability!'
                    : averageAttendance >= 75
                    ? ' Good attendance, room for improvement.'
                    : ' Consider attendance improvement initiatives.'}
                </p>
              </div>

              {/* Low Performers */}
              {employeeStats.filter(e => e.performance < 60).length > 0 && (
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Needs Attention
                  </h4>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">{employeeStats.filter(e => e.performance < 60).length} employee(s)</span> need
                    performance improvement support.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
