import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch all leave requests (for owner)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')
    const leaveType = searchParams.get('leaveType')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // Build query with employee details
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees!employee_id (
          id,
          full_name,
          employee_code,
          position,
          annual_leave_balance,
          sick_leave_balance
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (leaveType) {
      query = query.eq('leave_type', leaveType)
    }

    if (year) {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      query = query.gte('start_date', startDate).lte('start_date', endDate)
    }

    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`
      query = query.gte('start_date', startDate).lte('start_date', endDate)
    }

    const { data: leaveRequests, error } = await query

    if (error) {
      console.error('Error fetching leave requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from('leave_requests')
      .select('status, leave_type')

    const summary = {
      total: stats?.length || 0,
      pending: stats?.filter(s => s.status === 'pending').length || 0,
      approved: stats?.filter(s => s.status === 'approved').length || 0,
      rejected: stats?.filter(s => s.status === 'rejected').length || 0,
      cancelled: stats?.filter(s => s.status === 'cancelled').length || 0,
    }

    return NextResponse.json({
      leaveRequests: leaveRequests || [],
      summary
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PATCH - Approve or reject leave request
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      leaveRequestId,
      action, // 'approve' or 'reject'
      reviewNotes,
      reviewedBy // owner user ID
    } = body

    if (!leaveRequestId || !action || !reviewedBy) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action harus approve atau reject' },
        { status: 400 }
      )
    }

    // Get leave request details
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees!employee_id (
          id,
          full_name,
          employee_code,
          annual_leave_balance,
          sick_leave_balance,
          telegram_chat_id,
          telegram_notifications_enabled
        )
      `)
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { error: 'Pengajuan cuti tidak ditemukan' },
        { status: 404 }
      )
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Pengajuan cuti sudah ${leaveRequest.status}` },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update leave request status
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: newStatus,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      })
      .eq('id', leaveRequestId)

    if (updateError) {
      console.error('Error updating leave request:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If approved, deduct leave balance
    if (action === 'approve' && (leaveRequest.leave_type === 'annual' || leaveRequest.leave_type === 'sick')) {
      const balanceField = leaveRequest.leave_type === 'annual'
        ? 'annual_leave_balance'
        : 'sick_leave_balance'

      const currentBalance = leaveRequest.leave_type === 'annual'
        ? leaveRequest.employee.annual_leave_balance
        : leaveRequest.employee.sick_leave_balance

      const newBalance = currentBalance - leaveRequest.total_days

      await supabase
        .from('employees')
        .update({ [balanceField]: newBalance })
        .eq('id', leaveRequest.employee_id)
    }

    // Send Telegram notification if enabled
    if (leaveRequest.employee.telegram_notifications_enabled && leaveRequest.employee.telegram_chat_id) {
      try {
        const statusText = action === 'approve' ? '✅ DISETUJUI' : '❌ DITOLAK'
        const leaveTypeText = {
          annual: 'Cuti Tahunan',
          sick: 'Cuti Sakit',
          unpaid: 'Cuti Tanpa Gaji',
          emergency: 'Cuti Darurat'
        }[leaveRequest.leave_type] || leaveRequest.leave_type

        let message = `🏖️ *Status Pengajuan Cuti*\n\n`
        message += `Status: ${statusText}\n`
        message += `Jenis: ${leaveTypeText}\n`
        message += `Periode: ${new Date(leaveRequest.start_date).toLocaleDateString('id-ID')} - ${new Date(leaveRequest.end_date).toLocaleDateString('id-ID')}\n`
        message += `Durasi: ${leaveRequest.total_days} hari\n`

        if (reviewNotes) {
          message += `\nCatatan:\n${reviewNotes}`
        }

        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: leaveRequest.employee.telegram_chat_id,
            text: message,
            parse_mode: 'Markdown'
          })
        })
      } catch (telegramError) {
        console.error('Error sending Telegram notification:', telegramError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pengajuan cuti berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}`
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
