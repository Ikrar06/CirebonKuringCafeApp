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
  type: 'cash' | 'card' | 'qris' | 'bank_transfer'
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
  table_id: string
  customer_name: string
  customer_phone?: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  total_amount: number
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method?: 'cash' | 'card' | 'qris' | 'bank_transfer'
  promo_code?: string
  discount_amount?: number
  notes?: string
  estimated_completion?: string
  created_at: string
  updated_at: string
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

  // Helper functions
  const generateOrderNumber = (orderId: string) => {
    // Generate a user-friendly order number from ID
    return orderId.slice(-8).toUpperCase()
  }

  const getTableNumber = (tableData: any) => {
    return table?.table_number || tableId
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
      id: 'bank_transfer',
      name: 'Transfer Bank',
      type: 'bank_transfer',
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

  // Load order data on mount
  useEffect(() => {
    if (!orderId) {
      toast.error('ID pesanan tidak valid')
      router.push(`/${tableId}`)
      return
    }

    loadOrderData()
  }, [orderId, tableId, router])

  // Redirect if invalid session
  useEffect(() => {
    if (!isValidSession) {
      toast.error('Sesi tidak valid')
      router.push(`/${tableId}`)
    }
  }, [isValidSession, tableId, router])

  // Load order data
  const loadOrderData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.getOrder(orderId!)
      
      if (response.error) {
        throw new Error(response.error.message)
      }

      if (response.data) {
        setOrderData(response.data)
      }

    } catch (error: any) {
      console.error('Error loading order data:', error)
      setError(error.message || 'Gagal memuat data pesanan')
      toast.error(error.message || 'Gagal memuat data pesanan')
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
        // Clear cart since order is created
        clearCart()
        
        // Navigate to payment confirmation page
        const paymentResult: PaymentData = response.data
        localStorage.setItem('payment-data', JSON.stringify(paymentResult))
        
        router.push(`/${tableId}/payment/confirm?payment_id=${paymentResult.payment_id}&method=${method.type}`)
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
    // Clear cart since order is created
    clearCart()
    
    // Store method for confirmation page
    localStorage.setItem('payment-method', JSON.stringify(method))
    
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

    if (method.min_amount && orderData.total_amount < method.min_amount) {
      return { 
        available: false, 
        reason: `Minimum Rp ${method.min_amount.toLocaleString('id-ID')}` 
      }
    }

    if (method.max_amount && orderData.total_amount > method.max_amount) {
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
                Order #{generateOrderNumber(orderData.id)} • Meja {getTableNumber(table)}
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
              <span className="font-medium text-gray-900">{orderData.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nomor Pesanan</span>
              <span className="font-medium text-gray-900">#{generateOrderNumber(orderData.id)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Meja</span>
              <span className="font-medium text-gray-900">{getTableNumber(table)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-3">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900">Total Pembayaran</span>
                <span className="text-lg font-bold text-gray-900">
                  Rp {orderData.total_amount.toLocaleString('id-ID')}
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
            {paymentMethods.map((method) => {
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
            <span>Rp {orderData.total_amount.toLocaleString('id-ID')}</span>
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