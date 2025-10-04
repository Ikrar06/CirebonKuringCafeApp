'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  Settings
} from 'lucide-react'

interface Shift {
  id: string
  employee_id: string
  employee_name: string
  employee_position: string
  date: string
  shift_start: string
  shift_end: string
  break_duration: number
  notes?: string
  created_at: string
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterPosition, setFilterPosition] = useState<string>('')

  useEffect(() => {
    loadShifts()
  }, [selectedDate])

  const loadShifts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/shifts?date=${selectedDate}`)
      if (response.ok) {
        const { data } = await response.json()
        setShifts(data || [])
      }
    } catch (error) {
      console.error('Error loading shifts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return

    try {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadShifts()
      } else {
        alert('Failed to delete shift')
      }
    } catch (error) {
      console.error('Error deleting shift:', error)
      alert('Failed to delete shift')
    }
  }

  // Navigate dates
  const goToPreviousDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  // Filter shifts
  const filteredShifts = shifts.filter(shift => {
    if (!filterPosition) return true
    return shift.employee_position === filterPosition
  })

  // Group shifts by time
  const shiftsByTime = filteredShifts.reduce((acc, shift) => {
    const key = `${shift.shift_start}-${shift.shift_end}`
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(shift)
    return acc
  }, {} as Record<string, Shift[]>)

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      pelayan: 'bg-green-100 text-green-800',
      dapur: 'bg-orange-100 text-orange-800',
      kasir: 'bg-yellow-100 text-yellow-800',
      stok: 'bg-blue-100 text-blue-800'
    }
    return colors[position] || 'bg-gray-100 text-gray-800'
  }

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      pelayan: 'Pelayan',
      dapur: 'Dapur',
      kasir: 'Kasir',
      stok: 'Stok'
    }
    return labels[position] || position
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-gray-600">Manage employee work schedules</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/employees/shifts/templates"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Templates</span>
          </Link>
          <Link
            href="/employees/shifts/schedule"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center space-x-2"
          >
            <CalendarDays className="h-4 w-4" />
            <span>Weekly Schedule</span>
          </Link>
          <Link
            href="/employees/shifts/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Shift</span>
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-purple-900 mb-2">📋 Shift Management Workflow</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-800">
          <div className="flex items-start space-x-2">
            <span className="font-bold text-purple-900">1.</span>
            <div>
              <p className="font-medium">Create Templates</p>
              <p className="text-xs text-purple-700">Define reusable shift patterns (Morning, Night, etc.)</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold text-purple-900">2.</span>
            <div>
              <p className="font-medium">Weekly Schedule</p>
              <p className="text-xs text-purple-700">Assign templates to employees for the week</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold text-purple-900">3.</span>
            <div>
              <p className="font-medium">View & Adjust</p>
              <p className="text-xs text-purple-700">Monitor daily shifts and make changes as needed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={goToNextDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Today
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Positions</option>
              <option value="pelayan">Pelayan</option>
              <option value="dapur">Dapur</option>
              <option value="kasir">Kasir</option>
              <option value="stok">Stok</option>
            </select>
            <button
              onClick={loadShifts}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Date Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {new Date(selectedDate).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-xs text-blue-700">{filteredShifts.length} shifts scheduled</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {new Set(filteredShifts.map(s => s.employee_id)).size} employees
            </span>
          </div>
        </div>
      </div>

      {/* Shifts List */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        </div>
      ) : Object.keys(shiftsByTime).length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shifts Scheduled</h3>
            <p className="text-gray-600 mb-6">No shifts scheduled for this date</p>
            <Link
              href="/employees/shifts/create"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create First Shift</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(shiftsByTime).map(([timeRange, timeShifts]) => (
            <div key={timeRange} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">{timeRange}</span>
                  <span className="text-sm text-gray-600">({timeShifts.length} employees)</span>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {timeShifts.map((shift) => (
                  <div key={shift.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{shift.employee_name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getPositionColor(shift.employee_position)}`}>
                              {getPositionLabel(shift.employee_position)}
                            </span>
                            {shift.break_duration > 0 && (
                              <span className="text-xs text-gray-500">
                                Break: {shift.break_duration} min
                              </span>
                            )}
                          </div>
                          {shift.notes && (
                            <p className="text-xs text-gray-600 mt-1">{shift.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/employees/shifts/${shift.id}/edit`}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title="Edit shift"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                          title="Delete shift"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
