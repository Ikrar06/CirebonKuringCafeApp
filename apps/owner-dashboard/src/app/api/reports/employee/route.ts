import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch employee report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    console.log('Generating employee report:', { startDate, endDate })

    // Get all active employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('employment_status', 'active')

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return NextResponse.json({ error: employeesError.message }, { status: 500 })
    }

    // Get attendance records within date range
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
      return NextResponse.json({ error: attendanceError.message }, { status: 500 })
    }

    // Get shift schedules within date range
    const { data: shifts, error: shiftsError } = await supabase
      .from('shift_schedules')
      .select('*')
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError)
    }

    // Calculate summary metrics
    const totalEmployees = employees?.length || 0
    const totalAttendance = attendance?.length || 0
    const presentCount = attendance?.filter(att => att.status === 'present' || att.status === 'late').length || 0
    const absentCount = attendance?.filter(att => att.status === 'absent').length || 0
    const lateCount = attendance?.filter(att => att.status === 'late').length || 0
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0

    // Calculate total hours worked
    const totalHoursWorked = attendance?.reduce((sum, att) => {
      if (att.check_in_time && att.check_out_time) {
        const checkIn = new Date(`2000-01-01T${att.check_in_time}`)
        const checkOut = new Date(`2000-01-01T${att.check_out_time}`)
        const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
        return sum + hours
      }
      return sum
    }, 0) || 0

    // Employee performance data
    const employeeStats = await Promise.all(
      (employees || []).map(async (emp: any) => {
        // Get user email
        const { data: user } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', emp.user_id)
          .single()

        // Count attendance for this employee
        const empAttendance = attendance?.filter(att => att.employee_id === emp.id)
        const empPresent = empAttendance?.filter(att => att.status === 'present' || att.status === 'late').length || 0
        const empLate = empAttendance?.filter(att => att.status === 'late').length || 0
        const empAbsent = empAttendance?.filter(att => att.status === 'absent').length || 0

        // Calculate hours worked
        const empHours = empAttendance?.reduce((sum, att) => {
          if (att.check_in_time && att.check_out_time) {
            const checkIn = new Date(`2000-01-01T${att.check_in_time}`)
            const checkOut = new Date(`2000-01-01T${att.check_out_time}`)
            const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
            return sum + hours
          }
          return sum
        }, 0) || 0

        const attendanceTotal = empPresent + empAbsent
        const empAttendanceRate = attendanceTotal > 0 ? (empPresent / attendanceTotal) * 100 : 0

        return {
          'Employee': user?.full_name || user?.email || '-',
          'Position': emp.position || '-',
          'Department': emp.department || '-',
          'Present': empPresent,
          'Late': empLate,
          'Absent': empAbsent,
          'Hours Worked': Math.round(empHours),
          'Attendance Rate': `${Math.round(empAttendanceRate)}%`
        }
      })
    )

    // Daily attendance trend
    const dailyAttendance = attendance?.reduce((acc: any, att) => {
      const date = att.date
      if (!acc[date]) {
        acc[date] = {
          date,
          present: 0,
          late: 0,
          absent: 0
        }
      }
      if (att.status === 'present') acc[date].present += 1
      else if (att.status === 'late') acc[date].late += 1
      else if (att.status === 'absent') acc[date].absent += 1
      return acc
    }, {})

    const dailyTrend = Object.values(dailyAttendance || {}).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return NextResponse.json({
      data: {
        summary: [
          {
            label: 'Total Employees',
            value: totalEmployees,
            bgColor: 'bg-blue-100',
            color: 'text-blue-600'
          },
          {
            label: 'Attendance Rate',
            value: `${Math.round(attendanceRate)}%`,
            bgColor: 'bg-green-100',
            color: 'text-green-600'
          },
          {
            label: 'Total Hours',
            value: Math.round(totalHoursWorked),
            bgColor: 'bg-purple-100',
            color: 'text-purple-600'
          },
          {
            label: 'Late/Absent',
            value: lateCount + absentCount,
            bgColor: 'bg-orange-100',
            color: 'text-orange-600'
          }
        ],
        table: employeeStats,
        columns: ['Employee', 'Position', 'Department', 'Present', 'Late', 'Absent', 'Hours Worked', 'Attendance Rate'],
        chart: {
          daily: dailyTrend
        },
        stats: {
          totalEmployees,
          presentCount,
          lateCount,
          absentCount,
          attendanceRate,
          totalHoursWorked
        }
      }
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
