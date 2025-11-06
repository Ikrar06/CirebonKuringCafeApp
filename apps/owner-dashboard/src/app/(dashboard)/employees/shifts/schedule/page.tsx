'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  Copy,
  RefreshCw,
  Settings,
  X,
  Check,
  MessageSquare
} from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  position: string
  is_active: boolean
}

interface ShiftTemplate {
  id: string
  name: string
  shift_start: string
  shift_end: string
  break_duration: number
  color: string
}

interface WeeklyAssignment {
  employee_id: string
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

export default function WeeklySchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [sendNotifications, setSendNotifications] = useState(true)

  // Toast state
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'confirm'>('success')
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null)

  // Week navigation
  const [currentDate, setCurrentDate] = useState(new Date())
  const weekStart = getMonday(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  useEffect(() => {
    loadData()
  }, [currentDate])

  function getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [employeesRes, templatesRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/shift-templates')
      ])

      if (employeesRes.ok) {
        const { data } = await employeesRes.json()
        const activeEmployees = (data || []).filter((e: Employee) => e.is_active)
        setEmployees(activeEmployees)

        // Initialize assignments
        setAssignments(activeEmployees.map((emp: Employee) => ({
          employee_id: emp.id,
          monday: '',
          tuesday: '',
          wednesday: '',
          thursday: '',
          friday: '',
          saturday: '',
          sunday: ''
        })))
      }

      if (templatesRes.ok) {
        const { data } = await templatesRes.json()
        setTemplates(data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateAssignment = (employeeId: string, day: string, templateId: string) => {
    setAssignments(prev => prev.map(assignment =>
      assignment.employee_id === employeeId
        ? { ...assignment, [day]: templateId }
        : assignment
    ))
  }

  const showConfirm = (msg: string, callback: () => void) => {
    setToastMessage(msg)
    setToastType('confirm')
    setConfirmCallback(() => callback)
    setShowToast(true)
  }

  const showSuccess = (msg: string) => {
    setToastMessage(msg)
    setToastType('success')
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  const showError = (msg: string) => {
    setToastMessage(msg)
    setToastType('error')
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  const copyWeek = () => {
    showConfirm('Copy this week to next week?', () => {
      setShowToast(false)
      const nextWeek = new Date(currentDate)
      nextWeek.setDate(nextWeek.getDate() + 7)
      setCurrentDate(nextWeek)
    })
  }

  const handleSave = async () => {
    const shifts: any[] = []

    assignments.forEach(assignment => {
      weekDays.forEach((date, index) => {
        const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index]
        const templateId = assignment[dayKey as keyof WeeklyAssignment]

        if (templateId) {
          const template = templates.find(t => t.id === templateId)
          if (template) {
            shifts.push({
              employee_id: assignment.employee_id,
              date: date.toISOString().split('T')[0],
              shift_start: template.shift_start,
              shift_end: template.shift_end,
              break_duration: template.break_duration,
              shift_type: 'regular',
              notes: template.name
            })
          }
        }
      })
    })

    if (shifts.length === 0) {
      showError('No shifts to save')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shifts, send_notifications: sendNotifications })
      })

      if (response.ok) {
        const result = await response.json()
        if (sendNotifications && result.notifications) {
          showSuccess(`✅ Schedule saved!\nNotifications sent: ${result.notifications.success}/${result.notifications.total}`)
        } else {
          showSuccess('✅ Schedule saved successfully!')
        }
      } else {
        showError('❌ Failed to save schedule')
      }
    } catch (error) {
      console.error('Error saving schedule:', error)
      showError('❌ Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  const previousWeek = () => {
    const prev = new Date(currentDate)
    prev.setDate(prev.getDate() - 7)
    setCurrentDate(prev)
  }

  const nextWeek = () => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + 7)
    setCurrentDate(next)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  const getDayName = (index: number) => {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]
  }

  const getTemplateById = (id: string) => {
    return templates.find(t => t.id === id)
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-gray-900">Weekly Schedule</h1>
            <p className="text-gray-600">Assign shift templates to employees</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/employees/shifts/templates"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Templates</span>
          </Link>
          <button
            onClick={copyWeek}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center space-x-2"
          >
            <Copy className="h-4 w-4" />
            <span>Copy to Next Week</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Schedule'}</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">How to Use</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Select a shift template for each employee and day</li>
              <li>Leave blank for days off</li>
              <li>Use "Copy to Next Week" to duplicate this week's schedule</li>
              <li>Click "Save Schedule" to publish shifts to all employees</li>
            </ul>
          </div>
          <div className="ml-6">
            <label className="flex items-center space-x-2 text-sm text-blue-900 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotifications}
                onChange={(e) => setSendNotifications(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium">Send Telegram Notifications</span>
            </label>
            <p className="text-xs text-blue-700 mt-1 ml-6">
              Notify employees about their shifts
            </p>
          </div>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={previousWeek}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-gray-900">
              {formatDate(weekDays[0])} - {formatDate(weekDays[6])}, {weekDays[0].getFullYear()}
            </span>
          </div>
          <button
            onClick={nextWeek}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-gray-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                    Employee
                  </th>
                  {weekDays.map((date, index) => (
                    <th key={index} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[180px]">
                      <div>{getDayName(index)}</div>
                      <div className="text-gray-500 font-normal">{formatDate(date)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => {
                  const assignment = assignments.find(a => a.employee_id === employee.id)
                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 sticky left-0 bg-white z-10">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                          <div className="text-xs text-gray-500 capitalize">{employee.position}</div>
                        </div>
                      </td>
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                        const templateId = assignment?.[day as keyof WeeklyAssignment] || ''
                        const template = templateId ? getTemplateById(templateId) : null

                        return (
                          <td key={day} className="px-4 py-3">
                            <select
                              value={templateId}
                              onChange={(e) => updateAssignment(employee.id, day, e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              style={template ? {
                                borderLeftWidth: '4px',
                                borderLeftColor: template.color
                              } : {}}
                            >
                              <option value="">Day off</option>
                              {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name} ({template.shift_start}-{template.shift_end})
                                </option>
                              ))}
                            </select>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Templates Reference */}
      {templates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Available Templates</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg"
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: template.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{template.name}</div>
                  <div className="text-xs text-gray-500">{template.shift_start}-{template.shift_end}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Toast/Modal */}
      {showToast && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
          <div className={`bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 ${
            toastType === 'confirm' ? 'border-2 border-blue-500' :
            toastType === 'success' ? 'border-2 border-green-500' :
            'border-2 border-red-500'
          }`}>
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                toastType === 'confirm' ? 'bg-blue-100' :
                toastType === 'success' ? 'bg-green-100' :
                'bg-red-100'
              }`}>
                {toastType === 'confirm' && <MessageSquare className="h-6 w-6 text-blue-600" />}
                {toastType === 'success' && <Check className="h-6 w-6 text-green-600" />}
                {toastType === 'error' && <X className="h-6 w-6 text-red-600" />}
              </div>

              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-2 ${
                  toastType === 'confirm' ? 'text-blue-900' :
                  toastType === 'success' ? 'text-green-900' :
                  'text-red-900'
                }`}>
                  {toastType === 'confirm' ? 'Konfirmasi' :
                   toastType === 'success' ? 'Berhasil!' :
                   'Error'}
                </h3>
                <p className="text-gray-700 whitespace-pre-line">{toastMessage}</p>
              </div>
            </div>

            <div className="mt-6 flex space-x-3 justify-end">
              {toastType === 'confirm' ? (
                <>
                  <button
                    onClick={() => setShowToast(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (confirmCallback) confirmCallback()
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Ya, Lanjutkan
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowToast(false)}
                  className={`px-6 py-2 rounded-lg font-medium text-white ${
                    toastType === 'success' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
