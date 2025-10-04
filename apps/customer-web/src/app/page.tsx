// apps/customer-web/src/app/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Hash, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api/client'

export default function HomePage() {
  const [tableNumber, setTableNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableNumber.trim()) return
    
    setIsLoading(true)
    
    try {
      // First try to get table by number
      const response = await apiClient.getTableByNumber(tableNumber.trim())
      
      if (response.error) {
        if (response.status === 404) {
          toast.error('Nomor meja tidak ditemukan')
        } else {
          toast.error('Gagal mencari meja')
        }
        return
      }
      
      if (response.data) {
        // Redirect to table page using the actual table ID
        router.push(`/${response.data.id}`)
      }
    } catch (error) {
      console.error('Error finding table:', error)
      toast.error('Gagal mencari meja')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Selamat Datang
          </h1>
          <p className="text-gray-600">
            Scan QR code di meja atau masukkan nomor meja
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center mb-6">
            <QrCode className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">
              Mulai Pesan
            </h2>
          </div>
          
          <form onSubmit={handleTableSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Meja
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Masukkan nomor meja (contoh: 1, 2, 3)"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mencari meja...</span>
                </>
              ) : (
                <span>Lihat Menu</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}