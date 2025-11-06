import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

// GET - Fetch leave requests for employee
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected, cancelled
    const type = searchParams.get('type') // annual, sick
    const year = searchParams.get('year')

    // Build query
    let query = supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    // Apply filters if provided
    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('leave_type', type)
    }

    if (year) {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      query = query.gte('start_date', startDate).lte('start_date', endDate)
    }

    const { data: leaveRequests, error } = await query

    if (error) {
      console.error('Error fetching leave requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get employee's leave balance
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('annual_leave_balance, sick_leave_balance')
      .eq('id', employeeId)
      .single()

    if (empError) {
      console.error('Error fetching employee:', empError)
      return NextResponse.json({ error: empError.message }, { status: 500 })
    }

    return NextResponse.json({
      leaveRequests: leaveRequests || [],
      balance: {
        annual: employee?.annual_leave_balance || 0,
        sick: employee?.sick_leave_balance || 0
      }
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// POST - Submit new leave request
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      leave_type, // 'annual', 'sick', 'unpaid', 'emergency'
      start_date,
      end_date,
      reason
    } = body

    // Validation
    if (!leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json(
        { error: 'Field wajib: leave_type, start_date, end_date, reason' },
        { status: 400 }
      )
    }

    if (!['annual', 'sick', 'unpaid', 'emergency'].includes(leave_type)) {
      return NextResponse.json(
        { error: 'leave_type harus annual, sick, unpaid, atau emergency' },
        { status: 400 }
      )
    }

    // Calculate total days (inclusive)
    const start = new Date(start_date)
    const end = new Date(end_date)

    if (end < start) {
      return NextResponse.json(
        { error: 'Tanggal akhir tidak boleh sebelum tanggal mulai' },
        { status: 400 }
      )
    }

    const diffTime = Math.abs(end.getTime() - start.getTime())
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include end date

    // Get employee's leave balance
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('annual_leave_balance, sick_leave_balance, full_name')
      .eq('id', employeeId)
      .single()

    if (empError || !employee) {
      return NextResponse.json(
        { error: 'Data karyawan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if employee has enough balance (only for annual and sick leave)
    if (leave_type === 'annual' || leave_type === 'sick') {
      const currentBalance = leave_type === 'annual'
        ? employee.annual_leave_balance
        : employee.sick_leave_balance

      if (currentBalance < totalDays) {
        return NextResponse.json(
          {
            error: `Saldo cuti ${leave_type === 'annual' ? 'tahunan' : 'sakit'} tidak mencukupi. Saldo: ${currentBalance} hari, Dibutuhkan: ${totalDays} hari`
          },
          { status: 400 }
        )
      }
    }

    // Create leave request
    const { data: leaveRequest, error: insertError } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        leave_type,
        start_date,
        end_date,
        total_days: totalDays,
        reason,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating leave request:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        data: leaveRequest,
        message: 'Pengajuan cuti berhasil dikirim'
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// Note: PATCH/DELETE for leave requests are handled by the owner dashboard
// Employees can only view and create leave requests
// Status updates (approve/reject) are done by owners only
