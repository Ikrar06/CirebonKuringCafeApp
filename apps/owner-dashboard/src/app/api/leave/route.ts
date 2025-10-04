import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendLeaveApprovalNotification,
  sendLeaveRejectionNotification
} from '@/lib/telegram/bot'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch leave requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected, all
    const employeeId = searchParams.get('employee_id')

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employees!leave_requests_employee_id_fkey (
          id,
          full_name,
          position,
          telegram_chat_id,
          telegram_notifications_enabled
        )
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leave requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create leave request (from employee)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employee_id,
      leave_type,
      start_date,
      end_date,
      reason,
      total_days
    } = body

    if (!employee_id || !leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create leave request
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
        total_days: total_days || 1,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating leave request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: leaveRequest }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Approve/Reject leave request (from owner)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      leave_id,
      status, // 'approved' or 'rejected'
      admin_notes
    } = body

    if (!leave_id || !status) {
      return NextResponse.json(
        { error: 'Missing leave_id or status' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Use "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // Get leave request with employee data
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employees!leave_requests_employee_id_fkey (
          id,
          full_name,
          telegram_chat_id,
          telegram_notifications_enabled,
          annual_leave_balance,
          sick_leave_balance
        )
      `)
      .eq('id', leave_id)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    // Update leave request status
    const { data: updatedLeave, error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status,
        admin_notes: admin_notes || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', leave_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating leave request:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If approved, deduct leave balance
    if (status === 'approved') {
      const totalDays = leaveRequest.total_days || 1
      const employee = leaveRequest.employees as any

      if (leaveRequest.leave_type === 'annual') {
        await supabase
          .from('employees')
          .update({
            annual_leave_balance: Math.max(0, (employee.annual_leave_balance || 0) - totalDays)
          })
          .eq('id', leaveRequest.employee_id)
      } else if (leaveRequest.leave_type === 'sick') {
        await supabase
          .from('employees')
          .update({
            sick_leave_balance: Math.max(0, (employee.sick_leave_balance || 0) - totalDays)
          })
          .eq('id', leaveRequest.employee_id)
      }
    }

    // Send Telegram notification
    const employee = leaveRequest.employees as any
    if (employee?.telegram_chat_id && employee?.telegram_notifications_enabled) {
      try {
        if (status === 'approved') {
          await sendLeaveApprovalNotification(
            employee.telegram_chat_id,
            employee.full_name,
            leaveRequest.leave_type,
            leaveRequest.start_date,
            leaveRequest.end_date,
            leaveRequest.total_days,
            admin_notes
          )
        } else {
          await sendLeaveRejectionNotification(
            employee.telegram_chat_id,
            employee.full_name,
            leaveRequest.leave_type,
            leaveRequest.start_date,
            leaveRequest.end_date,
            leaveRequest.reason,
            admin_notes
          )
        }
      } catch (notifError) {
        console.error('Error sending Telegram notification:', notifError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      data: updatedLeave,
      message: `Leave request ${status}`,
      notification_sent: !!(employee?.telegram_chat_id && employee?.telegram_notifications_enabled)
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
