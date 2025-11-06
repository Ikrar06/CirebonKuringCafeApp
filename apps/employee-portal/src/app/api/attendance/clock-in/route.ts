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
    console.log('📍 Cafe location from DB:', cafeLocation)

    // Server-side validation: recalculate distance
    const actualDistance = calculateDistance(latitude, longitude, cafeLocation.lat, cafeLocation.lng)
    console.log('📏 Distance calculated:', {
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
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single()

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Anda sudah clock in hari ini' },
        { status: 400 }
      )
    }

    // Get today's shift schedule for this employee
    const { data: schedule } = await supabase
      .from('shift_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single()

    if (!schedule) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki jadwal shift hari ini' },
        { status: 400 }
      )
    }

    // Calculate if employee is late
    const clockInTime = new Date()
    const scheduledInTime = new Date(`${today}T${schedule.shift_start}`)
    const lateThreshold = 15 * 60 * 1000 // 15 minutes in milliseconds
    const timeDifference = clockInTime.getTime() - scheduledInTime.getTime()

    let lateMinutes = 0
    let attendanceStatus = 'present'

    if (timeDifference > lateThreshold) {
      // Calculate actual late minutes AFTER subtracting the 15-minute tolerance
      const totalMinutes = Math.floor(timeDifference / (60 * 1000))
      lateMinutes = totalMinutes - 15 // Subtract tolerance period
      attendanceStatus = 'late'
      console.log(`⏰ Employee clocked in ${totalMinutes} minutes after scheduled time, late by ${lateMinutes} minutes (after 15-min tolerance)`)
    }

    // Create location string (format: "lat,lng" for PostgreSQL POINT type)
    const locationString = `(${latitude},${longitude})`

    // Create new attendance record
    const { data: attendance, error } = await supabase
      .from('attendance')
      .insert({
        employee_id: employeeId,
        date: today,
        clock_in: clockInTime.toISOString(),
        clock_in_location: locationString,
        clock_in_distance: Math.round(actualDistance * 100) / 100, // Round to 2 decimal places
        scheduled_in: schedule.shift_start,
        scheduled_out: schedule.shift_end,
        shift_type: schedule.shift_type,
        status: attendanceStatus,
        late_minutes: lateMinutes,
        total_break_minutes: 0,
        overtime_hours: 0,
        regular_hours: 0,
        total_hours: 0,
        created_at: clockInTime.toISOString()
      })
      .select()
      .single()

    console.log('✅ Clock-in successful:', attendance)

    if (error) {
      console.error('Error creating attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      attendance,
      isLate: lateMinutes > 0,
      lateMinutes
    }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
