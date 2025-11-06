'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Clock,
  Save,
  Loader2,
  CheckCircle,
  MapPin,
  Coffee,
  AlertCircle,
  Info
} from 'lucide-react'

interface AttendanceRules {
  max_distance: number
  break_duration: number
  late_tolerance: number
}

export default function AttendanceRulesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [settingId, setSettingId] = useState('')
  const [rules, setRules] = useState<AttendanceRules>({
    max_distance: 100,
    break_duration: 30,
    late_tolerance: 15
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings?category=attendance&key=rules')
      const { data } = await response.json()

      if (data && data.length > 0) {
        const attendanceSetting = data[0]
        setSettingId(attendanceSetting.id)
        const rulesData = attendanceSetting.value
        setRules({
          max_distance: rulesData.max_distance || 100,
          break_duration: rulesData.break_duration || 30,
          late_tolerance: rulesData.late_tolerance || 15
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
              max_distance: rules.max_distance,
              break_duration: rules.break_duration,
              late_tolerance: rules.late_tolerance
            }
          })
        })
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving attendance rules:', error)
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
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Aturan Absensi</h1>
                  <p className="text-sm text-gray-600">Konfigurasi rules untuk kehadiran karyawan</p>
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
                    Tentang Aturan Absensi
                  </h3>
                  <p className="text-sm text-blue-700">
                    Aturan ini mengontrol validasi kehadiran karyawan, termasuk jarak maksimal dari cafe,
                    durasi istirahat, dan toleransi keterlambatan.
                  </p>
                </div>
              </div>
            </div>

            {/* Distance Rule */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-red-600" />
                Validasi Jarak
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jarak Maksimal dari Cafe (meter) *
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  step="10"
                  value={rules.max_distance}
                  onChange={(e) => setRules({ ...rules, max_distance: parseInt(e.target.value) || 100 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                  placeholder="100"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Karyawan harus berada dalam radius <strong>{rules.max_distance} meter</strong> dari lokasi cafe untuk bisa absen
                </p>

                {/* Visual Indicator */}
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-red-900 mb-1">Status Radius:</p>
                    <p className="text-red-700">
                      {rules.max_distance < 50 && '🔴 Sangat Ketat - Hanya di dalam cafe'}
                      {rules.max_distance >= 50 && rules.max_distance < 100 && '🟡 Ketat - Area cafe dan sekitarnya'}
                      {rules.max_distance >= 100 && rules.max_distance < 200 && '🟢 Normal - Termasuk area parkir'}
                      {rules.max_distance >= 200 && '🔵 Longgar - Area sekitar luas'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Break Duration */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Coffee className="h-5 w-5 mr-2 text-amber-600" />
                Waktu Istirahat
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durasi Istirahat (menit) *
                </label>
                <input
                  type="number"
                  min="15"
                  max="120"
                  step="5"
                  value={rules.break_duration}
                  onChange={(e) => setRules({ ...rules, break_duration: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                  placeholder="30"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Karyawan mendapat waktu istirahat selama <strong>{rules.break_duration} menit</strong> per shift
                </p>

                {/* Examples */}
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className={`p-3 rounded-lg border ${rules.break_duration === 30 ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="font-medium text-gray-900">30 menit</p>
                    <p className="text-xs text-gray-600 mt-1">Standar</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${rules.break_duration === 45 ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="font-medium text-gray-900">45 menit</p>
                    <p className="text-xs text-gray-600 mt-1">Extended</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${rules.break_duration === 60 ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="font-medium text-gray-900">60 menit</p>
                    <p className="text-xs text-gray-600 mt-1">Panjang</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Late Tolerance */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                Toleransi Keterlambatan
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Toleransi Terlambat (menit) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="5"
                  value={rules.late_tolerance}
                  onChange={(e) => setRules({ ...rules, late_tolerance: parseInt(e.target.value) || 15 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                  placeholder="15"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Karyawan masih dianggap tepat waktu jika terlambat maksimal <strong>{rules.late_tolerance} menit</strong>
                </p>

                {/* Example Scenario */}
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-900 font-medium mb-2">Contoh:</p>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Shift mulai: 08:00</li>
                    <li>• Toleransi: {rules.late_tolerance} menit</li>
                    <li>• Clock-in 08:{rules.late_tolerance.toString().padStart(2, '0')} → ✅ Masih tepat waktu</li>
                    <li>• Clock-in 08:{(rules.late_tolerance + 1).toString().padStart(2, '0')} → ❌ Terlambat</li>
                  </ul>
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
            <li>• <strong>Jarak:</strong> 100-150m untuk cafe biasa, 200-300m untuk mall/gedung besar</li>
            <li>• <strong>Istirahat:</strong> 30-45 menit untuk shift 8 jam, 60 menit untuk shift lebih panjang</li>
            <li>• <strong>Toleransi:</strong> 10-15 menit cukup fleksibel tanpa terlalu longgar</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
