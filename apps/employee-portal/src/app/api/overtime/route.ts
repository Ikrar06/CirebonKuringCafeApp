import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

// GET - Fetch overtime requests for employee
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
    const status = searchParams.get('status')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // Build query
    let query = supabase
      .from('overtime_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    // Apply filters if provided
    if (status) {
      query = query.eq('status', status)
    }

    if (year) {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      query = query.gte('date', startDate).lte('date', endDate)
    }

    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data: overtimeRequests, error } = await query

    if (error) {
      console.error('Error fetching overtime requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      overtimeRequests: overtimeRequests || []
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// POST - Submit new overtime request
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
      date,
      start_time,
      end_time,
      reason
    } = body

    // Validation
    if (!date || !start_time || !end_time || !reason) {
      return NextResponse.json(
        { error: 'Field wajib: date, start_time, end_time, reason' },
        { status: 400 }
      )
    }

    // Calculate hours
    const start = new Date(`${date}T${start_time}`)
    const end = new Date(`${date}T${end_time}`)

    if (end <= start) {
      return NextResponse.json(
        { error: 'Waktu selesai harus lebih besar dari waktu mulai' },
        { status: 400 }
      )
    }

    const diffMs = end.getTime() - start.getTime()
    const hours = diffMs / (1000 * 60 * 60)

    if (hours > 12) {
      return NextResponse.json(
        { error: 'Maksimal lembur 12 jam per hari' },
        { status: 400 }
      )
    }

    // Create overtime request
    const { data: overtimeRequest, error: insertError } = await supabase
      .from('overtime_requests')
      .insert({
        employee_id: employeeId,
        date,
        start_time,
        end_time,
        hours: hours.toFixed(2),
        reason,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating overtime request:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        data: overtimeRequest,
        message: 'Pengajuan lembur berhasil dikirim'
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

// PATCH - Cancel overtime request (only pending can be cancelled)
export async function PATCH(request: NextRequest) {
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
    const { overtimeRequestId } = body

    if (!overtimeRequestId) {
      return NextResponse.json(
        { error: 'overtimeRequestId wajib diisi' },
        { status: 400 }
      )
    }

    // Check if request exists and belongs to employee
    const { data: existingRequest, error: fetchError } = await supabase
      .from('overtime_requests')
      .select('*')
      .eq('id', overtimeRequestId)
      .eq('employee_id', employeeId)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'Pengajuan lembur tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Pengajuan lembur yang sudah ${existingRequest.status} tidak dapat dibatalkan` },
        { status: 400 }
      )
    }

    // Cancel the request
    const { error: updateError } = await supabase
      .from('overtime_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', overtimeRequestId)

    if (updateError) {
      console.error('Error cancelling overtime request:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Pengajuan lembur berhasil dibatalkan'
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
