'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  Clock,
  Store,
  Receipt,
  User,
  CreditCard
} from 'lucide-react'

// Hooks
import useTable from '@/hooks/useTable'
import { useCartStore } from '@/stores/cartStore'
import apiClient from '@/lib/api/client'
import storage from '@/lib/utils/storage'

interface PaymentInstructions {
  method: 'cash' | 'card'
  orderNumber: string
  totalAmount: number
  instructions: string[]
  estimatedTime: string
}

export default function CashPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableId = params.tableId as string
  const orderId = searchParams.get('order_id')
  const method = searchParams.get('method') as 'cash' | 'card'

  // Hooks
  const { table, isValidSession } = useTable()
  const { clearCart } = useCartStore()

  // State
  const [paymentInfo, setPaymentInfo] = useState<PaymentInstructions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaid, setIsPaid] = useState(false)

  useEffect(() => {
    if (!orderId || !method) {
      toast.error('Data pembayaran tidak valid')
      router.push(`/${tableId}`)
      return
    }

    if (!isValidSession) {
      toast.error('Sesi tidak valid')
      router.push(`/${tableId}`)
      return
    }

    loadPaymentInfo()
  }, [orderId, method, isValidSession, tableId, router])

  const loadPaymentInfo = async () => {
    try {
      setIsLoading(true)

      // Get order data from localStorage (saved during payment creation)
      let orderData = null
      let totalAmount = 0

      // Try to get data from localStorage first
      const storedOrderData = localStorage.getItem('current-order-data')
      if (storedOrderData) {
        try {
          orderData = JSON.parse(storedOrderData)
          totalAmount = orderData.total_amount || 0
        } catch (e) {
          console.error('Error parsing stored order data:', e)
        }
      }

      // If no stored data, try to get from API
      if (!orderData && orderId) {
        try {
          const orderResponse = await apiClient.getOrder(orderId)
          if (orderResponse.data && !orderResponse.error) {
            const order = orderResponse.data.data || orderResponse.data
            totalAmount = order.total_amount || 0
            orderData = order
          }
        } catch (apiError) {
          console.error('API error, using fallback data:', apiError)
        }
      }

      // Use fallback amount if still no data
      if (totalAmount === 0) {
        // Try to get amount from URL params or use reasonable default
        const storedAmount = sessionStorage.getItem('order-total-amount')
        totalAmount = storedAmount ? parseInt(storedAmount) : 50000 // Fallback amount
      }

      const orderNumber = orderId!.slice(-8).toUpperCase()

      const instructions: PaymentInstructions = {
        method,
        orderNumber,
        totalAmount,
        estimatedTime: '5-10 menit',
        instructions: method === 'cash' ? [
          'Datang ke meja kasir dengan membawa struk pesanan ini',
          `Sebutkan nomor pesanan: ${orderNumber}`,
          'Bayar sesuai dengan total yang tertera',
          'Simpan struk pembayaran sebagai bukti',
          'Pesanan akan diproses setelah pembayaran diterima'
        ] : [
          'Datang ke meja kasir dengan kartu debit/kredit',
          `Sebutkan nomor pesanan: ${orderNumber}`,
          'Gesek atau tap kartu di mesin EDC',
          'Masukkan PIN jika diperlukan',
          'Simpan struk pembayaran sebagai bukti'
        ]
      }

      setPaymentInfo(instructions)

      // Clear cart since order is created
      clearCart()

    } catch (error: any) {
      console.error('Error loading payment info:', error)
      // Don't redirect on error, just use fallback data
      const orderNumber = orderId!.slice(-8).toUpperCase()
      const fallbackInstructions: PaymentInstructions = {
        method,
        orderNumber,
        totalAmount: 50000, // Fallback amount
        estimatedTime: '5-10 menit',
        instructions: method === 'cash' ? [
          'Datang ke meja kasir dengan membawa struk pesanan ini',
          `Sebutkan nomor pesanan: ${orderNumber}`,
          'Bayar sesuai dengan total yang tertera',
          'Simpan struk pembayaran sebagai bukti',
          'Pesanan akan diproses setelah pembayaran diterima'
        ] : [
          'Datang ke meja kasir dengan kartu debit/kredit',
          `Sebutkan nomor pesanan: ${orderNumber}`,
          'Gesek atau tap kartu di mesin EDC',
          'Masukkan PIN jika diperlukan',
          'Simpan struk pembayaran sebagai bukti'
        ]
      }
      setPaymentInfo(fallbackInstructions)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToMenu = () => {
    router.push(`/${tableId}`)
  }

  const handleTrackOrder = () => {
    router.push(`/${tableId}/order-status?order_id=${orderId}`)
  }

  const handlePaymentComplete = () => {
    setIsPaid(true)
    toast.success('Pembayaran berhasil dikonfirmasi!')

    // Clear customer session data since payment is completed
    storage.clearSessionData(tableId)

    setTimeout(() => {
      router.push(`/${tableId}/thank-you?order_id=${orderId}`)
    }, 2000)
  }

  if (isLoading || !paymentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Memuat Pembayaran
          </h2>
          <p className="text-sm text-gray-600">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    )
  }

  if (isPaid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pembayaran Berhasil!
          </h2>
          <p className="text-gray-600 mb-6">
            Pesanan Anda sedang diproses oleh dapur
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackToMenu}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Pembayaran {paymentInfo.method === 'cash' ? 'Tunai' : 'Kartu'}
              </h1>
              <p className="text-sm text-gray-600">
                Order #{paymentInfo.orderNumber} • Meja {table?.table_number}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Payment Method Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              {paymentInfo.method === 'cash' ?
                <Banknote className="h-6 w-6 text-blue-600" /> :
                <CreditCard className="h-6 w-6 text-blue-600" />
              }
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Pembayaran {paymentInfo.method === 'cash' ? 'Tunai' : 'Kartu Debit/Kredit'}
              </h2>
              <p className="text-sm text-gray-600">
                Total: Rp {paymentInfo.totalAmount.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Store className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">
                Langkah-langkah Pembayaran
              </h3>
            </div>
            <ol className="space-y-2">
              {paymentInfo.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start space-x-3 text-sm text-blue-800">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Ringkasan Pesanan</span>
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Nomor Pesanan</span>
              <span className="font-medium text-gray-900">#{paymentInfo.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Meja</span>
              <span className="font-medium text-gray-900">{table?.table_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Metode Pembayaran</span>
              <span className="font-medium text-gray-900">
                {paymentInfo.method === 'cash' ? 'Tunai' : 'Kartu Debit/Kredit'}
              </span>
            </div>
            <div className="border-t pt-2 mt-3">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900">Total Pembayaran</span>
                <span className="text-lg font-bold text-gray-900">
                  Rp {paymentInfo.totalAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-900">
                Estimasi Waktu Pembayaran
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Proses pembayaran di kasir membutuhkan waktu sekitar {paymentInfo.estimatedTime}
              </p>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">
            Hal Penting:
          </h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Simpan screenshot halaman ini sebagai bukti pesanan</li>
            <li>• Pesanan akan mulai diproses setelah pembayaran dikonfirmasi</li>
            <li>• Hubungi staf jika ada kendala dalam proses pembayaran</li>
            <li>• Anda akan menerima notifikasi status pesanan secara otomatis</li>
          </ul>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-3">
        <button
          onClick={handleTrackOrder}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Clock className="h-5 w-5" />
          <span>Lacak Status Pesanan</span>
        </button>

        <button
          onClick={handleBackToMenu}
          className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Kembali ke Menu
        </button>

        <p className="text-xs text-gray-500 text-center">
          Tunjukkan halaman ini kepada kasir untuk memproses pembayaran
        </p>
      </div>

      {/* Bottom padding */}
      <div className="h-40"></div>
    </div>
  )
}