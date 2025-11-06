import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch all overtime requests (for owner)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // Build query with employee details
    let query = supabase
      .from('overtime_requests')
      .select(`
        *,
        employee:employees!employee_id (
          id,
          full_name,
          employee_code,
          position,
          telegram_chat_id,
          telegram_notifications_enabled
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

    // Get summary statistics
    const { data: stats } = await supabase
      .from('overtime_requests')
      .select('status, hours')

    const summary = {
      total: stats?.length || 0,
      pending: stats?.filter(s => s.status === 'pending').length || 0,
      approved: stats?.filter(s => s.status === 'approved').length || 0,
      rejected: stats?.filter(s => s.status === 'rejected').length || 0,
      cancelled: stats?.filter(s => s.status === 'cancelled').length || 0,
      totalHours: stats?.reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0) || 0,
      approvedHours: stats?.filter(s => s.status === 'approved').reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0) || 0,
    }

    return NextResponse.json({
      overtimeRequests: overtimeRequests || [],
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

// PATCH - Approve or reject overtime request
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      overtimeRequestId,
      action, // 'approve' or 'reject'
      reviewNotes,
      reviewedBy // owner user ID
    } = body

    if (!overtimeRequestId || !action || !reviewedBy) {
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

    // Get overtime request details
    const { data: overtimeRequest, error: fetchError } = await supabase
      .from('overtime_requests')
      .select(`
        *,
        employee:employees!employee_id (
          id,
          full_name,
          employee_code,
          telegram_chat_id,
          telegram_notifications_enabled
        )
      `)
      .eq('id', overtimeRequestId)
      .single()

    if (fetchError || !overtimeRequest) {
      return NextResponse.json(
        { error: 'Pengajuan lembur tidak ditemukan' },
        { status: 404 }
      )
    }

    if (overtimeRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Pengajuan lembur sudah ${overtimeRequest.status}` },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update overtime request status
    const { error: updateError } = await supabase
      .from('overtime_requests')
      .update({
        status: newStatus,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      })
      .eq('id', overtimeRequestId)

    if (updateError) {
      console.error('Error updating overtime request:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send Telegram notification if enabled
    if (overtimeRequest.employee.telegram_notifications_enabled && overtimeRequest.employee.telegram_chat_id) {
      try {
        const statusText = action === 'approve' ? '✅ DISETUJUI' : '❌ DITOLAK'

        let message = `⏰ *Status Pengajuan Lembur*\\n\\n`
        message += `Status: ${statusText}\\n`
        message += `Tanggal: ${new Date(overtimeRequest.date).toLocaleDateString('id-ID')}\\n`
        message += `Waktu: ${overtimeRequest.start_time} - ${overtimeRequest.end_time}\\n`
        message += `Durasi: ${overtimeRequest.hours} jam\\n`

        if (reviewNotes) {
          message += `\\nCatatan:\\n${reviewNotes}`
        }

        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: overtimeRequest.employee.telegram_chat_id,
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
      message: `Pengajuan lembur berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}`
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
