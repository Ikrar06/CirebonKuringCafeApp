'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle,
  Clock,
  MapPin,
  Receipt,
  Star,
  Home,
  MessageSquare
} from 'lucide-react'

// Hooks
import useTable from '@/hooks/useTable'
import apiClient from '@/lib/api/client'
import storage from '@/lib/utils/storage'
import { useCartStore } from '@/stores/cartStore'

interface OrderInfo {
  id: string
  orderNumber: string
  customerName: string
  tableNumber: string
  totalAmount: number
  estimatedTime: string
  status: string
}

export default function ThankYouPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableId = params.tableId as string
  const orderId = searchParams.get('order_id')

  // Hooks
  const { table } = useTable()
  const { clearCart, removePromo } = useCartStore()

  // State
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!orderId) {
      toast.error('ID pesanan tidak valid')
      router.push(`/${tableId}`)
      return
    }

    loadOrderInfo()
  }, [orderId, tableId, router])

  const loadOrderInfo = async () => {
    try {
      setIsLoading(true)

      const orderResponse = await apiClient.getOrder(orderId!)

      if (orderResponse.error || !orderResponse.data) {
        throw new Error('Order not found')
      }

      // The API response has nested structure: { data: { data: actualOrderData } }
      const order = orderResponse.data.data || orderResponse.data
      const orderNumber = orderId!.slice(-8).toUpperCase()


      setOrderInfo({
        id: order.id,
        orderNumber,
        customerName: order.customer_name || 'Customer',
        tableNumber: order.tables?.table_number || table?.table_number || tableId,
        totalAmount: order.total_amount || 0,
        estimatedTime: order.created_at ?
          new Date(new Date(order.created_at).getTime() + 30 * 60 * 1000).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          }) : '30 menit',
        status: order.status || 'pending'
      })

      // Clear customer session data since payment is completed successfully
      storage.clearSessionData(tableId)

      // Clear cart and promo data
      clearCart()
      removePromo()

    } catch (error: any) {
      console.error('Error loading order info:', error)
      toast.error(error.message || 'Gagal memuat informasi pesanan')
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

  const handleRateOrder = () => {
    router.push(`/${tableId}/rating?order_id=${orderId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Memuat Informasi
          </h2>
          <p className="text-sm text-gray-600">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    )
  }

  if (!orderInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Receipt className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Pesanan Tidak Ditemukan
          </h2>
          <p className="text-gray-600 mb-6">
            Maaf, kami tidak dapat menemukan informasi pesanan Anda
          </p>
          <button
            onClick={handleBackToMenu}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Kembali ke Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Header */}
      <div className="bg-gradient-to-b from-green-50 to-white pt-12 pb-8">
        <div className="text-center px-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pesanan Berhasil Dibuat!
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Terima kasih {orderInfo.customerName}, pesanan Anda telah kami terima dan sedang diproses
          </p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Detail Pesanan</span>
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Nomor Pesanan</span>
              <span className="font-medium text-gray-900">#{orderInfo.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nama Pemesan</span>
              <span className="font-medium text-gray-900">{orderInfo.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Meja</span>
              </span>
              <span className="font-medium text-gray-900">{orderInfo.tableNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                orderInfo.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                orderInfo.status === 'completed' ? 'bg-green-100 text-green-800' :
                orderInfo.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                orderInfo.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {orderInfo.status === 'pending_payment' ? 'Menunggu Pembayaran' :
                 orderInfo.status === 'payment_verification' ? 'Verifikasi Pembayaran' :
                 orderInfo.status === 'confirmed' ? 'Dikonfirmasi' :
                 orderInfo.status === 'preparing' ? 'Sedang Diproses' :
                 orderInfo.status === 'ready' ? 'Siap Disajikan' :
                 orderInfo.status === 'completed' ? 'Selesai' : orderInfo.status}
              </span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900">Total Pembayaran</span>
                <span className="text-lg font-bold text-gray-900">
                  Rp {(orderInfo.totalAmount || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">
                Estimasi Waktu Penyajian
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Pesanan Anda akan siap sekitar pukul {orderInfo.estimatedTime}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                * Waktu dapat berubah tergantung kondisi dapur
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Apa yang Terjadi Selanjutnya:
          </h3>
          <ol className="space-y-3">
            <li className="flex items-start space-x-3">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                ✓
              </span>
              <div>
                <p className="text-sm text-gray-900 font-medium">
                  Pembayaran Berhasil
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Pembayaran Anda telah dikonfirmasi dan diterima
                </p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                1
              </span>
              <div>
                <p className="text-sm text-gray-900 font-medium">
                  Pesanan Sedang Diproses
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Tim dapur sedang menyiapkan pesanan Anda dengan hati-hati
                </p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                2
              </span>
              <div>
                <p className="text-sm text-gray-900 font-medium">
                  Lacak Status Pesanan
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Pantau perkembangan pesanan Anda hingga siap disajikan
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Call to Action */}
        <div className="space-y-3">
          <button
            onClick={handleTrackOrder}
            className="w-full py-4 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Clock className="h-5 w-5" />
            <span>Lacak Status Pesanan</span>
          </button>

          <button
            onClick={handleBackToMenu}
            className="w-full py-4 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <Home className="h-5 w-5" />
            <span>Kembali ke Menu</span>
          </button>
        </div>

        {/* Rating Section */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
          <div className="text-center">
            <Star className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Bagaimana pengalaman Anda?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Bantuan dan feedback Anda sangat berarti untuk kami
            </p>
            <button
              onClick={handleRateOrder}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors"
            >
              Berikan Rating
            </button>
          </div>
        </div>

        {/* Support Info */}
        <div className="text-center text-sm text-gray-600">
          <p>
            Ada pertanyaan? Hubungi staf cafe atau
          </p>
          <button className="text-blue-600 hover:text-blue-700 underline mt-1">
            chat dengan customer service
          </button>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-8"></div>
    </div>
  )
}