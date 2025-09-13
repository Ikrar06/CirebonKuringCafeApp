'use client'

import { useState } from 'react'
import Image from 'next/image'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  Receipt,
  Info,
  ChevronUp,
  ChevronDown,
  Edit2
} from 'lucide-react'

// Store and types
import { useCartStore, type CartItem } from '@/stores/cartStore'

// Types
interface CartSummaryProps {
  items?: CartItem[]
  showActions?: boolean
  compact?: boolean
  showTaxBreakdown?: boolean
  onItemEdit?: (item: CartItem) => void
  className?: string
}

interface TaxBreakdown {
  subtotal: number
  tax: number
  service_fee: number
  discount?: number
  total: number
}

// Constants
const TAX_RATE = 0.11 // 11% PPN
const SERVICE_FEE_RATE = 0.05 // 5% service fee

// Helper function to format customizations
function formatCustomizations(customizations: Record<string, string[]>) {
  if (!customizations || Object.keys(customizations).length === 0) {
    return null
  }

  return Object.entries(customizations)
    .filter(([_, options]) => options.length > 0)
    .map(([_, options]) => options.join(', '))
    .join(' • ')
}

export default function CartSummary({
  items: propItems,
  showActions = true,
  compact = false,
  showTaxBreakdown = true,
  onItemEdit,
  className = ''
}: CartSummaryProps) {
  const { 
    items: storeItems, 
    updateQuantity, 
    removeItem,
    getCartSummary 
  } = useCartStore()
  
  // Use prop items or store items
  const items = propItems || storeItems
  
  // State for expanded/collapsed view
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [showBreakdown, setShowBreakdown] = useState(false)

  // Calculate totals
  const calculateSummary = (): TaxBreakdown => {
    if (propItems) {
      // Calculate from prop items
      const subtotal = propItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const tax = Math.round(subtotal * TAX_RATE)
      const service_fee = Math.round(subtotal * SERVICE_FEE_RATE)
      const total = subtotal + tax + service_fee
      
      return { subtotal, tax, service_fee, total }
    } else {
      // Use store calculation
      return getCartSummary()
    }
  }

  const summary = calculateSummary()
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const maxPrepTime = Math.max(...items.map(item => item.preparation_time))

  // Handle quantity update
  const handleQuantityUpdate = (item: CartItem, newQuantity: number) => {
    if (!showActions) return
    
    if (newQuantity <= 0) {
      removeItem(item.id, item.customizations)
    } else {
      updateQuantity(item.id, item.customizations, newQuantity)
    }
  }

  // Handle item removal
  const handleRemoveItem = (item: CartItem) => {
    if (!showActions) return
    removeItem(item.id, item.customizations)
  }

  if (items.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Keranjang Kosong
        </h3>
        <p className="text-gray-600">
          Tambahkan menu untuk mulai memesan
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Keranjang Belanja
            </h2>
          </div>
          <div className="text-sm text-gray-600">
            {totalItems} item
          </div>
        </div>
      )}

      {/* Collapsible header for compact mode */}
      {compact && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">
              {totalItems} item dalam keranjang
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">
              Rp {summary.total.toLocaleString('id-ID')}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </button>
      )}

      {/* Items List */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {items.map((item, index) => (
            <div key={`${item.id}-${JSON.stringify(item.customizations)}`} className="p-4">
              <div className="flex space-x-3">
                {/* Item Image */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 relative">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-medium text-gray-900 truncate">
                        {item.name}
                      </h4>
                      
                      {/* Customizations */}
                      {formatCustomizations(item.customizations) && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {formatCustomizations(item.customizations)}
                        </p>
                      )}
                      
                      {/* Notes */}
                      {item.notes && (
                        <p className="text-sm text-gray-500 italic mt-1">
                          "{item.notes}"
                        </p>
                      )}
                      
                      {/* Preparation time */}
                      <div className="flex items-center space-x-1 mt-2">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {item.preparation_time} menit
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {showActions && (
                      <div className="flex items-center space-x-1 ml-2">
                        {onItemEdit && (
                          <button
                            onClick={() => onItemEdit(item)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit item"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Price and Quantity */}
                  <div className="flex items-center justify-between mt-3">
                    {/* Price */}
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">
                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-sm text-gray-500">
                          ({item.quantity} × Rp {item.price.toLocaleString('id-ID')})
                        </span>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    {showActions && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityUpdate(item, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        
                        <span className="text-sm font-medium text-gray-900 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        
                        <button
                          onClick={() => handleQuantityUpdate(item, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    )}

                    {/* Read-only quantity for non-interactive mode */}
                    {!showActions && (
                      <div className="text-sm text-gray-600">
                        Qty: {item.quantity}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Summary */}
      {isExpanded && showTaxBreakdown && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          {/* Summary Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
              <Receipt className="h-4 w-4" />
              <span>Ringkasan Pembayaran</span>
            </h3>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <Info className="h-3 w-3" />
              <span>{showBreakdown ? 'Sembunyikan' : 'Detail'}</span>
            </button>
          </div>

          {/* Breakdown Details */}
          {showBreakdown && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalItems} item)</span>
                <span>Rp {summary.subtotal.toLocaleString('id-ID')}</span>
              </div>
              
              <div className="flex justify-between text-gray-600">
                <span>PPN (11%)</span>
                <span>Rp {summary.tax.toLocaleString('id-ID')}</span>
              </div>
              
              <div className="flex justify-between text-gray-600">
                <span>Biaya Layanan (5%)</span>
                <span>Rp {summary.service_fee.toLocaleString('id-ID')}</span>
              </div>

              {summary.discount && summary.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Diskon</span>
                  <span>-Rp {summary.discount.toLocaleString('id-ID')}</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-2"></div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">
              Total Pembayaran
            </span>
            <span className="text-lg font-bold text-gray-900">
              Rp {summary.total.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <div className="font-medium">Estimasi Waktu Persiapan</div>
                <div>Sekitar {maxPrepTime} menit setelah pembayaran dikonfirmasi</div>
              </div>
            </div>
          </div>

          {/* Order Guidelines */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Harga sudah termasuk PPN 11% dan biaya layanan 5%</p>
            <p>• Pesanan akan diproses setelah pembayaran dikonfirmasi</p>
            <p>• Waktu persiapan dapat bervariasi tergantung kondisi dapur</p>
          </div>
        </div>
      )}

      {/* Compact Summary (when collapsed) */}
      {!isExpanded && compact && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>{totalItems} item</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>~{maxPrepTime} mnt</span>
              </div>
            </div>
            <span className="font-medium text-gray-900">
              Rp {summary.total.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Mini Cart Summary for bottom bar
interface MiniCartSummaryProps {
  onToggle: () => void
  className?: string
}

export function MiniCartSummary({ onToggle, className = '' }: MiniCartSummaryProps) {
  const { items, getCartSummary } = useCartStore()
  const summary = getCartSummary()
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const maxPrepTime = items.length > 0 ? Math.max(...items.map(item => item.preparation_time)) : 0

  if (totalItems === 0) return null

  return (
    <div className={`bg-white border-t border-gray-200 shadow-lg ${className}`}>
      <div className="px-4 py-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center relative">
              <ShoppingCart className="h-5 w-5 text-white" />
              {totalItems > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-left">
              <div className="font-medium text-gray-900">
                {totalItems} item dalam keranjang
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Rp {summary.total.toLocaleString('id-ID')}</span>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>~{maxPrepTime} menit</span>
              </div>
            </div>
          </div>
          
          <div className="text-blue-600 font-medium text-sm">
            Lihat Keranjang
          </div>
        </button>
      </div>
    </div>
  )
}

// Order Summary for Checkout
interface CheckoutSummaryProps {
  className?: string
}

export function CheckoutSummary({ className = '' }: CheckoutSummaryProps) {
  const { items, getCartSummary } = useCartStore()
  const summary = getCartSummary()

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h3 className="font-medium text-gray-900 mb-3">Ringkasan Pesanan</h3>
      
      {/* Items List */}
      <div className="space-y-2 mb-4">
        {items.map((item, index) => (
          <div key={`${item.id}-${JSON.stringify(item.customizations)}`} 
               className="flex justify-between items-center text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {item.quantity}× {item.name}
              </div>
              {formatCustomizations(item.customizations) && (
                <div className="text-gray-600 text-xs truncate">
                  {formatCustomizations(item.customizations)}
                </div>
              )}
            </div>
            <div className="font-medium text-gray-900 ml-2">
              Rp {(item.price * item.quantity).toLocaleString('id-ID')}
            </div>
          </div>
        ))}
      </div>

      {/* Price Breakdown */}
      <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>Rp {summary.subtotal.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>PPN (11%)</span>
          <span>Rp {summary.tax.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Biaya Layanan (5%)</span>
          <span>Rp {summary.service_fee.toLocaleString('id-ID')}</span>
        </div>
        {summary.discount && summary.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Diskon</span>
            <span>-Rp {summary.discount.toLocaleString('id-ID')}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-300">
          <span>Total</span>
          <span>Rp {summary.total.toLocaleString('id-ID')}</span>
        </div>
      </div>
    </div>
  )
}

export type { CartSummaryProps, TaxBreakdown }