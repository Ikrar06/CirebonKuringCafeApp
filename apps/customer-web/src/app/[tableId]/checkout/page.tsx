'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MessageSquare, 
  Clock,
  MapPin,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  Check
} from 'lucide-react'

// Components
import CartSummary from '@/components/cart/CartSummary'
import PromoCode from '@/components/cart/PromoCode'

// Hooks and stores
import useTable from '@/hooks/useTable'
import { useCartStore, useCartSummary } from '@/stores/cartStore'
import apiClient from '@/lib/api/client'

// Types
interface CustomerInfo {
  name: string
  phone: string
  email?: string
  notes?: string
}

interface OrderValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const tableId = params.tableId as string

  // Hooks
  const { table, isValidSession } = useTable()
  const { items, totalItems, clearCart } = useCartStore()
  const { summary, validation } = useCartSummary()

  // State management
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    notes: ''
  })
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderValidation, setOrderValidation] = useState<OrderValidation>({
    isValid: false,
    errors: [],
    warnings: []
  })

  // Redirect if no items in cart
  useEffect(() => {
    if (!items.length && !isSubmitting) {
      toast.error('Keranjang kosong')
      router.push(`/${tableId}`)
    }
  }, [items.length, tableId, router, isSubmitting])

  // Redirect if invalid session
  useEffect(() => {
    if (!isValidSession) {
      toast.error('Sesi tidak valid')
      router.push(`/${tableId}`)
    }
  }, [isValidSession, tableId, router])

  // Load saved customer info
  useEffect(() => {
    const savedInfo = localStorage.getItem('customer-info')
    if (savedInfo) {
      try {
        const parsed = JSON.parse(savedInfo)
        setCustomerInfo(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Error loading saved customer info:', error)
      }
    }
  }, [])

  // Validate order on state changes
  useEffect(() => {
    validateOrder()
  }, [customerInfo, agreedToTerms, validation])

  // Validate order data
  const validateOrder = () => {
    const errors: string[] = []
    const warnings: string[] = []

    // Customer info validation
    if (!customerInfo.name.trim()) {
      errors.push('Nama wajib diisi')
    } else if (customerInfo.name.trim().length < 2) {
      errors.push('Nama minimal 2 karakter')
    }

    if (!customerInfo.phone.trim()) {
      errors.push('Nomor telepon wajib diisi')
    } else if (!/^(\+62|62|0)[0-9]{9,12}$/.test(customerInfo.phone.replace(/\s+/g, ''))) {
      errors.push('Format nomor telepon tidak valid')
    }

    if (customerInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      errors.push('Format email tidak valid')
    }

    // Terms agreement
    if (!agreedToTerms) {
      errors.push('Harap setujui syarat dan ketentuan')
    }

    // Cart validation
    if (!validation.isValid) {
      errors.push(...validation.errors)
    }
    warnings.push(...validation.warnings)

    // Order amount validation
    if (summary.total < 10000) {
      errors.push('Minimum pemesanan Rp 10.000')
    }

    // Table validation
    if (!table) {
      errors.push('Data meja tidak valid')
    }

    setOrderValidation({
      isValid: errors.length === 0,
      errors,
      warnings
    })
  }

  // Handle customer info change
  const handleInfoChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }))
  }

  // Save customer info to localStorage
  const saveCustomerInfo = () => {
    try {
      const infoToSave = {
        name: customerInfo.name,
        phone: customerInfo.phone,
        email: customerInfo.email
      }
      localStorage.setItem('customer-info', JSON.stringify(infoToSave))
    } catch (error) {
      console.error('Error saving customer info:', error)
    }
  }

  // Handle order submission
  const handleSubmitOrder = async () => {
    if (!orderValidation.isValid) {
      toast.error('Mohon lengkapi semua data yang diperlukan')
      return
    }

    try {
      setIsSubmitting(true)

      // Save customer info for future use
      saveCustomerInfo()

      // Prepare order data
      const orderData = {
        table_id: tableId,
        customer_name: customerInfo.name.trim(),
        customer_phone: customerInfo.phone.replace(/\s+/g, ''),
        customer_email: customerInfo.email?.trim() || undefined,
        items: items.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          customizations: item.customizations,
          notes: item.notes,
          unit_price: item.price
        })),
        special_notes: customerInfo.notes?.trim() || undefined,
        subtotal: summary.subtotal,
        tax_amount: summary.tax,
        service_fee: summary.service_fee,
        total_amount: summary.total
      }

      // Create order
      const response = await apiClient.createOrder(orderData)

      if (response.error) {
        throw new Error(response.error.message)
      }

      if (response.data) {
        // Store order ID for payment page
        localStorage.setItem('current-order-id', response.data.order_id)
        
        toast.success('Pesanan berhasil dibuat!')
        
        // Navigate to payment page
        router.push(`/${tableId}/payment?order_id=${response.data.order_id}`)
      }

    } catch (error: any) {
      console.error('Error creating order:', error)
      toast.error(error.message || 'Gagal membuat pesanan')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle back navigation
  const handleBack = () => {
    router.back()
  }

  if (!table || !items.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Memuat Checkout
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
                Checkout Pesanan
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>Meja {table.table_number}</span>
                <span>•</span>
                <span>{totalItems} item</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Order Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5" />
              <span>Ringkasan Pesanan</span>
            </h2>
          </div>
          <CartSummary 
            items={items}
            showActions={false}
            compact={true}
          />
        </div>

        {/* Promo Code */}
        <PromoCode 
          orderTotal={summary.subtotal}
          onPromoApplied={(discount) => {
            toast.success(`Promo berhasil diterapkan! Hemat Rp ${discount.toLocaleString('id-ID')}`)
          }}
        />

        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informasi Pemesan</span>
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Data untuk konfirmasi pesanan dan komunikasi
            </p>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => handleInfoChange('name', e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Telepon *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => handleInfoChange('phone', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={15}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Untuk konfirmasi pesanan dan update status
              </p>
            </div>

            {/* Email Input (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (Opsional)
              </label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => handleInfoChange('email', e.target.value)}
                placeholder="email@contoh.com"
                className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Special Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Khusus (Opsional)
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => handleInfoChange('notes', e.target.value)}
                  placeholder="Tambahkan catatan khusus untuk pesanan Anda..."
                  rows={3}
                  maxLength={200}
                  className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {customerInfo.notes?.length || 0}/200 karakter
              </p>
            </div>
          </div>
        </div>

        {/* Order Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                Estimasi Waktu Persiapan
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Sekitar {summary.estimated_time} menit setelah pembayaran dikonfirmasi
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Pesanan akan diproses setelah pembayaran diterima oleh kasir
              </p>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
            />
            <div className="text-sm text-gray-700">
              <span>Saya setuju dengan </span>
              <button className="text-blue-600 hover:text-blue-700 underline">
                syarat dan ketentuan
              </button>
              <span> serta </span>
              <button className="text-blue-600 hover:text-blue-700 underline">
                kebijakan privasi
              </button>
              <span> yang berlaku.</span>
              <p className="text-xs text-gray-500 mt-2">
                Dengan melanjutkan, Anda menyetujui bahwa pesanan tidak dapat dibatalkan 
                setelah dikonfirmasi oleh dapur.
              </p>
            </div>
          </label>
        </div>

        {/* Validation Errors */}
        {orderValidation.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-900">
                  Mohon lengkapi data berikut:
                </h3>
                <ul className="mt-2 text-sm text-red-700 space-y-1">
                  {orderValidation.errors.map((error, index) => (
                    <li key={index} className="flex items-center space-x-1">
                      <span>•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {orderValidation.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-900">
                  Perhatian:
                </h3>
                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                  {orderValidation.warnings.map((warning, index) => (
                    <li key={index} className="flex items-center space-x-1">
                      <span>•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="space-y-3">
          {/* Price Summary */}
          <div className="flex items-center justify-between text-lg font-bold text-gray-900">
            <span>Total Pembayaran</span>
            <span>Rp {summary.total.toLocaleString('id-ID')}</span>
          </div>
          
          {/* Continue Button */}
          <button
            onClick={handleSubmitOrder}
            disabled={!orderValidation.isValid || isSubmitting}
            className="w-full py-4 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                <span>Lanjut ke Pembayaran</span>
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center">
            Pesanan akan dikonfirmasi setelah pembayaran diterima
          </p>
        </div>
      </div>

      {/* Bottom padding to prevent content being hidden behind fixed button */}
      <div className="h-32"></div>
    </div>
  )
}