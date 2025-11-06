import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

// Haversine formula untuk hitung jarak
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

// Fetch cafe location from database
async function getCafeLocation() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('category', 'cafe')
    .eq('key', 'location')
    .single()

  if (error || !data) {
    console.error('Error fetching cafe location:', error)
    // Return default location if database fetch fails
    return { lat: -6.7063803, lng: 108.5619729, radius: 200 }
  }

  return data.value
}

export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json()
    const { latitude, longitude, distance } = body

    if (!latitude || !longitude || distance === undefined) {
      return NextResponse.json(
        { error: 'Data lokasi tidak lengkap' },
        { status: 400 }
      )
    }

    // Fetch cafe location from database
    const cafeLocation = await getCafeLocation()
    console.log('📍 Cafe location from DB (clock-out):', cafeLocation)

    // Server-side validation: recalculate distance
    const actualDistance = calculateDistance(latitude, longitude, cafeLocation.lat, cafeLocation.lng)
    console.log('📏 Distance calculated (clock-out):', {
      employeeLocation: { lat: latitude, lng: longitude },
      cafeLocation: { lat: cafeLocation.lat, lng: cafeLocation.lng },
      distance: actualDistance,
      maxDistance: cafeLocation.radius
    })

    if (actualDistance > cafeLocation.radius) {
      return NextResponse.json(
        { error: `Anda terlalu jauh dari cafe (${Math.round(actualDistance)}m). Maksimal ${cafeLocation.radius}m.` },
        { status: 400 }
      )
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // Check if already clocked in today
    const { data: existingAttendance, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single()

    if (fetchError || !existingAttendance) {
      return NextResponse.json(
        { error: 'Anda belum clock in hari ini' },
        { status: 400 }
      )
    }

    if (existingAttendance.clock_out) {
      return NextResponse.json(
        { error: 'Anda sudah clock out hari ini' },
        { status: 400 }
      )
    }

    // Calculate work hours
    const clockInTime = new Date(existingAttendance.clock_in)
    const clockOutTime = new Date()
    const totalMinutesWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60)

    // Get scheduled end time
    const scheduledOutTime = new Date(`${today}T${existingAttendance.scheduled_out}`)

    // Calculate regular hours (capped at scheduled hours)
    const scheduledStartTime = new Date(`${today}T${existingAttendance.scheduled_in}`)
    const scheduledMinutes = (scheduledOutTime.getTime() - scheduledStartTime.getTime()) / (1000 * 60)

    // Subtract break time from total minutes worked
    const breakMinutes = existingAttendance.total_break_minutes || 0
    const netMinutesWorked = totalMinutesWorked - breakMinutes

    let regularHours = 0
    let overtimeHours = 0
    let overtimeApproved = false
    let needsOvertimeApproval = false

    // Calculate regular hours (up to scheduled hours)
    if (netMinutesWorked <= scheduledMinutes) {
      regularHours = netMinutesWorked / 60
    } else {
      regularHours = scheduledMinutes / 60

      // Calculate overtime
      const overtimeMinutes = netMinutesWorked - scheduledMinutes
      overtimeHours = overtimeMinutes / 60

      // Check if overtime request exists and is approved
      const { data: overtimeRequest } = await supabase
        .from('overtime_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .eq('status', 'approved')
        .single()

      if (overtimeHours <= 2) {
        // Auto-approve overtime under 2 hours
        overtimeApproved = false // Will be handled by system, not pre-approved
        console.log(`⏰ Auto-approved overtime: ${overtimeHours.toFixed(2)} hours`)
      } else {
        // Overtime over 2 hours requires approval
        if (overtimeRequest) {
          overtimeApproved = true
          console.log(`✅ Overtime approved: ${overtimeHours.toFixed(2)} hours`)
        } else {
          needsOvertimeApproval = true
          console.log(`⚠️ Overtime needs approval: ${overtimeHours.toFixed(2)} hours`)
          // Still record the overtime but mark as not approved
        }
      }
    }

    // Calculate early leave
    let earlyLeaveMinutes = 0
    if (clockOutTime < scheduledOutTime) {
      earlyLeaveMinutes = Math.floor((scheduledOutTime.getTime() - clockOutTime.getTime()) / (1000 * 60))
    }

    // Create location string (format: "(lat,lng)" for PostgreSQL POINT type)
    const locationString = `(${latitude},${longitude})`

    const totalHours = regularHours + overtimeHours

    // Update attendance record with clock out
    const { data: attendance, error } = await supabase
      .from('attendance')
      .update({
        clock_out: clockOutTime.toISOString(),
        clock_out_location: locationString,
        clock_out_distance: Math.round(actualDistance * 100) / 100, // Round to 2 decimal places
        regular_hours: Number(regularHours.toFixed(2)),
        total_hours: Number(totalHours.toFixed(2)),
        overtime_hours: Number(overtimeHours.toFixed(2)),
        overtime_approved: overtimeApproved,
        early_leave_minutes: earlyLeaveMinutes,
        updated_at: clockOutTime.toISOString()
      })
      .eq('id', existingAttendance.id)
      .select()
      .single()

    console.log('✅ Clock-out successful:', attendance)

    if (error) {
      console.error('Error updating attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      attendance,
      overtime: {
        hours: overtimeHours,
        approved: overtimeApproved,
        needsApproval: needsOvertimeApproval,
        autoApproved: overtimeHours > 0 && overtimeHours <= 2 && !overtimeApproved
      },
      earlyLeave: earlyLeaveMinutes > 0 ? {
        minutes: earlyLeaveMinutes
      } : null
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
