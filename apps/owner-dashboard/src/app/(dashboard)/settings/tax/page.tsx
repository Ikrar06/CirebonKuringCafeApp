'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Percent,
  Save,
  Loader2,
  CheckCircle,
  Receipt,
  Info
} from 'lucide-react'

interface TaxData {
  ppn: number
  service: number
}

export default function TaxSettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [settingId, setSettingId] = useState('')
  const [taxData, setTaxData] = useState<TaxData>({
    ppn: 11,
    service: 5
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings?category=tax&key=rates')
      const { data } = await response.json()

      if (data && data.length > 0) {
        const taxSetting = data[0]
        setSettingId(taxSetting.id)
        const rates = taxSetting.value
        setTaxData({
          ppn: rates.ppn || 11,
          service: rates.service || 5
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
              ppn: taxData.ppn,
              service: taxData.service
            }
          })
        })
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving tax settings:', error)
      alert('Gagal menyimpan data. Silakan coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate example
  const exampleSubtotal = 100000
  const examplePPN = (exampleSubtotal * taxData.ppn) / 100
  const exampleService = (exampleSubtotal * taxData.service) / 100
  const exampleTotal = exampleSubtotal + examplePPN + exampleService

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
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Percent className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Pajak & Service Charge</h1>
                  <p className="text-sm text-gray-600">Atur tarif PPN dan biaya layanan</p>
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
                    Tentang Pajak & Service Charge
                  </h3>
                  <p className="text-sm text-blue-700">
                    Tarif ini akan otomatis ditambahkan ke setiap transaksi.
                    PPN dan service charge akan dihitung dari subtotal pesanan.
                  </p>
                </div>
              </div>
            </div>

            {/* Tax Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Receipt className="h-5 w-5 mr-2 text-orange-600" />
                Tarif Pajak & Biaya
              </h2>

              <div className="space-y-5">
                {/* PPN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PPN (Pajak Pertambahan Nilai) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxData.ppn}
                      onChange={(e) => setTaxData({ ...taxData, ppn: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                      placeholder="11"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      %
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Tarif PPN standar di Indonesia adalah 11%
                  </p>
                </div>

                {/* Service Charge */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Charge (Biaya Layanan) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxData.service}
                      onChange={(e) => setTaxData({ ...taxData, service: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-600"
                      placeholder="5"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      %
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Biaya layanan umumnya berkisar 5-10%
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Example Calculation */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Contoh Perhitungan
              </h2>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    Rp {exampleSubtotal.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PPN ({taxData.ppn}%)</span>
                  <span className="font-medium text-gray-900">
                    Rp {examplePPN.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Charge ({taxData.service}%)</span>
                  <span className="font-medium text-gray-900">
                    Rp {exampleService.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-blue-600 text-lg">
                      Rp {exampleTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                💡 Total biaya tambahan: {(taxData.ppn + taxData.service).toFixed(1)}% dari subtotal
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
