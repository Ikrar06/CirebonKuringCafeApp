'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Printer,
  Save,
  Loader2,
  CheckCircle,
  Plus,
  Trash2,
  Coffee,
  UtensilsCrossed
} from 'lucide-react'

interface PrinterConfig {
  id: string
  name: string
  type: 'kitchen' | 'bar' | 'receipt'
  ipAddress: string
  port: string
  enabled: boolean
}

export default function PrintersPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [printers, setPrinters] = useState<PrinterConfig[]>([
    {
      id: '1',
      name: 'Printer Kitchen',
      type: 'kitchen',
      ipAddress: '192.168.1.100',
      port: '9100',
      enabled: true
    },
    {
      id: '2',
      name: 'Printer Bar',
      type: 'bar',
      ipAddress: '192.168.1.101',
      port: '9100',
      enabled: true
    },
    {
      id: '3',
      name: 'Printer Receipt - Kasir',
      type: 'receipt',
      ipAddress: '192.168.1.102',
      port: '9100',
      enabled: false
    }
  ])

  const handleAdd = () => {
    const newPrinter: PrinterConfig = {
      id: Date.now().toString(),
      name: 'Printer Baru',
      type: 'kitchen',
      ipAddress: '',
      port: '9100',
      enabled: false
    }
    setPrinters(prev => [...prev, newPrinter])
  }

  const handleRemove = (id: string) => {
    if (confirm('Hapus printer ini?')) {
      setPrinters(prev => prev.filter(p => p.id !== id))
    }
  }

  const handleChange = (id: string, field: keyof PrinterConfig, value: any) => {
    setPrinters(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Save to database
      await new Promise(resolve => setTimeout(resolve, 1500))

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving printers:', error)
      alert('Gagal menyimpan konfigurasi')
    } finally {
      setIsSaving(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'kitchen':
        return UtensilsCrossed
      case 'bar':
        return Coffee
      default:
        return Printer
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'kitchen':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'bar':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'receipt':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
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
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Printer className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Konfigurasi Printer</h1>
                  <p className="text-sm text-gray-600">Setup printer untuk kitchen, bar, dan receipt</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah</span>
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center space-x-2 disabled:opacity-50 shadow-sm transition-all"
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
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Tentang Printer Network</h3>
          <p className="text-sm text-blue-700">
            Printer harus terhubung ke jaringan yang sama. Pastikan IP address benar dan port 9100 terbuka untuk thermal printer.
          </p>
        </div>

        <div className="space-y-6">
          {printers.map((printer) => {
            const TypeIcon = getTypeIcon(printer.type)

            return (
              <div
                key={printer.id}
                className={`bg-white border-2 rounded-xl p-6 ${
                  printer.enabled ? 'border-orange-200' : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      printer.enabled ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      <TypeIcon className={`h-7 w-7 ${printer.enabled ? 'text-orange-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={printer.name}
                        onChange={(e) => handleChange(printer.id, 'name', e.target.value)}
                        className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-orange-500 rounded px-2 -ml-2"
                      />
                      <div className="flex items-center space-x-2 mt-1">
                        <select
                          value={printer.type}
                          onChange={(e) => handleChange(printer.id, 'type', e.target.value)}
                          className={`text-xs font-medium border rounded-full px-2 py-0.5 ${getTypeColor(printer.type)}`}
                        >
                          <option value="kitchen">KITCHEN</option>
                          <option value="bar">BAR</option>
                          <option value="receipt">RECEIPT</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printer.enabled}
                        onChange={(e) => handleChange(printer.id, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>

                    <button
                      onClick={() => handleRemove(printer.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus printer"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Configuration */}
                {printer.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IP Address *
                      </label>
                      <input
                        type="text"
                        value={printer.ipAddress}
                        onChange={(e) => handleChange(printer.id, 'ipAddress', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm text-gray-600"
                        placeholder="192.168.1.100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Port *
                      </label>
                      <input
                        type="text"
                        value={printer.port}
                        onChange={(e) => handleChange(printer.id, 'port', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm text-gray-600"
                        placeholder="9100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {printers.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <Printer className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada printer</h3>
              <p className="text-gray-600 mb-6">Tambahkan printer untuk mulai cetak order</p>
              <button
                onClick={handleAdd}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Tambah Printer</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        {printers.length > 0 && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-900 mb-3">Cara Kerja:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="font-bold text-orange-600 mr-2">•</span>
                <span><strong>Kitchen Printer:</strong> Mencetak pesanan makanan ke dapur</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-orange-600 mr-2">•</span>
                <span><strong>Bar Printer:</strong> Mencetak pesanan minuman ke bar</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-orange-600 mr-2">•</span>
                <span><strong>Receipt Printer:</strong> Mencetak struk pembayaran untuk customer</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
