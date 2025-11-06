import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPayrollNotification } from '@/lib/telegram/bot'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch payroll records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const paymentStatus = searchParams.get('payment_status') // pending, paid, cancelled

    let query = supabase
      .from('payroll')
      .select(`
        *,
        employees!payroll_employee_id_fkey (
          id,
          full_name,
          position,
          salary_type,
          salary_amount
        )
      `)
      .order('created_at', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (month) {
      query = query.eq('month', month)
    }

    if (year) {
      query = query.eq('year', year)
    }

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching payroll:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Generate payroll (bulk or single employee)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employee_ids, // Array of employee IDs, or null for all employees
      month, // '1'-'12'
      year, // '2025'
      period_start,
      period_end,
      send_notifications = true
    } = body

    if (!month || !year || !period_start || !period_end) {
      return NextResponse.json(
        { error: 'Missing required fields: month, year, period_start, period_end' },
        { status: 400 }
      )
    }

    // Get employees to process
    let employeesQuery = supabase
      .from('employees')
      .select(`
        id,
        full_name,
        position,
        salary_type,
        salary_amount,
        telegram_chat_id,
        telegram_notifications_enabled
      `)
      .eq('employment_status', 'active')

    if (employee_ids && employee_ids.length > 0) {
      employeesQuery = employeesQuery.in('id', employee_ids)
    }

    const { data: employees, error: empError } = await employeesQuery

    if (empError) {
      console.error('Error fetching employees:', empError)
      return NextResponse.json({ error: empError.message }, { status: 500 })
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: 'No employees found' },
        { status: 404 }
      )
    }

    const payrollRecords = []
    const notificationResults = []

    for (const employee of employees) {
      // Calculate salary components
      const basicSalary = parseFloat(employee.salary_amount || '0')

      // Get attendance for this period
      const { data: attendances } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('date', period_start)
        .lte('date', period_end)

      const presentDays = attendances?.filter(a => a.status === 'present').length || 0
      const lateDays = attendances?.filter(a => a.status === 'late').length || 0
      const absentDays = attendances?.filter(a => a.status === 'absent').length || 0

      // Get overtime for this period
      const { data: overtimes } = await supabase
        .from('overtime_requests')
        .select('overtime_hours, overtime_pay')
        .eq('employee_id', employee.id)
        .eq('status', 'approved')
        .gte('date', period_start)
        .lte('date', period_end)

      const overtimePay = overtimes?.reduce(
        (sum, ot) => sum + parseFloat(ot.overtime_pay || '0'),
        0
      ) || 0

      const overtimeHours = overtimes?.reduce(
        (sum, ot) => sum + parseFloat(ot.overtime_hours || '0'),
        0
      ) || 0

      // Calculate deductions (example: late penalty)
      const lateDeduction = lateDays * 50000 // Rp 50k per late
      const absenceDeduction = absentDays * 200000 // Rp 200k per absent
      const totalDeductions = lateDeduction + absenceDeduction

      const grossSalary = basicSalary + overtimePay
      const netSalary = grossSalary - totalDeductions

      // Create payroll record
      const { data: payroll, error: payrollError } = await supabase
        .from('payroll')
        .insert({
          employee_id: employee.id,
          month: month.toString(),
          year: year.toString(),
          period_start,
          period_end,
          present_days: presentDays,
          absent_days: absentDays,
          late_days: lateDays,
          overtime_hours: overtimeHours,
          basic_salary: basicSalary,
          overtime_pay: overtimePay,
          gross_salary: grossSalary,
          late_deduction: lateDeduction,
          absence_deduction: absenceDeduction,
          total_deductions: totalDeductions,
          net_salary: netSalary,
          payment_status: 'pending',
          payment_method: 'transfer',
          generated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (payrollError) {
        console.error(`Error creating payroll for ${employee.full_name}:`, payrollError)
        continue
      }

      payrollRecords.push(payroll)

      // Send Telegram notification
      if (send_notifications && employee.telegram_chat_id && employee.telegram_notifications_enabled) {
        try {
          const sent = await sendPayrollNotification(
            employee.telegram_chat_id,
            employee.full_name,
            period_start,
            period_end,
            basicSalary,
            overtimePay,
            totalDeductions,
            netSalary
          )
          notificationResults.push({ employee_id: employee.id, sent })
        } catch (notifError) {
          console.error(`Error sending notification to ${employee.full_name}:`, notifError)
          notificationResults.push({ employee_id: employee.id, sent: false })
        }
      }
    }

    const notificationsSent = notificationResults.filter(r => r.sent).length

    return NextResponse.json({
      data: payrollRecords,
      total: payrollRecords.length,
      notifications_sent: notificationsSent,
      message: `Generated payroll for ${payrollRecords.length} employees`
    }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Mark payroll as paid or update status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      payroll_id,
      payment_status, // 'pending', 'paid', 'cancelled'
      payment_date,
      payment_reference
    } = body

    if (!payroll_id) {
      return NextResponse.json(
        { error: 'Missing payroll_id' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (payment_status) {
      updateData.payment_status = payment_status
    }

    if (payment_date) {
      updateData.payment_date = payment_date
    }

    if (payment_reference) {
      updateData.payment_reference = payment_reference
    }

    // If marking as paid, set payment_date if not provided
    if (payment_status === 'paid' && !payment_date) {
      updateData.payment_date = new Date().toISOString().split('T')[0]
    }

    const { data: payroll, error } = await supabase
      .from('payroll')
      .update(updateData)
      .eq('id', payroll_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating payroll:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: payroll })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete payroll record (only if pending)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payrollId = searchParams.get('id')

    if (!payrollId) {
      return NextResponse.json(
        { error: 'Missing payroll id' },
        { status: 400 }
      )
    }

    // Check if payroll exists and is pending
    const { data: payroll, error: checkError } = await supabase
      .from('payroll')
      .select('payment_status')
      .eq('id', payrollId)
      .single()

    if (checkError || !payroll) {
      return NextResponse.json(
        { error: 'Payroll not found' },
        { status: 404 }
      )
    }

    if (payroll.payment_status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only delete pending payroll records' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('payroll')
      .delete()
      .eq('id', payrollId)

    if (error) {
      console.error('Error deleting payroll:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Payroll deleted successfully' })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
