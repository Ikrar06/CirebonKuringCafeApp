import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

// GET - Fetch notification settings
export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
    }

    const employeeId = decoded.id

    // Fetch employee settings
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', employeeId)
      .single()

    if (employeeError) {
      console.error('Error fetching employee settings:', employeeError)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      telegram_chat_id: employee?.telegram_chat_id,
      telegram_notifications_enabled: employee?.telegram_notifications_enabled ?? true
    })
  } catch (error) {
    console.error('Error in notifications settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update notification settings
export async function PUT(request: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
    }

    const employeeId = decoded.id

    // Parse request body
    const body = await request.json()
    const { telegram_chat_id, telegram_notifications_enabled } = body

    console.log('Updating settings for employee:', employeeId)
    console.log('Settings:', { telegram_chat_id, telegram_notifications_enabled })

    // Update employee settings
    const { data: updateData, error: updateError } = await supabase
      .from('employees')
      .update({
        telegram_chat_id,
        telegram_notifications_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)
      .select()

    if (updateError) {
      console.error('Error updating employee settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to update settings: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log('Update successful:', updateData)

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: updateData
    })
  } catch (error) {
    console.error('Error in notifications settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
