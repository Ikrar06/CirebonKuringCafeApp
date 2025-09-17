'use client'

import { useState, useEffect } from 'react'
import { 
  Tag, 
  Check, 
  X, 
  Loader2, 
  Gift, 
  Percent, 
  AlertCircle,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api/client'
import { useCartStore, type PromoData } from '@/stores/cartStore'

// Types
interface PromoCodeProps {
  orderTotal: number
  onPromoApplied: (discount: number, promoData: PromoData) => void
  onPromoRemoved?: () => void
  className?: string
}

interface PromoData {
  code: string
  name: string
  description: string
  discount_type: 'percentage' | 'fixed' | 'buy_x_get_y'
  discount_value: number
  discount_amount: number
  minimum_order: number
  maximum_discount?: number
  valid_until: string
  usage_limit?: number
  usage_count?: number
  terms_conditions?: string[]
}

interface PromoValidationResponse {
  valid: boolean
  discount_amount: number
  discount_percentage?: number
  final_total: number
  message?: string
  promo_data?: PromoData
}

interface AvailablePromo {
  code: string
  name: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  minimum_order: number
  is_trending?: boolean
}

export default function PromoCode({
  orderTotal,
  onPromoApplied,
  onPromoRemoved,
  className = ''
}: PromoCodeProps) {
  // Cart store
  const { appliedPromo, applyPromo, removePromo } = useCartStore()

  // State management
  const [promoCode, setPromoCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [availablePromos, setAvailablePromos] = useState<AvailablePromo[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load available promos on mount
  useEffect(() => {
    loadAvailablePromos()
  }, [orderTotal])

  // Note: Saved promo loading is now handled automatically by the cart store persistence

  // Load available promos from database
  const loadAvailablePromos = async () => {
    try {
      // Get promos from Supabase database
      const response = await apiClient.getPromos()

      console.log('Promo API response:', response)

      if (response.error) {
        console.error('Error loading promos:', response.error)
        setAvailablePromos([])
        return
      }

      // Handle different response structures
      let promos = response.data.data || response.data || []

      // Debug response structure
      console.log('Promos data:', promos)
      console.log('Promos type:', typeof promos)
      console.log('Is array:', Array.isArray(promos))

      // Ensure promos is an array
      if (!Array.isArray(promos)) {
        console.warn('Promos is not an array, setting empty array')
        setAvailablePromos([])
        return
      }

      // Convert database promos to component format
      const availablePromos: AvailablePromo[] = promos
        .filter(promo => promo.is_active && orderTotal >= (promo.min_purchase_amount || 0))
        .map(promo => ({
          code: promo.code,
          name: promo.name,
          description: promo.description,
          discount_type: promo.promo_type === 'percentage' ? 'percentage' : 'fixed',
          discount_value: Number(promo.discount_value),
          minimum_order: Number(promo.min_purchase_amount || 0),
          is_trending: false // You can add logic for trending promos
        }))

      console.log('Processed available promos:', availablePromos)
      setAvailablePromos(availablePromos)
    } catch (error) {
      console.error('Error loading available promos:', error)
      setAvailablePromos([])
    }
  }

  // Local mock promo validation (fallback)
  const validatePromoCodeLocal = (code: string): PromoValidationResponse | null => {
    const mockPromos: Record<string, any> = {
      'WELCOME10': {
        code: 'WELCOME10',
        name: 'Selamat Datang',
        description: 'Diskon 10% untuk pelanggan baru',
        discount_type: 'percentage',
        discount_value: 10,
        minimum_order: 0,
        maximum_discount: 50000,
        terms_conditions: ['Berlaku untuk pemesanan pertama', 'Tidak dapat digabung dengan promo lain']
      },
      'HEMAT25': {
        code: 'HEMAT25',
        name: 'Hemat Istimewa',
        description: 'Diskon Rp 25.000 min. pembelian Rp 100.000',
        discount_type: 'fixed',
        discount_value: 25000,
        minimum_order: 100000,
        terms_conditions: ['Minimum pembelian Rp 100.000', 'Berlaku untuk semua menu']
      },
      'MAKAN15': {
        code: 'MAKAN15',
        name: 'Makan Hemat',
        description: 'Diskon 15% min. pembelian Rp 50.000',
        discount_type: 'percentage',
        discount_value: 15,
        minimum_order: 50000,
        maximum_discount: 75000,
        terms_conditions: ['Minimum pembelian Rp 50.000', 'Maksimal diskon Rp 75.000']
      }
    }

    const promo = mockPromos[code]
    if (!promo) {
      return {
        valid: false,
        message: 'Kode promo tidak ditemukan',
        discount_amount: 0,
        final_total: orderTotal
      }
    }

    if (orderTotal < promo.minimum_order) {
      return {
        valid: false,
        message: `Minimum pemesanan Rp ${promo.minimum_order.toLocaleString('id-ID')}`,
        discount_amount: 0,
        final_total: orderTotal
      }
    }

    let discount_amount = 0
    if (promo.discount_type === 'percentage') {
      discount_amount = Math.round(orderTotal * (promo.discount_value / 100))
      if (promo.maximum_discount && discount_amount > promo.maximum_discount) {
        discount_amount = promo.maximum_discount
      }
    } else {
      discount_amount = promo.discount_value
      if (discount_amount > orderTotal) {
        discount_amount = orderTotal
      }
    }

    return {
      valid: true,
      message: `Promo ${promo.name} berhasil diterapkan!`,
      discount_amount,
      final_total: Math.max(0, orderTotal - discount_amount),
      promo_data: {
        ...promo,
        discount_amount,
        valid_until: '2024-12-31T23:59:59.000Z'
      }
    }
  }

  // Validate promo code with database
  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setError('Masukkan kode promo')
      return
    }

    try {
      setIsValidating(true)
      setError(null)

      const promoCode = code.trim().toUpperCase()

      // Get promo details from database
      const response = await apiClient.validatePromoCode(promoCode, orderTotal)

      if (response.error) {
        throw new Error(response.error.message || 'Kode promo tidak valid')
      }

      // Handle nested response structure for validation too
      const actualPromoData = response.data.data || response.data
      if (!actualPromoData) {
        throw new Error('Kode promo tidak ditemukan')
      }

      // Debug promo data
      console.log('Raw promo data received:', response.data)
      console.log('Actual promo data:', actualPromoData)
      console.log('Order total:', orderTotal)

      // Calculate discount based on promo type
      let discount_amount = 0
      const discountValue = Number(actualPromoData.discount_value)

      console.log('Promo type:', actualPromoData.promo_type)
      console.log('Discount value:', discountValue)

      if (actualPromoData.promo_type === 'percentage') {
        discount_amount = Math.round(orderTotal * (discountValue / 100))
        console.log('Percentage calculation:', orderTotal, '*', discountValue / 100, '=', discount_amount)

        if (actualPromoData.max_discount_amount && discount_amount > Number(actualPromoData.max_discount_amount)) {
          discount_amount = Number(actualPromoData.max_discount_amount)
          console.log('Applied max discount cap:', discount_amount)
        }
      } else if (actualPromoData.promo_type === 'fixed_amount') {
        discount_amount = discountValue
        console.log('Fixed amount discount:', discount_amount)

        if (discount_amount > orderTotal) {
          discount_amount = orderTotal
          console.log('Capped to order total:', discount_amount)
        }
      }

      console.log('Final discount amount:', discount_amount)

      // Create promo data for cart store
      const promoForCart: PromoData = {
        code: actualPromoData.code,
        name: actualPromoData.name,
        description: actualPromoData.description,
        discount_type: actualPromoData.promo_type === 'percentage' ? 'percentage' : 'fixed',
        discount_value: discountValue,
        discount_amount,
        minimum_order: Number(actualPromoData.min_purchase_amount || 0),
        maximum_discount: actualPromoData.max_discount_amount ? Number(actualPromoData.max_discount_amount) : undefined,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        usage_limit: actualPromoData.max_uses_total ? Number(actualPromoData.max_uses_total) : undefined,
        usage_count: actualPromoData.current_uses ? Number(actualPromoData.current_uses) : 0,
        terms_conditions: [
          actualPromoData.min_purchase_amount ? `Minimum pembelian Rp ${Number(actualPromoData.min_purchase_amount).toLocaleString('id-ID')}` : '',
          actualPromoData.max_discount_amount ? `Maksimal diskon Rp ${Number(actualPromoData.max_discount_amount).toLocaleString('id-ID')}` : '',
          'Tidak dapat digabung dengan promo lain'
        ].filter(Boolean)
      }

      applyPromo(promoForCart)
      onPromoApplied?.(discount_amount, promoForCart)

      toast.success(
        'Promo berhasil diterapkan!',
        {
          description: `Hemat Rp ${discount_amount.toLocaleString('id-ID')}`
        }
      )

      setPromoCode('')
      setShowSuggestions(false)

    } catch (error: any) {
      console.error('Error validating promo code:', error)
      setError(error.message || 'Kode promo tidak valid')
      toast.error(error.message || 'Kode promo tidak valid')
    } finally {
      setIsValidating(false)
    }
  }

  // Remove applied promo
  const handleRemovePromo = () => {
    removePromo()
    onPromoRemoved?.()
    toast.info('Promo code dihapus')
  }

  // Apply suggested promo
  const applySuggestedPromo = (promo: AvailablePromo) => {
    setPromoCode(promo.code)
    validatePromoCode(promo.code)
    setShowSuggestions(false)
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    setPromoCode(value)
    setError(null)
  }

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    validatePromoCode(promoCode)
  }

  // Calculate potential savings for suggestions
  const calculatePotentialSavings = (promo: AvailablePromo) => {
    if (promo.discount_type === 'percentage') {
      const discount = Math.round(orderTotal * (promo.discount_value / 100))
      return Math.min(discount, 100000) // Max discount cap
    } else {
      return promo.discount_value
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
            <Tag className="h-5 w-5" />
            <span>Kode Promo</span>
          </h3>
          
          {availablePromos.length > 0 && !appliedPromo && (
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <Gift className="h-4 w-4" />
              <span>Lihat Promo</span>
            </button>
          )}
        </div>

        {/* Applied Promo Display */}
        {appliedPromo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-green-900">
                    {appliedPromo.name} ({appliedPromo.code})
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    {appliedPromo.description}
                  </div>
                  <div className="text-sm font-medium text-green-800 mt-2">
                    Hemat Rp {appliedPromo.discount_amount.toLocaleString('id-ID')}
                  </div>
                  
                  {/* Terms and conditions */}
                  {appliedPromo.terms_conditions && appliedPromo.terms_conditions.length > 0 && (
                    <div className="text-xs text-green-600 mt-2">
                      <div className="font-medium mb-1">Syarat & Ketentuan:</div>
                      <ul className="space-y-1">
                        {appliedPromo.terms_conditions.map((term, index) => (
                          <li key={index} className="flex items-start space-x-1">
                            <span>•</span>
                            <span>{term}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleRemovePromo}
                className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                title="Hapus promo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Promo Input Form */}
        {!appliedPromo && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={promoCode}
                  onChange={handleInputChange}
                  placeholder="Masukkan kode promo"
                  className={`
                    w-full
                    px-3
                    py-3
                    border
                    rounded-lg
                    focus:ring-2
                    focus:ring-blue-500
                    focus:border-transparent
                    uppercase
                    text-gray-900
                    placeholder-gray-500
                    bg-white
                    ${error ? 'border-red-300' : 'border-gray-200'}
                  `}
                  maxLength={20}
                  disabled={isValidating}
                />
                {error && (
                  <div className="flex items-center space-x-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={!promoCode.trim() || isValidating}
                className="
                  px-4 
                  py-3 
                  bg-blue-600 
                  text-white 
                  rounded-lg 
                  font-medium 
                  hover:bg-blue-700 
                  disabled:bg-gray-300 
                  disabled:cursor-not-allowed 
                  transition-colors
                  flex 
                  items-center 
                  space-x-2
                "
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Gunakan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Available Promos Suggestions */}
        {showSuggestions && availablePromos.length > 0 && !appliedPromo && (
          <div className="mt-4 space-y-3">
            <div className="text-sm font-medium text-gray-700">
              Promo yang tersedia untuk pesanan Anda:
            </div>
            
            {availablePromos.map((promo, index) => {
              const potentialSavings = calculatePotentialSavings(promo)
              const isEligible = orderTotal >= promo.minimum_order
              
              return (
                <button
                  key={index}
                  onClick={() => applySuggestedPromo(promo)}
                  disabled={!isEligible}
                  className={`
                    w-full 
                    text-left 
                    p-3 
                    border 
                    rounded-lg 
                    transition-all
                    ${isEligible 
                      ? 'border-blue-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-gray-900">
                          {promo.code}
                        </div>
                        {promo.is_trending && (
                          <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                            <TrendingUp className="h-3 w-3" />
                            <span>Trending</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {promo.description}
                      </div>
                      {!isEligible && (
                        <div className="text-xs text-red-600 mt-1">
                          Minimum pembelian Rp {promo.minimum_order.toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>
                    
                    {isEligible && (
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          Hemat Rp {potentialSavings.toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {promo.discount_type === 'percentage' 
                            ? `${promo.discount_value}% off`
                            : 'Fixed discount'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* No promos available message */}
        {availablePromos.length === 0 && !appliedPromo && (
          <div className="text-center py-4 text-gray-500">
            <Gift className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Tidak ada promo yang tersedia saat ini</p>
            <p className="text-xs mt-1">Tambah pesanan untuk unlock promo menarik!</p>
          </div>
        )}

        {/* Promo tips */}
        {!appliedPromo && orderTotal < 50000 && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Sparkles className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <div className="font-medium">Tips Hemat!</div>
                <div className="mt-1">
                  Tambah pesanan Rp {(50000 - orderTotal).toLocaleString('id-ID')} lagi 
                  untuk mendapatkan promo diskon 15%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}