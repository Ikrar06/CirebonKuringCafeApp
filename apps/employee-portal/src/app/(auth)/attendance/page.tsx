'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Navigation,
  History
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

// Haversine formula untuk hitung jarak antara 2 koordinat
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

interface AttendanceRecord {
  id: string
  clock_in: string
  clock_out: string | null
  clock_in_distance: number
  clock_out_distance: number | null
  date: string
  status: string
  late_minutes: number
  scheduled_in: string
  scheduled_out: string
  shift_type: string
  regular_hours: number
  overtime_hours: number
  overtime_approved: boolean
  early_leave_minutes: number
  total_hours: number
}

export default function AttendancePage() {
  const { employee } = useAuth()
  const [currentLocation, setCurrentLocation] = useState<GeolocationCoordinates | null>(null)
  const [locationError, setLocationError] = useState<string>('')
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [clockInInfo, setClockInInfo] = useState<{ isLate: boolean; lateMinutes: number } | null>(null)
  const [clockOutInfo, setClockOutInfo] = useState<any>(null)

  // Lokasi cafe dari database
  const [cafeLocation, setCafeLocation] = useState({
    lat: -6.7063803,
    lng: 108.5619729,
    radius: 200
  })
  const [isLoadingCafeLocation, setIsLoadingCafeLocation] = useState(true)

  const CAFE_LAT = cafeLocation.lat
  const CAFE_LON = cafeLocation.lng
  const MAX_DISTANCE = cafeLocation.radius

  // Get current location
  const getCurrentLocation = () => {
    setIsLoadingLocation(true)
    setLocationError('')
    setError('')

    if (!navigator.geolocation) {
      setLocationError('GPS tidak didukung oleh browser Anda')
      setIsLoadingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Lokasi berhasil didapat:', position.coords)
        setCurrentLocation(position.coords)
        const dist = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          CAFE_LAT,
          CAFE_LON
        )
        setDistance(dist)
        setIsLoadingLocation(false)
      },
      (error) => {
        console.error('❌ Geolocation error:', error)
        let errorMessage = ''
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser Anda.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informasi lokasi tidak tersedia. Pastikan GPS aktif dan Anda tidak menggunakan VPN.'
            break
          case error.TIMEOUT:
            errorMessage = 'Timeout mendapatkan lokasi. Coba lagi dalam beberapa saat.'
            break
          default:
            errorMessage = 'Gagal mendapatkan lokasi. Pastikan GPS aktif dan koneksi internet stabil.'
        }
        setLocationError(errorMessage)
        setIsLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increase timeout to 15 seconds
        maximumAge: 0
      }
    )
  }

  // Load cafe location from database
  useEffect(() => {
    const fetchCafeLocation = async () => {
      try {
        const response = await fetch('/api/settings/location')
        if (response.ok) {
          const data = await response.json()
          if (data.location) {
            setCafeLocation({
              lat: data.location.lat,
              lng: data.location.lng,
              radius: data.location.radius || 200
            })
          }
        }
      } catch (err) {
        console.error('Error fetching cafe location:', err)
      } finally {
        setIsLoadingCafeLocation(false)
      }
    }

    fetchCafeLocation()
  }, [])

  // Load today's attendance
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
        const token = localStorage.getItem('employee_auth_token')
        if (!token) return

        const response = await fetch('/api/attendance/today', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setTodayAttendance(data.attendance)
        }
      } catch (err) {
        console.error('Error fetching attendance:', err)
      }
    }

    fetchTodayAttendance()
  }, [])

  // Auto-detect location on mount
  useEffect(() => {
    getCurrentLocation()
  }, [])

  // Recalculate distance when cafe location or current location changes
  useEffect(() => {
    if (currentLocation && !isLoadingCafeLocation) {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        cafeLocation.lat,
        cafeLocation.lng
      )
      setDistance(dist)
      console.log('🔄 Distance recalculated:', {
        from: { lat: currentLocation.latitude, lng: currentLocation.longitude },
        to: { lat: cafeLocation.lat, lng: cafeLocation.lng },
        distance: dist,
        maxDistance: cafeLocation.radius
      })
    }
  }, [cafeLocation, currentLocation, isLoadingCafeLocation])

  const handleClockIn = async () => {
    if (!currentLocation) {
      setError('Lokasi belum terdeteksi. Klik tombol refresh lokasi.')
      return
    }

    if (distance === null || distance > MAX_DISTANCE) {
      setError(`Anda terlalu jauh dari cafe (${Math.round(distance || 0)}m). Maksimal ${MAX_DISTANCE}m.`)
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login kembali.')
      }

      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          distance: distance
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal clock in')
      }

      setClockInInfo({ isLate: data.isLate, lateMinutes: data.lateMinutes })
      if (data.isLate) {
        setSuccess(`Clock in berhasil! (Terlambat ${data.lateMinutes} menit)`)
      } else {
        setSuccess('Clock in berhasil! Tepat waktu.')
      }
      setTodayAttendance(data.attendance)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClockOut = async () => {
    if (!currentLocation) {
      setError('Lokasi belum terdeteksi. Klik tombol refresh lokasi.')
      return
    }

    if (distance === null || distance > MAX_DISTANCE) {
      setError(`Anda terlalu jauh dari cafe (${Math.round(distance || 0)}m). Maksimal ${MAX_DISTANCE}m.`)
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login kembali.')
      }

      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          distance: distance
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal clock out')
      }

      setClockOutInfo(data.overtime)

      let successMsg = 'Clock out berhasil!'
      if (data.overtime?.hours > 0) {
        if (data.overtime.autoApproved) {
          successMsg += ` Lembur ${data.overtime.hours.toFixed(1)} jam (otomatis disetujui).`
        } else if (data.overtime.needsApproval) {
          successMsg += ` Lembur ${data.overtime.hours.toFixed(1)} jam menunggu persetujuan owner.`
        } else if (data.overtime.approved) {
          successMsg += ` Lembur ${data.overtime.hours.toFixed(1)} jam (disetujui).`
        }
      }
      if (data.earlyLeave) {
        successMsg += ` Anda pulang ${data.earlyLeave.minutes} menit lebih awal.`
      }

      setSuccess(successMsg)
      setTodayAttendance(data.attendance)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isWithinRange = distance !== null && distance <= MAX_DISTANCE
  const hasClockInToday = todayAttendance?.clock_in
  const hasClockOutToday = todayAttendance?.clock_out

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Absensi</h1>
            <p className="text-gray-600 mt-1">
              {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
            </p>
          </div>
          <Link
            href="/attendance/history"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <History className="h-4 w-4" />
            <span>Riwayat</span>
          </Link>
        </div>

        {/* Location Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Status Lokasi</h2>
            <button
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
            >
              {isLoadingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengambil lokasi...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  <span>Refresh Lokasi</span>
                </>
              )}
            </button>
          </div>

          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-4">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{locationError}</p>
              </div>
            </div>
          )}

          {currentLocation && distance !== null && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className={`h-5 w-5 ${isWithinRange ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Jarak dari cafe: {Math.round(distance)}m
                  </p>
                  <p className={`text-sm ${isWithinRange ? 'text-green-600' : 'text-red-600'}`}>
                    {isWithinRange
                      ? `✓ Dalam jangkauan (maks. ${MAX_DISTANCE}m)`
                      : '✗ Terlalu jauh dari cafe'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p>Koordinat Anda: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</p>
                <p>Koordinat Cafe: {CAFE_LAT}, {CAFE_LON}</p>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Absensi Hari Ini</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Clock In Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <Clock className={`h-5 w-5 ${hasClockInToday ? 'text-green-600' : 'text-gray-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Clock In</p>
                  {hasClockInToday ? (
                    <div>
                      <p className="text-sm text-green-600">
                        ✓ {format(new Date(todayAttendance.clock_in), 'HH:mm')}
                      </p>
                      {todayAttendance.scheduled_in && (
                        <p className="text-xs text-gray-500">
                          Jadwal: {todayAttendance.scheduled_in}
                        </p>
                      )}
                      {todayAttendance.status === 'late' && todayAttendance.late_minutes > 0 && (
                        <p className="text-xs text-red-600">
                          ⚠️ Terlambat {todayAttendance.late_minutes} menit
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Belum clock in</p>
                  )}
                </div>
              </div>
              {!hasClockInToday && (
                <button
                  onClick={handleClockIn}
                  disabled={!isWithinRange || isSubmitting || isLoadingLocation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isSubmitting ? 'Proses...' : 'Clock In'}
                </button>
              )}
            </div>

            {/* Clock Out Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <Clock className={`h-5 w-5 ${hasClockOutToday ? 'text-green-600' : 'text-gray-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Clock Out</p>
                  {hasClockOutToday ? (
                    <div>
                      <p className="text-sm text-green-600">
                        ✓ {format(new Date(todayAttendance.clock_out!), 'HH:mm')}
                      </p>
                      {todayAttendance.scheduled_out && (
                        <p className="text-xs text-gray-500">
                          Jadwal: {todayAttendance.scheduled_out}
                        </p>
                      )}
                      {todayAttendance.regular_hours > 0 && (
                        <p className="text-xs text-gray-600">
                          Jam kerja: {todayAttendance.regular_hours.toFixed(1)} jam
                        </p>
                      )}
                      {todayAttendance.overtime_hours > 0 && (
                        <p className={`text-xs ${todayAttendance.overtime_approved ? 'text-green-600' : 'text-orange-600'}`}>
                          {todayAttendance.overtime_approved ? '✓' : '⏳'} Lembur: {todayAttendance.overtime_hours.toFixed(1)} jam
                          {!todayAttendance.overtime_approved && todayAttendance.overtime_hours <= 2 && ' (otomatis)'}
                          {!todayAttendance.overtime_approved && todayAttendance.overtime_hours > 2 && ' (menunggu persetujuan)'}
                        </p>
                      )}
                      {todayAttendance.early_leave_minutes > 0 && (
                        <p className="text-xs text-orange-600">
                          ⚠️ Pulang {todayAttendance.early_leave_minutes} menit lebih awal
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Belum clock out</p>
                  )}
                </div>
              </div>
              {hasClockInToday && !hasClockOutToday && (
                <button
                  onClick={handleClockOut}
                  disabled={!isWithinRange || isSubmitting || isLoadingLocation}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isSubmitting ? 'Proses...' : 'Clock Out'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Catatan Penting:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Pastikan GPS/Location Services aktif</li>
            <li>• Absensi hanya bisa dilakukan dalam radius {MAX_DISTANCE}m dari cafe</li>
            <li>• Anda harus memiliki jadwal shift untuk bisa clock in</li>
            <li>• Terlambat lebih dari 15 menit akan dicatat sebagai keterlambatan</li>
            <li>• Lembur dibawah 2 jam akan otomatis tercatat</li>
            <li>• Lembur diatas 2 jam memerlukan persetujuan owner terlebih dahulu</li>
            <li>• Koordinat lokasi Anda akan tersimpan untuk validasi</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
