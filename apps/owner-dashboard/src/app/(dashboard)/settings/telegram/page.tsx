'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  Send,
  Check,
  X,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react'

interface TelegramConfig {
  botToken: string
  chatId: string
  enableNewOrders: boolean
  enableLowStock: boolean
  enableDailyReport: boolean
  enablePaymentConfirmation: boolean
}

export default function TelegramSettingsPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  const [config, setConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    enableNewOrders: true,
    enableLowStock: true,
    enableDailyReport: false,
    enablePaymentConfirmation: true
  })

  const handleChange = (field: keyof TelegramConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleTest = async () => {
    if (!config.botToken || !config.chatId) {
      alert('Mohon isi Bot Token dan Chat ID terlebih dahulu')
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      // TODO: Test telegram connection
      await new Promise(resolve => setTimeout(resolve, 2000))
      setTestResult('success')
    } catch (error) {
      console.error('Test failed:', error)
      setTestResult('error')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Save to database
      await new Promise(resolve => setTimeout(resolve, 1500))

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Gagal menyimpan konfigurasi')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Notifikasi Telegram</h1>
                  <p className="text-sm text-gray-600">Konfigurasi bot untuk notifikasi real-time</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center space-x-2 disabled:opacity-50 shadow-sm transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : showSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Simpan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Setup Guide */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
            Cara Setup Bot Telegram
          </h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="font-bold text-purple-600 mr-2">1.</span>
              <span>Buka Telegram dan cari <strong>@BotFather</strong></span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-purple-600 mr-2">2.</span>
              <span>Kirim perintah <code className="bg-white px-2 py-0.5 rounded text-purple-600">/newbot</code> dan ikuti instruksi</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-purple-600 mr-2">3.</span>
              <span>Copy <strong>Bot Token</strong> yang diberikan dan paste di bawah</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-purple-600 mr-2">4.</span>
              <span>Untuk mendapatkan Chat ID, kirim pesan ke bot Anda, lalu buka: <code className="bg-white px-2 py-0.5 rounded text-purple-600 text-xs">https://api.telegram.org/bot{'{TOKEN}'}/getUpdates</code></span>
            </li>
          </ol>
          <a
            href="https://core.telegram.org/bots#botfather"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Baca dokumentasi lengkap
          </a>
        </div>

        {/* Configuration Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-8 space-y-6">
            {/* Bot Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bot Token *
              </label>
              <input
                type="text"
                value={config.botToken}
                onChange={(e) => handleChange('botToken', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm text-gray-600"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
              <p className="mt-2 text-xs text-gray-500">
                Token yang didapat dari @BotFather
              </p>
            </div>

            {/* Chat ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chat ID *
              </label>
              <input
                type="text"
                value={config.chatId}
                onChange={(e) => handleChange('chatId', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm text-gray-600"
                placeholder="-1001234567890"
              />
              <p className="mt-2 text-xs text-gray-500">
                ID chat grup atau user yang akan menerima notifikasi
              </p>
            </div>

            {/* Test Connection */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleTest}
                disabled={isTesting || !config.botToken || !config.chatId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Test Koneksi</span>
                  </>
                )}
              </button>

              {testResult === 'success' && (
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <Check className="h-5 w-5 mr-1" />
                  Koneksi berhasil!
                </div>
              )}

              {testResult === 'error' && (
                <div className="flex items-center text-red-600 text-sm font-medium">
                  <X className="h-5 w-5 mr-1" />
                  Koneksi gagal
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Jenis Notifikasi
              </h3>
              <div className="space-y-4">
                {/* New Orders */}
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Pesanan Baru</p>
                      <p className="text-sm text-gray-600">Notifikasi setiap ada pesanan masuk</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableNewOrders}
                    onChange={(e) => handleChange('enableNewOrders', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                {/* Low Stock */}
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Stok Rendah</p>
                      <p className="text-sm text-gray-600">Alert ketika stok bahan habis/rendah</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableLowStock}
                    onChange={(e) => handleChange('enableLowStock', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                {/* Payment Confirmation */}
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Konfirmasi Pembayaran</p>
                      <p className="text-sm text-gray-600">Notifikasi pembayaran berhasil</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enablePaymentConfirmation}
                    onChange={(e) => handleChange('enablePaymentConfirmation', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                {/* Daily Report */}
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Laporan Harian</p>
                      <p className="text-sm text-gray-600">Ringkasan penjualan setiap hari (21:00)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableDailyReport}
                    onChange={(e) => handleChange('enableDailyReport', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-200 px-8 py-4">
            <p className="text-sm text-gray-600">
              <span className="text-red-500">*</span> Wajib diisi
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
