'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Bell,
  BellOff,
  MessageSquare,
  Check,
  X,
  Send,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

export default function NotificationsPage() {
  const { employee } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingSend, setTestingSend] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        console.error('Token tidak ditemukan')
        setLoading(false)
        return
      }

      const response = await fetch('/api/notifications/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()

      if (response.ok) {
        setTelegramChatId(data.telegram_chat_id || '')
        setNotificationsEnabled(data.telegram_notifications_enabled ?? true)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        setMessage({ type: 'error', text: 'Token tidak ditemukan' })
        setSaving(false)
        return
      }

      const payload = {
        telegram_chat_id: telegramChatId || null,
        telegram_notifications_enabled: notificationsEnabled
      }

      console.log('Saving settings:', payload)

      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('Save response:', data)

      if (response.ok) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan' })
        setTimeout(() => setMessage(null), 3000)
        // Reload settings to ensure state is in sync
        await fetchSettings()
      } else {
        console.error('Save failed:', data)
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan pengaturan' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      setTestingSend(true)
      setMessage(null)

      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        setMessage({ type: 'error', text: 'Token tidak ditemukan' })
        return
      }

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Notifikasi test berhasil dikirim! Cek Telegram Anda.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal mengirim notifikasi test' })
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengirim notifikasi' })
    } finally {
      setTestingSend(false)
    }
  }

  const notificationTypes = [
    { name: 'Persetujuan Lembur', description: 'Notifikasi saat pengajuan lembur disetujui atau ditolak' },
    { name: 'Pengingat Absensi', description: 'Pengingat untuk absen masuk dan pulang' },
    { name: 'Jadwal Shift', description: 'Notifikasi jadwal shift Anda' },
    { name: 'Persetujuan Cuti', description: 'Notifikasi saat pengajuan cuti disetujui atau ditolak' },
    { name: 'Slip Gaji', description: 'Notifikasi saat slip gaji tersedia' },
    { name: 'Pengumuman', description: 'Pengumuman penting dari manajemen' }
  ]

  if (!employee) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Notifikasi</h1>
          <p className="text-gray-600 mt-1">Kelola notifikasi Telegram Anda</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center space-x-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat pengaturan...</p>
          </div>
        ) : (
          <>
            {/* Connection Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    telegramChatId && notificationsEnabled
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }`}>
                    {telegramChatId && notificationsEnabled ? (
                      <Bell className="h-6 w-6 text-green-600" />
                    ) : (
                      <BellOff className="h-6 w-6 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {telegramChatId && notificationsEnabled ? 'Notifikasi Aktif' : 'Notifikasi Nonaktif'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {telegramChatId
                        ? notificationsEnabled
                          ? 'Anda akan menerima notifikasi via Telegram'
                          : 'Notifikasi dimatikan, aktifkan untuk menerima notifikasi'
                        : 'Setup Chat ID untuk menerima notifikasi'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enable/Disable Toggle */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Aktifkan Notifikasi</p>
                      <p className="text-sm text-gray-600">Terima notifikasi via Telegram</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Telegram Chat ID */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Masukkan Chat ID Telegram Anda"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Belum punya Chat ID? Ikuti langkah-langkah di bawah ini.
                  </p>
                </div>

                {/* How to Get Chat ID */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Cara Mendapatkan Chat ID:</h4>
                  <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                    <li>Buka Telegram dan cari bot <code className="bg-white px-2 py-1 rounded text-blue-600">@CirebonKuringBot</code></li>
                    <li>Klik tombol Start atau kirim pesan <code className="bg-white px-2 py-1 rounded">/start</code></li>
                    <li>Bot akan mengirimkan Chat ID Anda</li>
                    <li>Salin Chat ID tersebut dan masukkan di form di atas</li>
                  </ol>
                  <a
                    href="https://t.me/CirebonKuringBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Buka Bot Telegram</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Simpan Pengaturan</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleTestNotification}
                    disabled={!telegramChatId || !notificationsEnabled || testingSend}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {testingSend ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        <span>Kirim Test Notifikasi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Types */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Jenis Notifikasi</h3>
              <p className="text-sm text-gray-600 mb-4">
                Anda akan menerima notifikasi berikut jika fitur notifikasi diaktifkan:
              </p>
              <div className="space-y-3">
                {notificationTypes.map((type, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{type.name}</p>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
