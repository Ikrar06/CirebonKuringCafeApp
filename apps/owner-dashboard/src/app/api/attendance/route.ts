import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendCheckInConfirmation,
  sendLateCheckInWarning
} from '@/lib/telegram/bot'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch attendance records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('Fetching attendance...', { employeeId, date, startDate, endDate })

    let query = supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (date) {
      query = query.eq('date', date)
    }

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Found ${data?.length || 0} attendance records`)
    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Check-in (with auto notification)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employee_id,
      date,
      check_in_time,
      location,
      notes
    } = body

    if (!employee_id || !date || !check_in_time) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, date, check_in_time' },
        { status: 400 }
      )
    }

    // Get employee data
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, position, telegram_chat_id, telegram_notifications_enabled')
      .eq('id', employee_id)
      .single()

    if (empError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if already checked in today
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('date', date)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Already checked in today' },
        { status: 400 }
      )
    }

    // Get expected shift time (if exists)
    const { data: shift } = await supabase
      .from('shift_schedules')
      .select('shift_start')
      .eq('employee_id', employee_id)
      .eq('date', date)
      .single()

    const expectedTime = shift?.shift_start || '08:00:00'
    const checkInDateTime = new Date(`${date}T${check_in_time}`)
    const expectedDateTime = new Date(`${date}T${expectedTime}`)
    const isLate = checkInDateTime > expectedDateTime

    // Create attendance record
    const { data: attendance, error } = await supabase
      .from('attendance')
      .insert({
        employee_id,
        date,
        check_in_time,
        location: location || null,
        notes: notes || null,
        status: isLate ? 'late' : 'present',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send Telegram notification
    let notificationSent = false
    if (employee.telegram_chat_id && employee.telegram_notifications_enabled) {
      try {
        if (isLate) {
          const minutesLate = Math.floor((checkInDateTime.getTime() - expectedDateTime.getTime()) / 60000)
          await sendLateCheckInWarning(
            employee.telegram_chat_id,
            employee.full_name,
            date,
            check_in_time,
            expectedTime,
            minutesLate
          )
        } else {
          await sendCheckInConfirmation(
            employee.telegram_chat_id,
            employee.full_name,
            date,
            check_in_time,
            location
          )
        }
        notificationSent = true
      } catch (notifError) {
        console.error('Error sending notification:', notifError)
      }
    }

    return NextResponse.json({
      data: attendance,
      notification_sent: notificationSent,
      is_late: isLate
    }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Check-out
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      attendance_id,
      check_out_time,
      notes
    } = body

    if (!attendance_id || !check_out_time) {
      return NextResponse.json(
        { error: 'Missing attendance_id or check_out_time' },
        { status: 400 }
      )
    }

    // Update attendance with check-out time
    const { data: attendance, error } = await supabase
      .from('attendance')
      .update({
        check_out_time,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', attendance_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: attendance })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
