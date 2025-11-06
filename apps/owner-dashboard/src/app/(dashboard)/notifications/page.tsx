'use client'

import { useState, useEffect } from 'react'
import {
  Bell,
  Send,
  Users,
  MessageSquare,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Filter,
  X,
  Check
} from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  position: string
  telegram_chat_id: string | null
  telegram_notifications_enabled: boolean
}

interface NotificationTemplate {
  id: string
  name: string
  type: string
  emoji: string
}

export default function NotificationsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  // Form state
  const [notificationType, setNotificationType] = useState<string>('custom')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [emoji, setEmoji] = useState('📬')
  const [urgent, setUrgent] = useState(false)

  // Toast state
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'confirm'>('success')
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null)

  // Template presets
  const templates: NotificationTemplate[] = [
    { id: 'custom', name: 'Custom Message', type: 'custom', emoji: '📬' },
    { id: 'announcement', name: 'Announcement', type: 'announcement', emoji: '📢' },
    { id: 'reminder', name: 'Reminder', type: 'reminder', emoji: '⏰' },
    { id: 'urgent', name: 'Urgent', type: 'urgent', emoji: '🚨' },
    { id: 'meeting', name: 'Meeting', type: 'meeting', emoji: '👥' },
    { id: 'schedule', name: 'Schedule Change', type: 'schedule', emoji: '📅' },
  ]

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const { data } = await response.json()
        setEmployees(data || [])
      }
    } catch (error) {
      console.error('Error loading employees:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const toggleSelectAll = () => {
    const eligibleEmployees = employees.filter(
      e => e.telegram_chat_id && e.telegram_notifications_enabled
    )

    if (selectedEmployees.length === eligibleEmployees.length && eligibleEmployees.length > 0) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(eligibleEmployees.map(e => e.id))
    }
  }

  const handleTemplateSelect = (template: NotificationTemplate) => {
    setNotificationType(template.type)
    setEmoji(template.emoji)

    // Set default titles based on template
    const defaultTitles: Record<string, string> = {
      announcement: 'Pengumuman Penting',
      reminder: 'Pengingat',
      urgent: 'PENTING!',
      meeting: 'Undangan Meeting',
      schedule: 'Perubahan Jadwal',
      custom: ''
    }

    setTitle(defaultTitles[template.type] || '')
    setMessage('')
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

  const handleSendNotifications = async () => {
    if (!title || !message) {
      showError('Title dan message harus diisi!')
      return
    }

    if (selectedEmployees.length === 0) {
      showError('Pilih minimal 1 karyawan!')
      return
    }

    showConfirm(
      `Kirim notifikasi ke ${selectedEmployees.length} karyawan?`,
      async () => {
        setShowToast(false)
        setIsSending(true)
        try {
          const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_ids: selectedEmployees,
              title,
              message,
              emoji,
              urgent,
              type: notificationType
            })
          })

          if (response.ok) {
            const result = await response.json()
            showSuccess(`✅ Notifikasi terkirim!\nBerhasil: ${result.success} | Gagal: ${result.failed}`)

            // Reset form
            setTitle('')
            setMessage('')
            setSelectedEmployees([])
            setUrgent(false)
            setNotificationType('custom')
            setEmoji('📬')
          } else {
            const errorData = await response.json()
            showError(`❌ ${errorData.error || 'Gagal mengirim notifikasi'}`)
          }
        } catch (error) {
          console.error('Error sending notifications:', error)
          showError('❌ Gagal mengirim notifikasi. Periksa koneksi internet.')
        } finally {
          setIsSending(false)
        }
      }
    )
  }

  const eligibleCount = employees.filter(
    e => e.telegram_chat_id && e.telegram_notifications_enabled
  ).length

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Bell className="h-7 w-7" />
          <span>Notification Center</span>
        </h1>
        <p className="text-gray-600">Send Telegram notifications to employees</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-6 w-6 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase">Total Employees</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Telegram Active</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{eligibleCount}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="h-6 w-6 text-purple-600" />
            <span className="text-xs text-gray-500 uppercase">Selected</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{selectedEmployees.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Compose */}
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Templates</h2>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    notificationType === template.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{template.emoji}</div>
                  <div className="text-sm font-medium text-gray-900">{template.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Message Composer */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Compose Message</h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Pengumuman Libur"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Write your message here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length} characters
                </p>
              </div>

              {/* Emoji */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emoji (optional)
                </label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="📬"
                  maxLength={2}
                  className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-xl text-gray-600"
                />
              </div>

              {/* Urgent */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={urgent}
                  onChange={(e) => setUrgent(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="urgent" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Mark as urgent (🚨)
                </label>
              </div>

              {/* Preview */}
              {(title || message) && (
                <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Preview:</p>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="font-bold text-gray-900">
                      {emoji} {urgent ? '🚨 PENTING - ' : ''}{title || 'Title'}
                    </p>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {message || 'Message...'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Recipients */}
        <div className="space-y-6">
          {/* Recipients */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Select Recipients</h2>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedEmployees.length === eligibleCount ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 text-gray-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {employees.map((employee) => {
                  const canReceive = employee.telegram_chat_id && employee.telegram_notifications_enabled
                  const isSelected = selectedEmployees.includes(employee.id)

                  return (
                    <label
                      key={employee.id}
                      className={`p-3 border rounded-lg transition-all block ${
                        !canReceive
                          ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-50 border-blue-500 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              if (canReceive) {
                                toggleEmployee(employee.id)
                              }
                            }}
                            disabled={!canReceive}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {employee.full_name}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getPositionColor(employee.position)}`}>
                                {getPositionLabel(employee.position)}
                              </span>
                              {!canReceive && (
                                <span className="text-xs text-red-600 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  No Telegram
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendNotifications}
            disabled={isSending || selectedEmployees.length === 0 || !title || !message}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2 text-lg"
          >
            {isSending ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Send to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">📝 Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Pilih template untuk mengisi judul otomatis</li>
          <li>Hanya karyawan dengan Telegram aktif yang bisa menerima notifikasi</li>
          <li>Centang "urgent" untuk notifikasi penting</li>
          <li>Preview akan muncul sebelum mengirim</li>
        </ul>
      </div>

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
                    Ya, Kirim
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
