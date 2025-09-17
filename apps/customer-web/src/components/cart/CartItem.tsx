'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Minus, Trash2, Edit2, Clock } from 'lucide-react'
import { toast } from 'sonner'

// Store
import { useCartStore } from '@/stores/cartStore'

// Hooks
import { formatCustomizationsReadable } from '@/hooks/useCustomizations'

// Types
interface CartItemData {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string
  customizations: Record<string, string[]>
  preparation_time: number
  table_id: string
  notes?: string
}

interface CartItemProps {
  item: CartItemData
  showActions?: boolean
  onEdit?: () => void
  className?: string
}

export default function CartItem({ 
  item, 
  showActions = true, 
  onEdit,
  className = '' 
}: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore()
  
  // Local state
  const [isRemoving, setIsRemoving] = useState(false)

  // Calculate item total
  const itemTotal = item.price * item.quantity

  // Format customizations for display
  const getCustomizationDisplay = () => {
    return formatCustomizationsReadable(item.customizations)
  }

  // Handle quantity update
  const handleQuantityUpdate = (newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemove()
      return
    }

    updateQuantity(item.id, item.customizations, newQuantity)
    
    if (newQuantity > item.quantity) {
      toast.success(`${item.name} ditambah`)
    } else {
      toast.info(`${item.name} dikurangi`)
    }
  }

  // Handle remove item
  const handleRemove = () => {
    setIsRemoving(true)
    
    // Small delay for animation
    setTimeout(() => {
      removeItem(item.id, item.customizations)
      toast.info(`${item.name} dihapus dari keranjang`)
      setIsRemoving(false)
    }, 200)
  }

  return (
    <div className={`
      bg-white 
      border 
      border-gray-200 
      rounded-lg 
      p-4 
      transition-all 
      duration-200
      ${isRemoving ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
      ${className}
    `}>
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
              {getCustomizationDisplay() && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {getCustomizationDisplay()}
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

            {/* Edit/Remove Actions */}
            {showActions && (
              <div className="flex items-center space-x-1 ml-2">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="
                      p-2 
                      text-gray-400 
                      hover:text-blue-600 
                      hover:bg-blue-50 
                      rounded-lg 
                      transition-colors
                    "
                    title="Edit item"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                
                <button
                  onClick={handleRemove}
                  className="
                    p-2 
                    text-gray-400 
                    hover:text-red-600 
                    hover:bg-red-50 
                    rounded-lg 
                    transition-colors
                  "
                  title="Hapus item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Price and Quantity Controls */}
          <div className="flex items-center justify-between mt-3">
            {/* Price */}
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-gray-900">
                Rp {itemTotal.toLocaleString('id-ID')}
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
                  onClick={() => handleQuantityUpdate(item.quantity - 1)}
                  className="
                    w-8 
                    h-8 
                    rounded-full 
                    bg-gray-100 
                    flex 
                    items-center 
                    justify-center 
                    hover:bg-gray-200 
                    transition-colors
                  "
                  disabled={isRemoving}
                >
                  <Minus className="h-4 w-4 text-gray-600" />
                </button>
                
                <span className="text-sm font-medium text-gray-900 min-w-[24px] text-center">
                  {item.quantity}
                </span>
                
                <button
                  onClick={() => handleQuantityUpdate(item.quantity + 1)}
                  className="
                    w-8 
                    h-8 
                    rounded-full 
                    bg-blue-600 
                    flex 
                    items-center 
                    justify-center 
                    hover:bg-blue-700 
                    transition-colors
                  "
                  disabled={isRemoving}
                >
                  <Plus className="h-4 w-4 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// Mini Cart Item (for compact display)
interface MiniCartItemProps {
  item: CartItemData
  showQuantity?: boolean
}

export function MiniCartItem({ item, showQuantity = true }: MiniCartItemProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              width={32}
              height={32}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200"></div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {item.name}
          </div>
          {showQuantity && (
            <div className="text-xs text-gray-500">
              {item.quantity} × Rp {item.price.toLocaleString('id-ID')}
            </div>
          )}
        </div>
      </div>
      
      <div className="text-sm font-medium text-gray-900 ml-2">
        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
      </div>
    </div>
  )
}