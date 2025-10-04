'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  Save,
  Loader2,
  CheckCircle,
  Package,
  Calendar,
  Info,
  TrendingDown
} from 'lucide-react'

interface InventoryAlerts {
  expiry_warning_days: number
  low_stock_percentage: number
}

export default function InventoryAlertsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [settingId, setSettingId] = useState('')
  const [alerts, setAlerts] = useState<InventoryAlerts>({
    expiry_warning_days: 7,
    low_stock_percentage: 20
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings?category=inventory&key=alerts')
      const { data } = await response.json()

      if (data && data.length > 0) {
        const inventorySetting = data[0]
        setSettingId(inventorySetting.id)
        const alertsData = inventorySetting.value
        setAlerts({
          expiry_warning_days: alertsData.expiry_warning_days || 7,
          low_stock_percentage: alertsData.low_stock_percentage || 20
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (settingId) {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: settingId,
            value: {
              expiry_warning_days: alerts.expiry_warning_days,
              low_stock_percentage: alerts.low_stock_percentage
            }
          })
        })
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving inventory alerts:', error)
      alert('Gagal menyimpan data. Silakan coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
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
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Peringatan Inventory</h1>
                  <p className="text-sm text-gray-600">Konfigurasi alert untuk stock dan expiry</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">
                    Tentang Peringatan Inventory
                  </h3>
                  <p className="text-sm text-blue-700">
                    Sistem akan memberikan notifikasi otomatis ketika stock mendekati habis atau bahan
                    mendekati tanggal kadaluarsa berdasarkan pengaturan ini.
                  </p>
                </div>
              </div>
            </div>

            {/* Expiry Warning */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-red-600" />
                Peringatan Kadaluarsa
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peringatan Kadaluarsa (hari) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  step="1"
                  value={alerts.expiry_warning_days}
                  onChange={(e) => setAlerts({ ...alerts, expiry_warning_days: parseInt(e.target.value) || 7 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="7"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Sistem akan memberi peringatan <strong>{alerts.expiry_warning_days} hari</strong> sebelum tanggal kadaluarsa
                </p>

                {/* Examples */}
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-900 font-medium mb-2">Contoh Peringatan:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Hari ini: 10 Januari 2025</li>
                    <li>• Kadaluarsa: 17 Januari 2025</li>
                    <li>• Sisa: {alerts.expiry_warning_days} hari</li>
                    <li>• Status: 🔔 <strong>Peringatan aktif!</strong></li>
                  </ul>
                </div>

                {/* Preset Options */}
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                  {[3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setAlerts({ ...alerts, expiry_warning_days: days })}
                      className={`p-2 rounded-lg border transition-all ${
                        alerts.expiry_warning_days === days
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {days} hari
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Low Stock Percentage */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingDown className="h-5 w-5 mr-2 text-orange-600" />
                Peringatan Stock Rendah
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Threshold Stock Rendah (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="50"
                    step="5"
                    value={alerts.low_stock_percentage}
                    onChange={(e) => setAlerts({ ...alerts, low_stock_percentage: parseInt(e.target.value) || 20 })}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="20"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Peringatan muncul ketika stock tersisa ≤ <strong>{alerts.low_stock_percentage}%</strong> dari stock maksimal
                </p>

                {/* Example Calculation */}
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-900 font-medium mb-3">Contoh Perhitungan:</p>

                  <div className="space-y-3">
                    {/* Example 1 */}
                    <div className="bg-white p-3 rounded border border-orange-200">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-700">Stock Maksimal:</span>
                        <span className="font-medium text-gray-900">100 unit</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-700">Threshold ({alerts.low_stock_percentage}%):</span>
                        <span className="font-medium text-orange-600">{alerts.low_stock_percentage} unit</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          ⚠️ Peringatan muncul saat stock ≤ {alerts.low_stock_percentage} unit
                        </p>
                      </div>
                    </div>

                    {/* Visual Bar */}
                    <div className="space-y-2">
                      <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
                          style={{ width: `${alerts.low_stock_percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>0%</span>
                        <span className="font-medium text-orange-600">{alerts.low_stock_percentage}% (Alert)</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preset Options */}
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                  {[10, 20, 30, 40].map((percentage) => (
                    <button
                      key={percentage}
                      onClick={() => setAlerts({ ...alerts, low_stock_percentage: percentage })}
                      className={`p-2 rounded-lg border transition-all ${
                        alerts.low_stock_percentage === percentage
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-8 py-4">
            <p className="text-sm text-gray-600">
              <span className="text-red-500">*</span> Wajib diisi
            </p>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">💡 Rekomendasi Pengaturan</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Kadaluarsa:</strong> 7 hari untuk bahan segar, 14-30 hari untuk bahan kering</li>
            <li>• <strong>Stock rendah:</strong> 20% cocok untuk bahan yang sering dipakai, 30-40% untuk yang jarang</li>
            <li>• Pengaturan lebih ketat = lebih sering dapat notifikasi = lebih aman</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
