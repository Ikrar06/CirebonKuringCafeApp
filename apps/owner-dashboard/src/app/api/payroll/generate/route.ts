import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employee_id, month, year } = body

    if (!employee_id || !month || !year) {
      return NextResponse.json(
        { error: 'Employee ID, month, and year are required' },
        { status: 400 }
      )
    }

    // Check if payroll already exists for this period
    const { data: existing } = await supabase
      .from('payroll')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('month', month)
      .eq('year', year)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Payroll for this period already exists' },
        { status: 400 }
      )
    }

    // Get employee data
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employee_id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Calculate period dates
    const periodStart = new Date(parseInt(year), parseInt(month) - 1, 1)
    const periodEnd = new Date(parseInt(year), parseInt(month), 0)
    const totalDays = periodEnd.getDate()

    // Get attendance data for the period
    const { data: attendances } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee_id)
      .gte('date', periodStart.toISOString().split('T')[0])
      .lte('date', periodEnd.toISOString().split('T')[0])

    // Calculate attendance stats
    const presentDays = attendances?.length || 0
    const totalWorkHours = attendances?.reduce((sum, att) => sum + (att.work_hours || 0), 0) || 0
    const overtimeHours = attendances?.reduce((sum, att) => {
      const regularHours = 8
      const workHours = att.work_hours || 0
      return sum + Math.max(0, workHours - regularHours)
    }, 0) || 0

    // Calculate salary components
    const basicSalary = parseFloat(employee.salary_amount) || 0
    const overtimeRate = employee.overtime_rate || 1.5
    const hourlyRate = employee.salary_type === 'hourly'
      ? basicSalary
      : employee.salary_type === 'daily'
      ? basicSalary / 8
      : basicSalary / (totalDays * 8)

    const overtimePay = overtimeHours * hourlyRate * overtimeRate

    // Calculate deductions for absent days
    const absentDays = totalDays - presentDays
    const dailyRate = employee.salary_type === 'daily'
      ? basicSalary
      : basicSalary / totalDays
    const absenceDeduction = absentDays * dailyRate

    // Calculate gross and net salary
    const grossSalary = basicSalary + overtimePay
    const totalDeductions = absenceDeduction
    const netSalary = grossSalary - totalDeductions

    // Create payroll record
    const { data: payroll, error: payrollError } = await supabase
      .from('payroll')
      .insert({
        employee_id,
        month: month.toString(),
        year: year.toString(),
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        total_days: totalDays,
        present_days: presentDays,
        absent_days: absentDays,
        regular_hours: totalWorkHours - overtimeHours,
        overtime_hours: overtimeHours,
        basic_salary: basicSalary,
        overtime_pay: overtimePay,
        gross_salary: grossSalary,
        absence_deduction: absenceDeduction,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        payment_method: 'transfer',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (payrollError) {
      console.error('Error creating payroll:', payrollError)
      return NextResponse.json({ error: payrollError.message }, { status: 500 })
    }

    return NextResponse.json({ payroll }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
