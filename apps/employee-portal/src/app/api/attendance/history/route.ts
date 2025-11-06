import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
    }

    const employeeId = decoded.id

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // 1-12
    const year = searchParams.get('year') // YYYY
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query
    let query = supabase
      .from('attendance')
      .select(`
        *,
        shift:shift_schedules(shift_type, scheduled_in, scheduled_out)
      `)
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .limit(limit)

    // Filter by month and year if provided
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]
      query = query.gte('date', startDate).lte('date', endDate)
    } else if (year) {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
    }

    const { data: attendanceRecords, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate statistics
    const stats = {
      totalDays: attendanceRecords?.length || 0,
      onTime: attendanceRecords?.filter(a => a.status === 'present' || a.status === 'on_time').length || 0,
      late: attendanceRecords?.filter(a => a.status === 'late').length || 0,
      totalLateMinutes: attendanceRecords?.reduce((sum, a) => sum + (a.late_minutes || 0), 0) || 0,
      totalRegularHours: attendanceRecords?.reduce((sum, a) => sum + (a.regular_hours || 0), 0) || 0,
      totalOvertimeHours: attendanceRecords?.reduce((sum, a) => sum + (a.overtime_hours || 0), 0) || 0,
      earlyLeaves: attendanceRecords?.filter(a => a.early_leave_minutes > 0).length || 0,
    }

    return NextResponse.json({
      attendanceRecords: attendanceRecords || [],
      stats
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
