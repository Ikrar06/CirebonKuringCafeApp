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
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') // Format: YYYY-MM

    // Build query
    let query = supabase
      .from('attendances')
      .select('*')
      .eq('employee_id', id)
      .order('date', { ascending: false })

    // Filter by month if provided
    if (month) {
      const startDate = `${month}-01`
      const year = parseInt(month.split('-')[0])
      const monthNum = parseInt(month.split('-')[1])
      const lastDay = new Date(year, monthNum, 0).getDate()
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data: attendances, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data
    const transformedAttendances = attendances.map((attendance: any) => ({
      id: attendance.id,
      date: attendance.date,
      clock_in: attendance.clock_in_time,
      clock_out: attendance.clock_out_time,
      clock_in_location: attendance.clock_in_location,
      clock_out_location: attendance.clock_out_location,
      status: attendance.status,
      work_hours: parseFloat(attendance.work_hours || 0),
      overtime_hours: parseFloat(attendance.overtime_hours || 0),
      notes: attendance.notes
    }))

    return NextResponse.json({ data: transformedAttendances })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
