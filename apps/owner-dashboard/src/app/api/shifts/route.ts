import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Import telegram bot functions if they exist
let sendBulkShiftNotifications: any
try {
  const telegramBot = require('@/lib/telegram/bot')
  sendBulkShiftNotifications = telegramBot.sendBulkShiftNotifications
} catch (error) {
  console.log('Telegram bot not configured, notifications will be disabled')
  sendBulkShiftNotifications = null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    let query = supabase
      .from('shift_schedules')
      .select(`
        *,
        employees!shift_schedules_employee_id_fkey (
          full_name,
          position
        )
      `)
      .order('shift_start', { ascending: true })

    // Filter by date if provided
    if (date) {
      query = query.eq('date', date)
    }

    const { data: shifts, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data
    const transformedShifts = (shifts || []).map((shift: any) => ({
      id: shift.id,
      employee_id: shift.employee_id,
      employee_name: shift.employees?.full_name || 'Unknown',
      employee_position: shift.employees?.position || 'Unknown',
      date: shift.date,
      shift_start: shift.shift_start,
      shift_end: shift.shift_end,
      break_duration: shift.break_duration || 30,
      shift_type: shift.shift_type || 'regular',
      is_confirmed: shift.is_confirmed || false,
      is_published: shift.is_published || false,
      notes: shift.notes,
      created_at: shift.created_at
    }))

    return NextResponse.json({ data: transformedShifts })
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
    const { shifts, send_notifications } = body

    if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
      return NextResponse.json(
        { error: 'No shifts provided' },
        { status: 400 }
      )
    }

    // Insert all shifts
    const { data: createdShifts, error } = await supabase
      .from('shift_schedules')
      .insert(
        shifts.map((shift: any) => ({
          employee_id: shift.employee_id,
          date: shift.date,
          shift_start: shift.shift_start,
          shift_end: shift.shift_end,
          break_duration: shift.break_duration || 30,
          shift_type: shift.shift_type || 'regular',
          is_confirmed: false,
          is_published: true,
          notes: shift.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      )
      .select(`
        *,
        employees!shift_schedules_employee_id_fkey (
          full_name,
          position,
          telegram_chat_id,
          telegram_notifications_enabled
        )
      `)

    if (error) {
      console.error('Error creating shifts:', error)

      // Handle unique constraint violation
      if (error.code === '23505' && error.message.includes('unique_shift_per_employee_per_day')) {
        return NextResponse.json({
          error: 'One or more employees already have a shift scheduled for this date. Please check existing shifts or delete the old shift before creating a new one.'
        }, { status: 400 })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send Telegram notifications if requested and bot is configured
    let notificationResults = null
    if (send_notifications && sendBulkShiftNotifications && createdShifts && createdShifts.length > 0) {
      try {
        const notificationsToSend = createdShifts
          .filter((shift: any) =>
            shift.employees?.telegram_chat_id &&
            shift.employees?.telegram_notifications_enabled
          )
          .map((shift: any) => ({
            chatId: shift.employees.telegram_chat_id,
            employeeName: shift.employees.full_name,
            date: shift.date,
            shiftStart: shift.shift_start,
            shiftEnd: shift.shift_end,
            position: shift.employees.position,
            breakDuration: shift.break_duration,
            notes: shift.notes
          }))

        if (notificationsToSend.length > 0) {
          notificationResults = await sendBulkShiftNotifications(notificationsToSend)
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError)
        // Don't fail the request if notifications fail
      }
    }

    return NextResponse.json({
      data: createdShifts,
      notifications: notificationResults ? {
        success: notificationResults.success,
        failed: notificationResults.failed,
        total: notificationResults.success + notificationResults.failed
      } : null
    }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
