import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Fetch payroll records for this employee
    const { data: payrollRecords, error } = await supabase
      .from('payrolls')
      .select('*')
      .eq('employee_id', id)
      .order('month', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data
    const transformedRecords = (payrollRecords || []).map((record: any) => ({
      id: record.id,
      month: record.month,
      base_salary: parseFloat(record.base_salary || 0),
      overtime_pay: parseFloat(record.overtime_pay || 0),
      deductions: parseFloat(record.deductions || 0),
      total_pay: parseFloat(record.total_pay || 0),
      work_days: parseInt(record.work_days || 0),
      overtime_hours: parseFloat(record.overtime_hours || 0),
      status: record.status || 'pending',
      paid_at: record.paid_at,
      created_at: record.created_at
    }))

    return NextResponse.json({ data: transformedRecords })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
