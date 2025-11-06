'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Sun,
  Moon,
  AlertCircle,
  CalendarDays
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'

interface ShiftSchedule {
  id: string
  date: string
  shift_start: string
  shift_end: string
  break_duration: number
  shift_type: 'regular' | 'overtime' | 'holiday' | 'special'
  notes?: string
}

export default function SchedulePage() {
  const { employee } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  useEffect(() => {
    fetchSchedules()
  }, [currentDate])

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const month = (currentDate.getMonth() + 1).toString()
      const year = currentDate.getFullYear().toString()

      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        console.error('Token tidak ditemukan')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/schedule?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()

      if (response.ok) {
        setSchedules(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const getShiftForDate = (date: Date): ShiftSchedule | undefined => {
    return schedules.find((schedule) =>
      isSameDay(new Date(schedule.date), date)
    )
  }

  const getShiftTypeLabel = (type: ShiftSchedule['shift_type']) => {
    const labels = {
      regular: 'Regular',
      overtime: 'Lembur',
      holiday: 'Libur',
      special: 'Khusus'
    }
    return labels[type]
  }

  const getShiftTypeColor = (type: ShiftSchedule['shift_type']) => {
    const colors = {
      regular: 'bg-blue-100 text-blue-700 border-blue-300',
      overtime: 'bg-orange-100 text-orange-700 border-orange-300',
      holiday: 'bg-green-100 text-green-700 border-green-300',
      special: 'bg-purple-100 text-purple-700 border-purple-300'
    }
    return colors[type]
  }

  const getShiftIcon = (type: ShiftSchedule['shift_type']) => {
    const icons = {
      regular: Sun,
      overtime: Moon,
      holiday: Coffee,
      special: AlertCircle
    }
    return icons[type]
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const today = () => {
    setCurrentDate(new Date())
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = monthStart.getDay()

  // Create array for calendar grid (including empty cells for alignment)
  const calendarDays = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  calendarDays.push(...daysInMonth)

  // Selected date's schedule
  const selectedSchedule = selectedDate ? getShiftForDate(selectedDate) : null

  // Upcoming shifts (next 7 days from today)
  const upcomingShifts = schedules
    .filter((schedule) => new Date(schedule.date) >= new Date())
    .slice(0, 7)

  if (!employee) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jadwal Kerja</h1>
        <p className="text-gray-600 mt-1">Lihat jadwal shift Anda</p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Kalender
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarDays className="h-4 w-4 inline mr-2" />
            Daftar
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <>
          {/* Calendar Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {format(currentDate, 'MMMM yyyy', { locale: id })}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={today}
                  className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hari Ini
                </button>
                <button
                  onClick={previousMonth}
                  className="p-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Memuat jadwal...</p>
              </div>
            ) : (
              <>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Day Headers */}
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}

                  {/* Calendar Days */}
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />
                    }

                    const shift = getShiftForDate(day)
                    const isCurrentDay = isToday(day)
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const ShiftIcon = shift ? getShiftIcon(shift.shift_type) : null

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square rounded-lg border-2 p-2 transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : shift
                            ? getShiftTypeColor(shift.shift_type)
                            : 'border-gray-200 hover:border-gray-300'
                        } ${isCurrentDay && !isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span
                            className={`text-sm font-medium ${
                              isCurrentDay ? 'text-blue-600' : shift ? '' : 'text-gray-700'
                            }`}
                          >
                            {format(day, 'd')}
                          </span>
                          {shift && ShiftIcon && (
                            <ShiftIcon className="h-4 w-4 mt-1" />
                          )}
                          {shift && (
                            <span className="text-xs mt-1">
                              {shift.shift_start.slice(0, 5)}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Legenda:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['regular', 'overtime', 'holiday', 'special'] as const).map((type) => {
                      const Icon = getShiftIcon(type)
                      return (
                        <div key={type} className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${getShiftTypeColor(type)}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <span className="text-sm text-gray-700">{getShiftTypeLabel(type)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Selected Date Details */}
          {selectedSchedule && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Detail Shift - {selectedDate && format(selectedDate, 'dd MMMM yyyy', { locale: id })}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Jenis Shift:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getShiftTypeColor(selectedSchedule.shift_type).replace('border-2', '')}`}>
                    {getShiftTypeLabel(selectedSchedule.shift_type)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Jam Kerja:</span>
                  <div className="flex items-center space-x-2 font-medium text-gray-900">
                    <Clock className="h-4 w-4" />
                    <span>{selectedSchedule.shift_start.slice(0, 5)} - {selectedSchedule.shift_end.slice(0, 5)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Durasi Istirahat:</span>
                  <span className="font-medium text-gray-900">{selectedSchedule.break_duration} menit</span>
                </div>
                {selectedSchedule.notes && (
                  <div className="pt-3 border-t border-gray-200">
                    <span className="text-gray-600 block mb-2">Catatan:</span>
                    <p className="text-gray-900">{selectedSchedule.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jadwal Mendatang</h3>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat jadwal...</p>
            </div>
          ) : upcomingShifts.length > 0 ? (
            <div className="space-y-3">
              {upcomingShifts.map((schedule) => {
                const ShiftIcon = getShiftIcon(schedule.shift_type)
                return (
                  <div
                    key={schedule.id}
                    className={`p-4 rounded-lg border-2 ${getShiftTypeColor(schedule.shift_type)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ShiftIcon className="h-5 w-5" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {format(new Date(schedule.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {getShiftTypeLabel(schedule.shift_type)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 font-medium text-gray-900">
                          <Clock className="h-4 w-4" />
                          <span>{schedule.shift_start.slice(0, 5)} - {schedule.shift_end.slice(0, 5)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Istirahat: {schedule.break_duration} menit
                        </p>
                      </div>
                    </div>
                    {schedule.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-700">{schedule.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Tidak ada jadwal mendatang</p>
            </div>
          )}
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
