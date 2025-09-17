'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Wifi, WifiOff, MapPin, Clock } from 'lucide-react'
import storage from '@/lib/utils/storage'

// Types
interface TableData {
  id: string
  table_number: string
  capacity: string
  status: 'available' | 'occupied' | 'reserved' | 'maintenance'
  qr_code_id: string
  zone?: string
  floor?: string
}

interface TableLayoutProps {
  children: React.ReactNode
}

export default function TableLayout({ children }: TableLayoutProps) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const tableId = params.tableId as string

  // State management
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Validate table ID format
  useEffect(() => {
    if (!tableId) {
      router.replace('/')
      return
    }

    // Basic validation for table ID format (should be UUID or table number)
    const isValidTableId = /^(table-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(tableId)
    
    if (!isValidTableId) {
      toast.error('Kode meja tidak valid')
      router.replace('/')
      return
    }

    fetchTableData()
  }, [tableId, router])

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Koneksi internet tersambung kembali')
      fetchTableData() // Refresh data when back online
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.error('Koneksi internet terputus')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Fetch table data from API
  const fetchTableData = async () => {
    try {
      setIsLoading(true)

      // Import API client
      const { default: apiClient } = await import('@/lib/api/client')

      // Check if tableId is UUID (table ID) or table number
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tableId)

      let response
      if (isUUID) {
        // Get table by ID
        response = await apiClient.getTable(tableId)
      } else {
        // Get table by table number
        response = await apiClient.getTableByNumber(tableId)
      }

      if (response.error) {
        if (response.status === 404) {
          toast.error('Meja tidak ditemukan')
          router.replace('/')
          return
        }
        throw new Error('Gagal memuat data meja')
      }

      const data = response.data

      // Validate table status
      if (data.status === 'maintenance') {
        toast.error('Meja sedang dalam perbaikan')
        router.replace('/')
        return
      }

      const tableData: TableData = {
        id: data.id,
        table_number: data.table_number,
        capacity: data.capacity,
        status: data.status,
        qr_code_id: data.qr_code_id,
        zone: data.zone,
        floor: data.floor
      }

      setTableData(tableData)
      setLastUpdated(new Date())

      // Store table info in sessionStorage for persistence
      sessionStorage.setItem('currentTable', JSON.stringify({
        id: data.id,
        table_number: data.table_number,
        capacity: data.capacity,
        zone: data.zone,
        floor: data.floor,
      }))

    } catch (error) {
      console.error('Error fetching table data:', error)
      toast.error('Gagal memuat data meja. Coba lagi.')
      
      // Try to load from sessionStorage as fallback
      const cachedTable = sessionStorage.getItem('currentTable')
      if (cachedTable) {
        try {
          const parsed = JSON.parse(cachedTable)
          if (parsed.id === tableId) {
            setTableData(parsed as TableData)
            toast.info('Menggunakan data tersimpan')
          }
        } catch (e) {
          console.error('Error parsing cached table data:', e)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh table status every 30 seconds
  useEffect(() => {
    if (!tableData || !isOnline) return

    const interval = setInterval(() => {
      fetchTableData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [tableData, isOnline])

  // Clean up old customer data when app loads
  useEffect(() => {
    // Clean up expired cache items and old customer data periodically
    storage.clearExpiredItems()
    storage.clearOldCustomerData()

    // Set up periodic cleanup every 10 minutes
    const cleanupInterval = setInterval(() => {
      storage.clearExpiredItems()
      storage.clearOldCustomerData()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(cleanupInterval)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Memuat Menu
          </h2>
          <p className="text-sm text-gray-600">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    )
  }

  // Error state - table not found
  if (!tableData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Meja Tidak Ditemukan
          </h2>
          <p className="text-gray-600 mb-6">
            Kode QR meja tidak valid atau meja sedang tidak tersedia.
          </p>
          <button
            onClick={() => router.replace('/')}
            className="
              bg-blue-600 
              text-white 
              px-6 
              py-3 
              rounded-lg 
              font-medium 
              hover:bg-blue-700 
              transition-colors
            "
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Table Header Info */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Table Information */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Meja {tableData.table_number}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>Kapasitas {tableData.capacity} orang</span>
                  {(tableData.zone || tableData.floor) && (
                    <>
                      <span>•</span>
                      <span>{`${tableData.zone || ''} ${tableData.floor || ''}`.trim()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-2">
              {/* Network Status */}
              <div className={`flex items-center space-x-1 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                <span className="text-xs font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Last Updated Info */}
          <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>
              Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Mode offline - beberapa fitur mungkin tidak tersedia
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pb-20"> {/* Extra padding for fixed bottom navigation */}
        {children}
      </main>

      {/* Fixed Bottom Navigation/Cart Summary - Hide on checkout and payment pages */}
      {!pathname.includes('/checkout') && !pathname.includes('/payment') && (
        <div
          id="table-footer"
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Meja {tableData.table_number}</span>
              <span className="mx-2">•</span>
              <span>{new Date().toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}</span>
            </div>

            <div className="text-sm text-gray-500">
              Gulir ke bawah untuk melihat menu
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Prompt (will be enhanced later) */}
      {typeof window !== 'undefined' && window.matchMedia('(display-mode: browser)').matches && (
        <div 
          id="pwa-install-prompt"
          className="hidden fixed bottom-20 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-20"
        >
          <p className="text-sm mb-2">
            Install aplikasi untuk pengalaman yang lebih baik!
          </p>
          <div className="flex space-x-2">
            <button className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium">
              Install
            </button>
            <button className="text-blue-100 px-3 py-1 rounded text-sm">
              Nanti
            </button>
          </div>
        </div>
      )}
    </div>
  )
}