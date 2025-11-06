import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

interface TelegramMessage {
  chat_id: string
  text: string
  parse_mode?: 'HTML' | 'Markdown'
}

/**
 * Send a message to a Telegram chat
 */
async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram bot token not configured')
    return false
  }

  if (!chatId) {
    console.warn('Chat ID not provided')
    return false
  }

  try {
    const payload: TelegramMessage = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    }

    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Telegram API error:', data.description)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return false
  }
}

// POST - Send test notification
export async function POST(request: NextRequest) {
  try {
    console.log('=== Test Notification Request ===')

    // Verify JWT token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      console.log('No token provided')
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      console.log('Invalid token')
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
    }

    const employeeId = decoded.id
    console.log('Employee ID:', employeeId)

    // Fetch employee data
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('full_name, telegram_chat_id, telegram_notifications_enabled')
      .eq('id', employeeId)
      .single()

    console.log('Employee data:', employee)
    console.log('Employee error:', employeeError)

    if (employeeError || !employee) {
      console.error('Error fetching employee:', employeeError)
      return NextResponse.json(
        { error: 'Failed to fetch employee data' },
        { status: 500 }
      )
    }

    // Check if notifications are enabled
    console.log('Notifications enabled:', employee.telegram_notifications_enabled)
    console.log('Type:', typeof employee.telegram_notifications_enabled)
    if (employee.telegram_notifications_enabled === false) {
      console.log('Notifications disabled')
      return NextResponse.json(
        { error: 'Notifikasi tidak diaktifkan. Aktifkan notifikasi terlebih dahulu.' },
        { status: 400 }
      )
    }

    // Check if chat_id is set
    console.log('Chat ID:', employee.telegram_chat_id)
    if (!employee.telegram_chat_id) {
      console.log('No chat ID set')
      return NextResponse.json(
        { error: 'Chat ID belum diatur. Masukkan Chat ID Telegram Anda terlebih dahulu.' },
        { status: 400 }
      )
    }

    // Create test message
    const testMessage = `
<b>🔔 Test Notifikasi</b>

Halo <b>${employee.full_name}</b>! 👋

Ini adalah pesan test untuk memastikan notifikasi Telegram Anda berfungsi dengan baik.

Jika Anda menerima pesan ini, berarti setup notifikasi Anda sudah berhasil! ✅

Anda akan menerima notifikasi untuk:
• Persetujuan/Penolakan Lembur
• Pengingat Absensi
• Jadwal Shift
• Persetujuan/Penolakan Cuti
• Slip Gaji
• Pengumuman Penting

━━━━━━━━━━━━━━━━━━
<i>Cirebon Kuring Cafe Employee Portal</i>
`.trim()

    // Send the message
    const success = await sendTelegramMessage(employee.telegram_chat_id, testMessage)

    if (!success) {
      return NextResponse.json(
        { error: 'Gagal mengirim notifikasi. Pastikan Chat ID Anda benar.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully'
    })
  } catch (error) {
    console.error('Error in test notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
