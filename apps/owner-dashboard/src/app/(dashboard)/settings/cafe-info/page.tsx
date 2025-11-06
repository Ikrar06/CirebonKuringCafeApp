'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  Save,
  Loader2,
  CheckCircle
} from 'lucide-react'

interface CafeInfo {
  name: string
  address: string
  phone: string
  email: string
  openingTime: string
  closingTime: string
  description: string
  instagram?: string
  whatsapp?: string
}

export default function CafeInfoPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [settingIds, setSettingIds] = useState({ info: '', hours: '' })
  const [cafeInfo, setCafeInfo] = useState<CafeInfo>({
    name: '',
    address: '',
    phone: '',
    email: '',
    openingTime: '08:00',
    closingTime: '22:00',
    description: '',
    instagram: '',
    whatsapp: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings?category=cafe')
      const { data } = await response.json()

      if (data) {
        const infoSetting = data.find((s: any) => s.key === 'info')
        const hoursSetting = data.find((s: any) => s.key === 'operating_hours')

        if (infoSetting) {
          const info = infoSetting.value
          setSettingIds(prev => ({ ...prev, info: infoSetting.id }))
          setCafeInfo(prev => ({
            ...prev,
            name: info.name || '',
            address: info.address || '',
            phone: info.phone || '',
            email: info.email || ''
          }))
        }

        if (hoursSetting) {
          const hours = hoursSetting.value
          setSettingIds(prev => ({ ...prev, hours: hoursSetting.id }))
          // Assuming monday hours for simplicity
          if (hours.monday) {
            setCafeInfo(prev => ({
              ...prev,
              openingTime: hours.monday.open || '08:00',
              closingTime: hours.monday.close || '22:00'
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof CafeInfo, value: string) => {
    setCafeInfo(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save cafe info
      if (settingIds.info) {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: settingIds.info,
            value: {
              name: cafeInfo.name,
              email: cafeInfo.email,
              phone: cafeInfo.phone,
              address: cafeInfo.address
            }
          })
        })
      }

      // Save operating hours
      if (settingIds.hours) {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: settingIds.hours,
            value: {
              monday: { open: cafeInfo.openingTime, close: cafeInfo.closingTime },
              tuesday: { open: cafeInfo.openingTime, close: cafeInfo.closingTime },
              wednesday: { open: cafeInfo.openingTime, close: cafeInfo.closingTime },
              thursday: { open: cafeInfo.openingTime, close: cafeInfo.closingTime },
              friday: { open: cafeInfo.openingTime, close: cafeInfo.closingTime },
              saturday: { open: cafeInfo.openingTime, close: cafeInfo.closingTime },
              sunday: { open: cafeInfo.openingTime, close: cafeInfo.closingTime }
            }
          })
        })
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving cafe info:', error)
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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Informasi Cafe</h1>
                  <p className="text-sm text-gray-600">Kelola informasi dan kontak cafe</p>
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
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Store className="h-5 w-5 mr-2 text-blue-600" />
                Informasi Dasar
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Cafe *
                  </label>
                  <input
                    type="text"
                    value={cafeInfo.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                    placeholder="Masukkan nama cafe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    value={cafeInfo.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                    placeholder="Deskripsi singkat tentang cafe"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Contact Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-green-600" />
                Informasi Kontak
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor Telepon *
                  </label>
                  <input
                    type="tel"
                    value={cafeInfo.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                    placeholder="+62 xxx xxxx xxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={cafeInfo.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                    placeholder="email@cafe.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={cafeInfo.whatsapp || ''}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                    placeholder="+62 xxx xxxx xxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={cafeInfo.instagram || ''}
                    onChange={(e) => handleChange('instagram', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Location */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-red-600" />
                Lokasi
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alamat Lengkap *
                </label>
                <textarea
                  value={cafeInfo.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                  placeholder="Jl. ..., Kecamatan, Kota, Provinsi"
                />
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Operating Hours */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-purple-600" />
                Jam Operasional
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jam Buka *
                  </label>
                  <input
                    type="time"
                    value={cafeInfo.openingTime}
                    onChange={(e) => handleChange('openingTime', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jam Tutup *
                  </label>
                  <input
                    type="time"
                    value={cafeInfo.closingTime}
                    onChange={(e) => handleChange('closingTime', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                ℹ️ Cafe buka dari <strong>{cafeInfo.openingTime}</strong> hingga <strong>{cafeInfo.closingTime}</strong> setiap hari
              </p>
            </div>
          </div>

          {/* Footer */}
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
