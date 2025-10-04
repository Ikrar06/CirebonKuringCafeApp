import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAttendanceReminder } from '@/lib/telegram/bot'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Send attendance reminder to all employees who haven't checked in yet
 * This endpoint should be called by a cron job (e.g., Vercel Cron or external scheduler)
 * Recommended: Run at 08:30 AM daily
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Get all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, telegram_chat_id, telegram_notifications_enabled')
      .eq('employment_status', 'active')

    if (empError) {
      console.error('Error fetching employees:', empError)
      return NextResponse.json({ error: empError.message }, { status: 500 })
    }

    // Get today's attendance records
    const { data: attendances } = await supabase
      .from('attendance')
      .select('employee_id')
      .eq('date', today)

    const checkedInIds = new Set(attendances?.map(a => a.employee_id) || [])

    // Filter employees who haven't checked in
    const notCheckedIn = employees?.filter(
      emp => !checkedInIds.has(emp.id) &&
             emp.telegram_chat_id &&
             emp.telegram_notifications_enabled
    ) || []

    // Send reminders
    const results = await Promise.allSettled(
      notCheckedIn.map(async (employee) => {
        return sendAttendanceReminder(
          employee.telegram_chat_id!,
          employee.full_name
        )
      })
    )

    const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length
    const failed = results.length - success

    return NextResponse.json({
      success,
      failed,
      total: results.length,
      message: `Reminders sent to ${success}/${results.length} employees`
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
