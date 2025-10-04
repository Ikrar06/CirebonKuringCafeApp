import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendEmployeeNotification,
  sendAnnouncement
} from '@/lib/telegram/bot'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employee_ids, title, message, emoji, urgent, type } = body

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return NextResponse.json(
        { error: 'No employees selected' },
        { status: 400 }
      )
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    // Get employees data
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, full_name, telegram_chat_id, telegram_notifications_enabled')
      .in('id', employee_ids)

    if (fetchError) {
      console.error('Error fetching employees:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Filter employees with active Telegram
    const eligibleEmployees = (employees || []).filter(
      emp => emp.telegram_chat_id && emp.telegram_notifications_enabled
    )

    if (eligibleEmployees.length === 0) {
      return NextResponse.json(
        { error: 'No employees with active Telegram found' },
        { status: 400 }
      )
    }

    // Send notifications
    const results = await Promise.allSettled(
      eligibleEmployees.map(async (employee) => {
        // Use announcement template if type is announcement and urgent is set
        if (type === 'announcement' || urgent) {
          return sendAnnouncement(
            employee.telegram_chat_id,
            title,
            message,
            undefined,
            urgent
          )
        } else {
          // Use custom notification
          return sendEmployeeNotification(
            employee.telegram_chat_id,
            employee.full_name,
            title,
            message,
            emoji
          )
        }
      })
    )

    const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length
    const failed = results.length - success

    // Log notification history (optional - you can create a notifications table)
    try {
      await supabase.from('notification_logs').insert({
        title,
        message,
        type,
        urgent,
        recipients_count: eligibleEmployees.length,
        success_count: success,
        failed_count: failed,
        created_at: new Date().toISOString()
      })
    } catch (logError) {
      // Don't fail if logging fails
      console.error('Error logging notification:', logError)
    }

    return NextResponse.json({
      success,
      failed,
      total: results.length,
      message: `Sent to ${success}/${results.length} employees`
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
