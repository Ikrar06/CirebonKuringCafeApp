import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendOvertimeApprovalNotification,
  sendOvertimeRejectionNotification
} from '@/lib/telegram/bot'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, admin_notes, send_notification } = body

    // Get attendance record with employee info
    const { data: attendance, error: fetchError } = await supabase
      .from('attendances')
      .select(`
        *,
        employees!attendances_employee_id_fkey (
          full_name,
          telegram_chat_id,
          telegram_notifications_enabled
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !attendance) {
      return NextResponse.json({ error: 'Overtime request not found' }, { status: 404 })
    }

    // Update overtime status
    const { data: updated, error: updateError } = await supabase
      .from('attendances')
      .update({
        overtime_status: status,
        overtime_admin_notes: admin_notes,
        overtime_approved_at: status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating overtime request:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send Telegram notification if enabled
    if (
      send_notification &&
      attendance.employees?.telegram_chat_id &&
      attendance.employees?.telegram_notifications_enabled
    ) {
      try {
        if (status === 'approved') {
          await sendOvertimeApprovalNotification(
            attendance.employees.telegram_chat_id,
            attendance.employees.full_name,
            attendance.date,
            attendance.overtime_hours,
            parseFloat(attendance.overtime_pay || 0),
            admin_notes
          )
        } else if (status === 'rejected') {
          await sendOvertimeRejectionNotification(
            attendance.employees.telegram_chat_id,
            attendance.employees.full_name,
            attendance.date,
            attendance.overtime_hours,
            admin_notes || 'No reason provided'
          )
        }
      } catch (notificationError) {
        console.error('Error sending Telegram notification:', notificationError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ data: updated })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
