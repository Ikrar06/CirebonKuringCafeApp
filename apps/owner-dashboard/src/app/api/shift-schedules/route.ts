import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId')

    console.log('Fetching shift schedules...', { startDate, endDate, employeeId })

    let query = supabase
      .from('shift_schedules')
      .select('*')
      .not('employee_id', 'is', null) // Only get schedules with assigned employee
      .order('date', { ascending: false })

    // Apply filters if provided
    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data: schedules, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`Found ${schedules?.length || 0} shift schedules`)

    return NextResponse.json({ data: schedules || [] })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employee_id,
      date,
      shift_start,
      shift_end,
      break_duration,
      shift_type,
      notes,
      is_published
    } = body

    // Validate required fields
    if (!date || !shift_start || !shift_end) {
      return NextResponse.json(
        { error: 'Date, shift start, and shift end are required' },
        { status: 400 }
      )
    }

    const { data: schedule, error } = await supabase
      .from('shift_schedules')
      .insert({
        employee_id,
        date,
        shift_start,
        shift_end,
        break_duration: break_duration || 60,
        shift_type: shift_type || 'regular',
        is_confirmed: false,
        is_published: is_published !== false,
        notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating shift schedule:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: schedule }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
