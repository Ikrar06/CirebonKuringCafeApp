'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Save,
  Loader2,
  CheckCircle,
  Map,
  Radar,
  Info
} from 'lucide-react'

interface LocationData {
  lat: number
  lng: number
  radius: number
}

export default function LocationSettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [settingId, setSettingId] = useState('')
  const [locationData, setLocationData] = useState<LocationData>({
    lat: -6.9175,
    lng: 107.6191,
    radius: 100
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings?category=cafe&key=location')
      const { data } = await response.json()

      if (data && data.length > 0) {
        const locationSetting = data[0]
        setSettingId(locationSetting.id)
        const location = locationSetting.value
        setLocationData({
          lat: location.lat || -6.9175,
          lng: location.lng || 107.6191,
          radius: location.radius || 100
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser Anda')
      return
    }

    setIsGettingLocation(true)

    // Try with low accuracy first (faster, uses WiFi/IP)
    const lowAccuracyOptions = {
      enableHighAccuracy: false, // Use network-based location (faster)
      timeout: 15000, // 15 seconds timeout
      maximumAge: 300000 // Accept cached location up to 5 minutes old
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location obtained:', position.coords)
        setLocationData(prev => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }))
        setIsGettingLocation(false)

        // Show success message
        const accuracy = Math.round(position.coords.accuracy)
        alert(`✅ Lokasi berhasil didapatkan!\n\nAkurasi: ±${accuracy} meter\n\nJika akurasi kurang baik, Anda bisa input koordinat manual dari Google Maps.`)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsGettingLocation(false)

        // Provide specific error messages
        let errorMessage = ''
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '❌ Akses lokasi ditolak.\n\nSilakan:\n1. Refresh halaman\n2. Klik "Allow" saat diminta akses lokasi\n3. Atau cek pengaturan browser Anda'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '❌ Informasi lokasi tidak tersedia.\n\nGunakan input manual:\n1. Buka Google Maps\n2. Klik kanan di lokasi cafe\n3. Copy koordinat yang muncul'
            break
          case error.TIMEOUT:
            errorMessage = '⏱️ Timeout - Lokasi GPS memakan waktu terlalu lama.\n\nSolusi:\n1. Pastikan GPS device Anda aktif\n2. Coba lagi di luar ruangan\n3. Atau gunakan input manual dari Google Maps'
            break
          default:
            errorMessage = '❌ Terjadi kesalahan.\n\nGunakan input manual dari Google Maps.'
        }
        alert(errorMessage)
      },
      lowAccuracyOptions
    )
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
              lat: locationData.lat,
              lng: locationData.lng,
              radius: locationData.radius
            }
          })
        })
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving location:', error)
      alert('Gagal menyimpan data. Silakan coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${locationData.lat},${locationData.lng}`
    window.open(url, '_blank')
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
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Lokasi Cafe</h1>
                  <p className="text-sm text-gray-600">Atur koordinat GPS untuk validasi absensi</p>
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
                    Tentang Lokasi GPS
                  </h3>
                  <p className="text-sm text-blue-700">
                    Koordinat GPS ini digunakan untuk memvalidasi kehadiran karyawan.
                    Karyawan hanya bisa absen jika berada dalam radius yang ditentukan dari lokasi cafe.
                  </p>
                </div>
              </div>
            </div>

            {/* Coordinates Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Navigation className="h-5 w-5 mr-2 text-green-600" />
                Koordinat GPS
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={locationData.lat}
                    onChange={(e) => setLocationData({ ...locationData, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-gray-600"
                    placeholder="-6.917464"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={locationData.lng}
                    onChange={(e) => setLocationData({ ...locationData, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-gray-600"
                    placeholder="107.619123"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Mendapatkan...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" />
                      <span>Gunakan Lokasi Saya</span>
                    </>
                  )}
                </button>

                <button
                  onClick={openInGoogleMaps}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center space-x-2 transition-all"
                >
                  <Map className="h-4 w-4" />
                  <span>Buka di Google Maps</span>
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Radius Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Radar className="h-5 w-5 mr-2 text-purple-600" />
                Radius Validasi
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Radius (meter) *
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  step="10"
                  value={locationData.radius}
                  onChange={(e) => setLocationData({ ...locationData, radius: parseInt(e.target.value) || 100 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                  placeholder="100"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Karyawan hanya bisa absen jika berada dalam radius <strong>{locationData.radius} meter</strong> dari lokasi cafe
                </p>
              </div>

              {/* Radius Visualization */}
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-purple-900">Estimasi Jangkauan:</p>
                    <p className="text-purple-700 mt-1">
                      {locationData.radius < 50 && '🔴 Sangat Dekat (dalam gedung)'}
                      {locationData.radius >= 50 && locationData.radius < 100 && '🟡 Dekat (area parkir)'}
                      {locationData.radius >= 100 && locationData.radius < 200 && '🟢 Sedang (sekitar cafe)'}
                      {locationData.radius >= 200 && '🔵 Luas (area sekitar luas)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Location Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Lokasi Saat Ini:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Latitude:</span>
                  <p className="font-mono font-medium text-gray-900">{locationData.lat.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Longitude:</span>
                  <p className="font-mono font-medium text-gray-900">{locationData.lng.toFixed(6)}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-600">Radius:</span>
                  <p className="font-medium text-gray-900">{locationData.radius} meter</p>
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
          <h3 className="text-sm font-medium text-yellow-900 mb-2">💡 Tips Pengaturan Lokasi</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Gunakan tombol "Gunakan Lokasi Saya" saat berada di cafe untuk akurasi maksimal</li>
            <li>• Radius yang disarankan: 50-150 meter untuk cafe biasa</li>
            <li>• Jika cafe di dalam mall/gedung besar, gunakan radius lebih besar (200-300 meter)</li>
            <li>• Verifikasi lokasi dengan membuka Google Maps untuk memastikan koordinat tepat</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
