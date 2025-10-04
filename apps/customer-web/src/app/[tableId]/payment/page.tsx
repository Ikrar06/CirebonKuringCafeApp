'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { 
  ArrowLeft,
  CreditCard,
  Smartphone,
  Banknote,
  University,
  Check,
  Clock,
  AlertCircle,
  Shield,
  Info,
  QrCode,
  FileImage
} from 'lucide-react'

// Hooks and API
import useTable from '@/hooks/useTable'
import { useCartStore } from '@/stores/cartStore'
import apiClient from '@/lib/api/client'

// Types
interface PaymentMethod {
  id: string
  name: string
  type: 'cash' | 'card' | 'qris' | 'transfer'
  description: string
  icon: React.ReactNode
  processing_time: string
  fee?: number
  fee_description?: string
  is_available: boolean
  instructions?: string[]
  min_amount?: number
  max_amount?: number
}

interface OrderData {
  id: string
  order_number?: string
  table_id: string
  customer_name: string
  customer_phone?: string
  customer_notes?: string
  status: 'pending_payment' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  total_amount: number
  subtotal?: number
  tax_amount?: number
  service_charge?: number
  discount_amount?: number
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method?: 'cash' | 'card' | 'qris' | 'transfer'
  promo_code?: string
  created_at: string
  confirmed_at?: string
  preparing_at?: string
  ready_at?: string
  completed_at?: string
  cancelled_at?: string
  // Relations from Supabase query
  tables?: {
    id: string
    table_number: string
  }
  order_items?: Array<{
    id: string
    item_name: string
    quantity: number
    item_price: number
    subtotal: number
  }>
}

interface PaymentData {
  payment_id: string
  qr_code?: string
  bank_details?: {
    bank_name: string
    account_number: string
    account_name: string
  }
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableId = params.tableId as string
  const orderId = searchParams.get('order_id')

  console.log('Payment page - tableId:', tableId, 'orderId:', orderId, 'searchParams:', Object.fromEntries(searchParams.entries()))

  // Helper functions
  const generateOrderNumber = (orderData: OrderData | null) => {
    // Use order_number if available, otherwise generate from ID
    if (orderData?.order_number) {
      return orderData.order_number
    }
    if (orderData?.id) {
      return orderData.id.slice(-8).toUpperCase()
    }
    return '--------'
  }

  const getTableNumber = (orderData: OrderData | null, tableData: any) => {
    // Try to get table number from order data relations, then from table hook, finally from tableId
    if (orderData && (orderData as any).tables?.table_number) {
      return (orderData as any).tables.table_number
    }
    return tableData?.table_number || tableId
  }

  const getOrderTotal = (orderData: OrderData | null) => {
    if (!orderData) return 0

    const data = orderData as any
    // Use total_amount from database which should already include discount calculation
    // If not available, calculate manually
    if (data.total_amount) {
      return Number(data.total_amount)
    }

    // Fallback calculation including discount
    const subtotal = Number(data.subtotal || 0)
    const tax = Number(data.tax_amount || 0)
    const serviceCharge = Number(data.service_charge || 0)
    const discount = Number(data.discount_amount || 0)

    const total = subtotal + tax + serviceCharge - discount
    return Math.max(0, total) // Ensure non-negative
  }

  // Hooks
  const { table, isValidSession } = useTable()
  const { clearCart } = useCartStore()

  // State management
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enabledMethods, setEnabledMethods] = useState<Record<string, boolean>>({
    cash: true,
    card: true,
    qris: true,
    transfer: true
  })

  // Payment methods configuration
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'qris',
      name: 'QRIS',
      type: 'qris',
      description: 'Bayar dengan scan QR code menggunakan aplikasi bank atau e-wallet',
      icon: <QrCode className="h-6 w-6" />,
      processing_time: 'Instan',
      is_available: true,
      instructions: [
        'Scan QR code dengan aplikasi bank atau e-wallet Anda',
        'Masukkan nominal sesuai total pembayaran',
        'Konfirmasi pembayaran di aplikasi',
        'Upload bukti pembayaran'
      ]
    },
    {
      id: 'transfer',
      name: 'Transfer Bank',
      type: 'transfer',
      description: 'Transfer ke rekening bank cafe',
      icon: <University className="h-6 w-6" />,
      processing_time: '1-5 menit',
      is_available: true,
      instructions: [
        'Transfer ke nomor rekening yang disediakan',
        'Gunakan kode unik untuk identifikasi',
        'Upload bukti transfer',
        'Tunggu konfirmasi dari kasir'
      ]
    },
    {
      id: 'cash',
      name: 'Tunai',
      type: 'cash',
      description: 'Bayar langsung di kasir dengan uang tunai',
      icon: <Banknote className="h-6 w-6" />,
      processing_time: 'Langsung',
      is_available: true,
      instructions: [
        'Datang ke meja kasir',
        'Sebutkan nomor pesanan Anda',
        'Bayar sesuai total yang tertera',
        'Simpan struk pembayaran'
      ]
    },
    {
      id: 'card',
      name: 'Kartu Debit/Kredit',
      type: 'card',
      description: 'Bayar dengan kartu debit atau kredit di kasir',
      icon: <CreditCard className="h-6 w-6" />,
      processing_time: 'Langsung',
      is_available: true,
      instructions: [
        'Datang ke meja kasir',
        'Sebutkan nomor pesanan Anda',
        'Gesek atau tap kartu di mesin EDC',
        'Masukkan PIN jika diperlukan'
      ]
    }
  ]

  // Load payment methods from database
  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  // Load order data on mount
  useEffect(() => {
    if (!orderId) {
      toast.error('ID pesanan tidak valid')
      router.push(`/${tableId}`)
      return
    }

    loadOrderData()
  }, [orderId, tableId, router])

  // Session validation removed for payment page - payment should work with valid order ID
  // The order creation flow already validates the session, so if we have a valid order,
  // payment should proceed regardless of current session state

  // Fetch payment methods from database
  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/settings?category=payment&key=methods')
      const { data } = await response.json()

      if (data && data.length > 0) {
        const methodsSetting = data[0]
        setEnabledMethods(methodsSetting.value || {
          cash: true,
          card: true,
          qris: true,
          transfer: true
        })
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      // Keep default all enabled on error
    }
  }

  // Load order data
  const loadOrderData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!orderId) {
        throw new Error('Order ID tidak valid')
      }

      console.log('Loading order data for orderId:', orderId)
      const response = await apiClient.getOrder(orderId)

      console.log('Order API response:', response)
      console.log('Response status:', response.status)
      console.log('Response error:', response.error)

      // Handle different response structures
      if (response.error) {
        const errorMsg = response.error.message || 'Gagal memuat data pesanan'
        console.error('API Error:', response.error)

        // If order not found, redirect to table page
        if (response.status === 404) {
          toast.error('Pesanan tidak ditemukan. Membuat pesanan baru...')
          router.push(`/${tableId}`)
          return
        }

        throw new Error(errorMsg)
      }

      if (response.data) {
        // API client returns { data: apiRouteResponse }, API route returns { data: order }
        // So response.data contains { data: order }, we need response.data.data
        const orderData = (response.data as any).data || response.data
        console.log('Raw response.data:', response.data)
        console.log('Processed orderData:', orderData)
        console.log('Order data fields:', {
          id: (orderData as any).id,
          customer_name: (orderData as any).customer_name,
          order_number: (orderData as any).order_number,
          total_amount: (orderData as any).total_amount,
          subtotal: (orderData as any).subtotal,
          tax_amount: (orderData as any).tax_amount,
          service_charge: (orderData as any).service_charge,
          discount_amount: (orderData as any).discount_amount,
          promo_code: (orderData as any).promo_code,
          tables: (orderData as any).tablest
        })
        console.log('Calculated order total:', getOrderTotal(orderData))
        setOrderData(orderData)
      } else {
        throw new Error('Data pesanan tidak ditemukan')
      }

    } catch (error: any) {
      console.error('Error loading order data:', error)
      const errorMessage = error.message || 'Gagal memuat data pesanan'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle payment method selection
  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId)
  }

  // Handle payment processing
  const handleProcessPayment = async () => {
    if (!selectedMethod || !orderData) {
      toast.error('Pilih metode pembayaran')
      return
    }

    const method = paymentMethods.find(m => m.id === selectedMethod)
    if (!method) return

    try {
      setIsProcessing(true)

      // For cash and card payments, redirect to different flow
      if (method.type === 'cash' || method.type === 'card') {
        handleOfflinePayment(method)
        return
      }

      // Create payment for online methods
      const paymentData = {
        order_id: orderData.id,
        method: method.type,
        amount: orderData.total_amount
      }

      const response = await apiClient.createPayment(paymentData)

      if (response.error) {
        throw new Error(response.error.message)
      }

      if (response.data) {
        // API returns { data: paymentData }, handle both structures
        const paymentResult: PaymentData = (response.data as any).data || response.data
        localStorage.setItem('payment-data', JSON.stringify(paymentResult))


        // DON'T clear cart yet - only clear on successful payment completion
        const confirmUrl = `/${tableId}/payment/confirm?payment_id=${paymentResult.payment_id}&method=${method.type}`
        router.push(confirmUrl)
      }

    } catch (error: any) {
      console.error('Error processing payment:', error)
      toast.error(error.message || 'Gagal memproses pembayaran')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle offline payment methods
  const handleOfflinePayment = (method: PaymentMethod) => {
    // Store method info (without React components)
    const methodData = {
      id: method.id,
      name: method.name,
      type: method.type,
      description: method.description,
      processing_time: method.processing_time
    }
    localStorage.setItem('payment-method', JSON.stringify(methodData))

    // DON'T clear cart yet - only clear on successful payment completion
    // Navigate to offline payment instructions
    router.push(`/${tableId}/payment/offline?order_id=${orderData!.id}&method=${method.type}`)
  }

  // Handle back navigation
  const handleBack = () => {
    router.back()
  }

  // Get method availability
  const getMethodAvailability = (method: PaymentMethod) => {
    if (!orderData) return { available: false, reason: 'Loading...' }

    if (!method.is_available) {
      return { available: false, reason: 'Tidak tersedia' }
    }

    const totalAmount = getOrderTotal(orderData)

    if (method.min_amount && totalAmount < method.min_amount) {
      return {
        available: false,
        reason: `Minimum Rp ${method.min_amount.toLocaleString('id-ID')}`
      }
    }

    if (method.max_amount && totalAmount > method.max_amount) {
      return {
        available: false,
        reason: `Maksimum Rp ${method.max_amount.toLocaleString('id-ID')}`
      }
    }

    return { available: true, reason: '' }
  }

  if (isLoading || !orderData) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Pilih Metode Pembayaran
              </h1>
              <p className="text-sm text-gray-600">
                Order #{generateOrderNumber(orderData)} • Meja {getTableNumber(orderData, table)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Ringkasan Pesanan
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Nama Pemesan</span>
              <span className="font-medium text-gray-900">{orderData?.customer_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nomor Pesanan</span>
              <span className="font-medium text-gray-900">#{generateOrderNumber(orderData)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Meja</span>
              <span className="font-medium text-gray-900">{getTableNumber(orderData, table)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-3">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900">Total Pembayaran</span>
                <span className="text-lg font-bold text-gray-900">
                  Rp {getOrderTotal(orderData).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              Metode Pembayaran
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Pilih cara pembayaran yang Anda inginkan
            </p>
          </div>

          <div className="p-4 space-y-3">
            {paymentMethods
              .filter((method) => enabledMethods[method.type] === true)
              .map((method) => {
              const availability = getMethodAvailability(method)
              const isSelected = selectedMethod === method.id

              return (
                <button
                  key={method.id}
                  onClick={() => availability.available && handleMethodSelect(method.id)}
                  disabled={!availability.available}
                  className={`
                    w-full 
                    text-left 
                    p-4 
                    border 
                    rounded-lg 
                    transition-all
                    ${availability.available
                      ? isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }
                  `}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    <div className={`
                      p-2 
                      rounded-lg 
                      ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                    `}>
                      {method.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {method.name}
                          </h3>
                          {isSelected && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {method.processing_time}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-1">
                        {method.description}
                      </p>

                      {/* Fee information */}
                      {method.fee && method.fee > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          {method.fee_description || `Biaya admin Rp ${method.fee.toLocaleString('id-ID')}`}
                        </div>
                      )}

                      {/* Availability status */}
                      {!availability.available && (
                        <div className="text-xs text-red-600 mt-1 flex items-center space-x-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>{availability.reason}</span>
                        </div>
                      )}

                      {/* Instructions preview */}
                      {isSelected && method.instructions && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-xs font-medium text-blue-900 mb-2">
                            Langkah-langkah:
                          </div>
                          <ol className="text-xs text-blue-700 space-y-1">
                            {method.instructions.map((instruction, index) => (
                              <li key={index} className="flex items-start space-x-1">
                                <span className="font-medium">{index + 1}.</span>
                                <span>{instruction}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Security Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                Keamanan Pembayaran Terjamin
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Semua transaksi pembayaran diproses dengan sistem keamanan yang aman dan terpercaya. 
                Data pembayaran Anda tidak disimpan oleh sistem kami.
              </p>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-900">
                Penting untuk Diperhatikan
              </h3>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Pesanan akan diproses setelah pembayaran dikonfirmasi</li>
                <li>• Simpan bukti pembayaran untuk keperluan konfirmasi</li>
                <li>• Hubungi kasir jika ada kendala dalam pembayaran</li>
                <li>• Waktu persiapan dihitung setelah pembayaran diterima</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-lg font-bold text-gray-900">
            <span>Total Pembayaran</span>
            <span>Rp {getOrderTotal(orderData).toLocaleString('id-ID')}</span>
          </div>
          
          <button
            onClick={handleProcessPayment}
            disabled={!selectedMethod || isProcessing}
            className="w-full py-4 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                <span>
                  {selectedMethod === 'cash' || selectedMethod === 'card' 
                    ? 'Lanjut ke Kasir' 
                    : 'Proses Pembayaran'
                  }
                </span>
              </>
            )}
          </button>

          {!selectedMethod && (
            <p className="text-xs text-gray-500 text-center">
              Pilih metode pembayaran untuk melanjutkan
            </p>
          )}
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-32"></div>
    </div>
  )
}