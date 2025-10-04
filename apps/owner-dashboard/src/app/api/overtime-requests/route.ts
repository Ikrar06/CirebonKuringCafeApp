import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const month = searchParams.get('month') // Format: YYYY-MM

    let query = supabase
      .from('attendances')
      .select(`
        *,
        employees!attendances_employee_id_fkey (
          full_name,
          position
        )
      `)
      .gt('overtime_hours', 2) // Only overtime > 2 hours needs approval
      .order('date', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('overtime_status', status)
    }

    // Filter by month if provided
    if (month) {
      const startDate = `${month}-01`
      const endDate = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0)
        .toISOString()
        .split('T')[0]
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data: attendances, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data for overtime requests
    const overtimeRequests = attendances.map((attendance: any) => ({
      id: attendance.id,
      employee_id: attendance.employee_id,
      employee_name: attendance.employees?.full_name || 'Unknown',
      employee_position: attendance.employees?.position || 'Unknown',
      date: attendance.date,
      clock_in: attendance.clock_in_time,
      clock_out: attendance.clock_out_time,
      regular_hours: attendance.work_hours,
      overtime_hours: attendance.overtime_hours,
      overtime_pay: parseFloat(attendance.overtime_pay || 0),
      status: attendance.overtime_status || 'pending',
      reason: attendance.overtime_reason,
      requested_at: attendance.created_at
    }))

    return NextResponse.json({ data: overtimeRequests })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
