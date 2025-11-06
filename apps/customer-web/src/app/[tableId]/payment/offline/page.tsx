'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  CreditCard,
  Banknote,
  ArrowLeft,
  MapPin,
  Clock,
  RefreshCw
} from 'lucide-react'

// Hooks
import apiClient from '@/lib/api/client'
import { useCartStore } from '@/stores/cartStore'

interface OrderData {
  id: string
  order_number: string
  total_amount: number
}

interface PaymentMethodData {
  id: string
  name: string
  type: string
  description: string
  processing_time: string
}

export default function OfflinePaymentPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { clearCart } = useCartStore()

  const tableId = params.tableId as string
  const orderId = searchParams.get('order_id')
  const method = searchParams.get('method')

  // State
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    console.log('Offline payment page - orderId:', orderId, 'method:', method)

    if (!orderId || !method) {
      console.log('Missing parameters - orderId:', orderId, 'method:', method)
      toast.error('Parameter tidak valid')
      router.push(`/${tableId}/payment`)
      return
    }

    console.log('Loading data and starting status checking...')
    loadData()
    // Start checking payment status every 5 seconds
    startStatusChecking()
    // Update payment method in database
    updatePaymentMethodInDatabase()

    // Cleanup on unmount
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current)
      }
    }
  }, [orderId, method])

  const loadData = async () => {
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

      // Set order data with fallback values
      setOrderData({
        id: orderId!,
        order_number: orderNumber,
        total_amount: totalAmount
      })

      // Load payment method from localStorage
      const savedMethod = localStorage.getItem('payment-method')
      if (savedMethod) {
        setPaymentMethod(JSON.parse(savedMethod))
      }

    } catch (error: any) {
      console.error('Error loading data:', error)
      // Don't redirect on error, just use fallback data
      const orderNumber = orderId!.slice(-8).toUpperCase()
      setOrderData({
        id: orderId!,
        order_number: orderNumber,
        total_amount: 50000 // Fallback amount
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startStatusChecking = () => {
    // Check status immediately
    checkPaymentStatus()

    // Then check every 5 seconds
    statusCheckInterval.current = setInterval(() => {
      checkPaymentStatus()
    }, 5000)
  }

  const checkPaymentStatus = async () => {
    if (!orderId) return

    try {
      setIsCheckingStatus(true)
      console.log('Checking payment status for order:', orderId)
      console.log('Order ID type:', typeof orderId)
      console.log('Order ID length:', orderId.length)

      // Check payment status using API endpoint (with service role key)
      const response = await fetch(`/api/orders/${orderId}/payment-status`)
      const result = await response.json()

      console.log('Payment status API response:', { response: response.status, result })

      if (!response.ok) {
        console.error('Error from payment status API:', result)
        return
      }

      const order = result.data

      if (!order) {
        // Order not found - this is common for demo/development scenarios
        // Don't redirect, just log and continue checking
        console.log('Order not found in database, continuing with local data')
        return
      }

      console.log('Order payment_status:', order.payment_status, 'status:', order.status)

      if (order && order.payment_status === 'verified') {
        // Payment has been verified by cashier
        console.log('Payment verified! Redirecting to thank you page...')
        clearCart()
        toast.success('Pembayaran telah dikonfirmasi oleh kasir!')

        // Stop checking
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current)
        }

        // Navigate to thank you page
        router.push(`/${tableId}/thank-you?order_id=${orderId}`)
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  // Update payment method in database
  const updatePaymentMethodInDatabase = async () => {
    if (!orderId || !method) return

    try {
      console.log('Updating payment method in database:', method)

      const response = await fetch(`/api/orders/${orderId}/update-payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: method
        })
      })

      const result = await response.json()

      if (response.ok) {
        console.log('Payment method updated successfully:', result)
      } else {
        console.error('Failed to update payment method:', result)
      }
    } catch (error) {
      console.error('Error updating payment method in database:', error)
    }
  }

  const getPaymentIcon = () => {
    if (method === 'cash') {
      return <Banknote className="h-8 w-8" />
    } else if (method === 'card') {
      return <CreditCard className="h-8 w-8" />
    }
    // Default icon untuk offline payment
    return <MapPin className="h-8 w-8" />
  }

  const getInstructions = () => {
    if (method === 'cash') {
      return {
        title: 'Pembayaran Tunai',
        steps: [
          'Tunjukkan pesanan ini kepada kasir',
          'Bayar sesuai total yang tertera',
          'Kasir akan memberikan struk pembayaran',
          'Tunggu pesanan Anda diproses'
        ]
      }
    } else if (method === 'card') {
      return {
        title: 'Pembayaran Kartu',
        steps: [
          'Bawa kartu debit/kredit ke kasir',
          'Kasir akan memproses pembayaran',
          'Masukkan PIN atau tandatangan jika diperlukan',
          'Simpan struk pembayaran'
        ]
      }
    }

    // Default untuk metode yang tidak jelas
    return {
      title: 'Pembayaran Offline',
      steps: [
        'Tunjukkan pesanan ini kepada kasir',
        'Bayar dengan metode yang tersedia (tunai/kartu)',
        'Kasir akan memproses pembayaran Anda',
        'Simpan struk pembayaran sebagai bukti',
        'Tunggu pesanan Anda diproses'
      ]
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Clock className="h-16 w-16 text-gray-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Memuat Data
          </h2>
          <p className="text-gray-600">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CreditCard className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Data Pesanan Tidak Ditemukan
          </h2>
          <p className="text-gray-600 mb-6">
            Maaf, kami tidak dapat menemukan informasi pesanan Anda
          </p>
          <button
            onClick={() => router.push(`/${tableId}/payment`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Kembali ke Pembayaran
          </button>
        </div>
      </div>
    )
  }

  const instructions = getInstructions()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {instructions.title}
            </h1>
            <p className="text-sm text-gray-600">
              #{orderData.order_number}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Payment Method Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="p-4 bg-blue-100 rounded-full text-blue-600 w-fit mx-auto mb-4">
            {getPaymentIcon()}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {paymentMethod?.name || instructions.title}
          </h2>
          {method && (
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mb-2">
              {method === 'cash' ? '💰 Tunai' : method === 'card' ? '💳 Kartu' : `📱 ${method.toUpperCase()}`}
            </div>
          )}
          <p className="text-2xl font-bold text-blue-600 mb-2">
            Rp {orderData?.total_amount?.toLocaleString('id-ID') || '0'}
          </p>
          <p className="text-sm text-gray-600">
            Total yang harus dibayar
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Langkah Pembayaran:
          </h3>
          <ol className="space-y-3">
            {instructions.steps.map((step, index) => (
              <li key={index} className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <p className="text-gray-700">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* Location Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">
                Lokasi Kasir
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                Silakan menuju ke kasir yang terletak di dekat pintu masuk untuk menyelesaikan pembayaran.
              </p>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <RefreshCw className={`h-5 w-5 text-blue-600 ${isCheckingStatus ? 'animate-spin' : ''}`} />
            <span className="font-medium text-blue-800">
              Menunggu Konfirmasi Kasir
            </span>
          </div>
          <p className="text-sm text-blue-700">
            Sistem sedang memantau status pembayaran Anda. Halaman akan otomatis berpindah setelah kasir mengkonfirmasi pembayaran.
          </p>
        </div>


        {/* Footer Info */}
        <div className="text-center text-sm text-gray-600">
          <p>
            Setelah pembayaran selesai, pesanan akan langsung diproses.
          </p>
          <p className="mt-1">
            Estimasi waktu penyajian: {paymentMethod?.processing_time || '15-20 menit'}
          </p>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-8"></div>
    </div>
  )
}