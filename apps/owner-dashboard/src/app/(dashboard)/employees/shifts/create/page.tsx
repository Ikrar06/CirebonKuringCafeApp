'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Save,
  Plus,
  Trash2,
  Users
} from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  position: string
  is_active: boolean
}

interface ShiftForm {
  employee_id: string
  date: string
  shift_start: string
  shift_end: string
  break_duration: number
  notes: string
}

export default function CreateShiftPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<ShiftForm[]>([
    {
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      shift_start: '08:00',
      shift_end: '17:00',
      break_duration: 60,
      notes: ''
    }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const { data } = await response.json()
        setEmployees(data.filter((e: Employee) => e.is_active))
      }
    } catch (error) {
      console.error('Error loading employees:', error)
    }
  }

  const addShiftRow = () => {
    setShifts([
      ...shifts,
      {
        employee_id: '',
        date: shifts[0]?.date || new Date().toISOString().split('T')[0],
        shift_start: shifts[0]?.shift_start || '08:00',
        shift_end: shifts[0]?.shift_end || '17:00',
        break_duration: shifts[0]?.break_duration || 60,
        notes: ''
      }
    ])
  }

  const removeShiftRow = (index: number) => {
    if (shifts.length > 1) {
      setShifts(shifts.filter((_, i) => i !== index))
    }
  }

  const updateShift = (index: number, field: keyof ShiftForm, value: string | number) => {
    const newShifts = [...shifts]
    newShifts[index] = {
      ...newShifts[index],
      [field]: value
    }
    setShifts(newShifts)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const invalidShifts = shifts.filter(s => !s.employee_id)
    if (invalidShifts.length > 0) {
      alert('Please select an employee for all shifts')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shifts })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create shifts')
      }

      router.push('/employees/shifts')
    } catch (error: any) {
      console.error('Error creating shifts:', error)
      alert(error.message || 'Failed to create shifts')
    } finally {
      setIsSubmitting(false)
    }
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
        <div className="flex items-center space-x-4">
          <Link
            href="/employees/shifts"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Shifts</h1>
            <p className="text-gray-600">Schedule employee work shifts</p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Quick Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>You can create multiple shifts at once by clicking "Add Another Shift"</li>
          <li>All shifts in this form will use the same date by default</li>
          <li>Break duration is in minutes (e.g., 60 = 1 hour)</li>
          <li>Only active employees are shown in the list</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shifts List */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Shifts ({shifts.length})</span>
            </h2>
            <button
              type="button"
              onClick={addShiftRow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Another Shift</span>
            </button>
          </div>

          <div className="space-y-4">
            {shifts.map((shift, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Shift #{index + 1}</h3>
                  {shifts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeShiftRow(index)}
                      className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Employee */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee *
                    </label>
                    <select
                      value={shift.employee_id}
                      onChange={(e) => updateShift(index, 'employee_id', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} - {getPositionLabel(emp.position)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={shift.date}
                        onChange={(e) => updateShift(index, 'date', e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Shift Start */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift Start *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        value={shift.shift_start}
                        onChange={(e) => updateShift(index, 'shift_start', e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Shift End */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift End *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        value={shift.shift_end}
                        onChange={(e) => updateShift(index, 'shift_end', e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Break Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Break (minutes)
                    </label>
                    <input
                      type="number"
                      value={shift.break_duration}
                      onChange={(e) => updateShift(index, 'break_duration', parseInt(e.target.value))}
                      min="0"
                      step="15"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={shift.notes}
                      onChange={(e) => updateShift(index, 'notes', e.target.value)}
                      placeholder="e.g., Morning shift"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <Link
            href="/employees/shifts"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSubmitting ? 'Creating...' : 'Create Shifts'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
