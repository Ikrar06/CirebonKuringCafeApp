'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { 
  Plus, 
  Minus, 
  Clock, 
  Leaf, 
  Flame,
  AlertTriangle,
  Settings,
  Star
} from 'lucide-react'
import { toast } from 'sonner'

// Store
import { useCartStore } from '@/stores/cartStore'

// API
import apiClient from '@/lib/api/client'

// Types
import type { MenuItem, MenuCustomization, CustomizationOption } from '@/types/menu'

interface MenuCardProps {
  item: MenuItem
  tableId: string
}

export default function MenuCard({ item, tableId }: MenuCardProps) {
  const { addItem, updateQuantity, getItemQuantity } = useCartStore()
  
  // Local state
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>({})
  const [tempQuantity, setTempQuantity] = useState(1)
  const [dbCustomizations, setDbCustomizations] = useState<MenuCustomization[]>([])
  const [isLoadingCustomizations, setIsLoadingCustomizations] = useState(false)
  const [customizationsLoaded, setCustomizationsLoaded] = useState(false)

  // Get current quantity in cart
  const currentQuantity = getItemQuantity(item.id, selectedCustomizations)

  // Load customizations from database (lazy loading)
  const loadCustomizations = useCallback(async () => {
    if (customizationsLoaded || isLoadingCustomizations) return

    setIsLoadingCustomizations(true)
    try {
      const response = await apiClient.getMenuCustomizations(item.id)

      if (!response.error && response.data && Array.isArray(response.data)) {
        setDbCustomizations(response.data)
      } else {
        setDbCustomizations([])
      }
    } catch (error) {
      console.error(`Error loading customizations for ${item.name}:`, error)
      setDbCustomizations([])
    } finally {
      setCustomizationsLoaded(true)
      setIsLoadingCustomizations(false)
    }
  }, [item.id, item.name, customizationsLoaded, isLoadingCustomizations])

  // Load customizations on mount to determine if customize button should be shown
  useEffect(() => {
    if (!customizationsLoaded && !isLoadingCustomizations) {
      loadCustomizations()
    }
  }, [loadCustomizations, customizationsLoaded, isLoadingCustomizations])

  // Calculate total price with customizations
  const calculateTotalPrice = () => {
    let totalPrice = item.price || 0

    Object.entries(selectedCustomizations).forEach(([customizationId, optionIds]) => {
      const customization = dbCustomizations.find(c => c.id === customizationId)
      if (customization) {
        optionIds.forEach(optionId => {
          const option = customization.options.find(o => o.id === optionId)
          if (option) {
            totalPrice += option.price_modifier
          }
        })
      }
    })

    return totalPrice
  }

  // Check if item can be added to cart
  const canAddToCart = () => {
    if (!item.is_available || !item.ingredients_available) {
      return false
    }

    // Check if all required customizations are selected
    const requiredCustomizations = dbCustomizations.filter(c => c.required) || []
    return requiredCustomizations.every(customization =>
      selectedCustomizations[customization.id] &&
      selectedCustomizations[customization.id].length > 0
    )
  }

  // Handle customization change
  const handleCustomizationChange = (customizationId: string, optionId: string, checked: boolean) => {
    setSelectedCustomizations(prev => {
      const customization = dbCustomizations.find(c => c.id === customizationId)
      if (!customization) return prev

      const currentOptions = prev[customizationId] || []

      if (customization.type === 'single') {
        // Single selection - replace
        return {
          ...prev,
          [customizationId]: checked ? [optionId] : []
        }
      } else {
        // Multiple selection - add/remove
        return {
          ...prev,
          [customizationId]: checked
            ? [...currentOptions, optionId]
            : currentOptions.filter(id => id !== optionId)
        }
      }
    })
  }

  // Handle add to cart
  const handleAddToCart = () => {
    if (!canAddToCart()) {
      toast.error('Pilih semua opsi yang diperlukan')
      return
    }

    const cartItem = {
      id: item.id,
      name: item.name,
      price: calculateTotalPrice(),
      image_url: item.image_url,
      quantity: tempQuantity,
      customizations: selectedCustomizations,
      preparation_time: item.preparation_time || 15,
      table_id: tableId
    }

    addItem(cartItem)
    
    toast.success(`${item.name} ditambahkan ke keranjang`, {
      description: `${tempQuantity} item - Rp ${(calculateTotalPrice() * tempQuantity).toLocaleString('id-ID')}`
    })

    // Reset customization modal
    setIsCustomizing(false)
    setTempQuantity(1)
    setSelectedCustomizations({})
  }

  // Handle quick add (without customizations)
  const handleQuickAdd = async () => {
    if (!item.is_available || !item.ingredients_available) {
      toast.error('Menu tidak tersedia saat ini')
      return
    }

    // Load customizations first if not already loaded
    if (!customizationsLoaded) {
      await loadCustomizations()
    }

    // If has customizations, open customization modal
    if (dbCustomizations && dbCustomizations.length > 0) {
      setIsCustomizing(true)
      return
    }

    // Add directly to cart if no customizations
    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price || 0,
      image_url: item.image_url,
      quantity: 1,
      customizations: {},
      preparation_time: item.preparation_time || 15,
      table_id: tableId
    }

    addItem(cartItem)
    toast.success(`${item.name} ditambahkan ke keranjang`)
  }

  // Handle quantity update
  const handleQuantityUpdate = (newQuantity: number) => {
    if (newQuantity <= 0) {
      updateQuantity(item.id, selectedCustomizations, 0)
      toast.info(`${item.name} dihapus dari keranjang`)
    } else {
      updateQuantity(item.id, selectedCustomizations, newQuantity)
    }
  }

  // Get spice level indicator
  const getSpiceLevelColor = (level?: number) => {
    if (!level) return 'text-gray-500'
    if (level === 1) return 'text-green-500'
    if (level === 2) return 'text-yellow-500'
    if (level === 3) return 'text-orange-500'
    return 'text-red-500'
  }


  return (
    <>
      {/* Menu Card */}
      <div className={`
        bg-white 
        rounded-lg 
        shadow-sm 
        border 
        border-gray-200 
        overflow-hidden
        ${!item.is_available || !item.ingredients_available ? 'opacity-60' : ''}
      `}>
        <div className="p-4">
          <div className="flex space-x-4">
            {/* Menu Image */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                {/* Availability overlay */}
                {(!item.is_available || !item.ingredients_available) && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      Habis
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Menu Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {item.name}
                  </h3>
                  
                  {/* Rating */}
                  {item.rating && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">
                        {item.rating.toFixed(1)}
                      </span>
                      {item.total_reviews && (
                        <span className="text-xs text-gray-500">
                          ({item.total_reviews})
                        </span>
                      )}
                    </div>
                  )}
                  
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  {/* Tags and Indicators */}
                  <div className="flex items-center space-x-2 mt-2">
                    {/* Preparation time */}
                    {item.preparation_time && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{item.preparation_time} mnt</span>
                      </div>
                    )}
                    
                    {/* Halal indicator */}
                    {item.is_halal && (
                      <div className="flex items-center space-x-1 text-xs text-green-600">
                        <Leaf className="h-3 w-3" />
                        <span>Halal</span>
                      </div>
                    )}
                    
                    {/* Spice level */}
                    {item.spice_level && item.spice_level > 0 && (
                      <div className="flex items-center space-x-1 text-xs">
                        <Flame className={`h-3 w-3 ${getSpiceLevelColor(item.spice_level)}`} />
                        <span className="text-gray-600">Level {item.spice_level}</span>
                      </div>
                    )}
                    
                    {/* Stock warning */}
                    {!item.ingredients_available && (
                      <div className="flex items-center space-x-1 text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Stok terbatas</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Price and Actions */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-lg font-bold text-gray-900">
                  Rp {(item.price || 0).toLocaleString('id-ID')}
                </div>
                
                {/* Add to cart actions */}
                <div className="flex items-center space-x-2">
                  {currentQuantity > 0 ? (
                    // Quantity controls
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantityUpdate(currentQuantity - 1)}
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
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      
                      <span className="text-sm font-medium text-gray-900 min-w-[24px] text-center">
                        {currentQuantity}
                      </span>
                      
                      <button
                        onClick={() => handleQuantityUpdate(currentQuantity + 1)}
                        disabled={!item.is_available || !item.ingredients_available}
                        className="
                          w-8 
                          h-8 
                          rounded-full 
                          bg-blue-600 
                          flex 
                          items-center 
                          justify-center 
                          hover:bg-blue-700 
                          disabled:bg-gray-300 
                          disabled:cursor-not-allowed 
                          transition-colors
                        "
                      >
                        <Plus className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    // Add button
                    <div className="flex items-center space-x-2">
                      {/* Customize button - show loading, then show only if has customizations */}
                      {!customizationsLoaded ? (
                        // Show loading button while fetching customizations
                        <button
                          disabled
                          className="
                            px-3
                            py-2
                            text-sm
                            font-medium
                            text-gray-500
                            border
                            border-gray-300
                            rounded-lg
                            cursor-not-allowed
                            transition-colors
                          "
                          title="Loading customizations..."
                        >
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        </button>
                      ) : (
                        // Show customize button only if customizations exist
                        dbCustomizations && dbCustomizations.length > 0 ? (
                          <button
                            onClick={() => setIsCustomizing(true)}
                            disabled={!item.is_available || !item.ingredients_available}
                            className="
                              px-3
                              py-2
                              text-sm
                              font-medium
                              text-blue-600
                              border
                              border-blue-600
                              rounded-lg
                              hover:bg-blue-50
                              disabled:text-gray-500
                              disabled:border-gray-300
                              disabled:cursor-not-allowed
                              transition-colors
                            "
                            title="Customize"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                        ) : null
                      )}

                      <button
                        onClick={handleQuickAdd}
                        disabled={!item.is_available || !item.ingredients_available}
                        className="
                          px-4
                          py-2
                          text-sm
                          font-medium
                          text-white
                          bg-blue-600
                          rounded-lg
                          hover:bg-blue-700
                          disabled:bg-gray-300
                          disabled:cursor-not-allowed
                          transition-colors
                          flex
                          items-center
                          space-x-1
                        "
                      >
                        <Plus className="h-4 w-4" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="
                        px-2 
                        py-1 
                        text-xs 
                        bg-gray-100 
                        text-gray-600 
                        rounded-full
                      "
                    >
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="px-2 py-1 text-xs text-gray-500">
                      +{item.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      {isCustomizing && (
        <div className="fixed inset-0 z-50 bg-white/20 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white rounded-t-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-lg">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Customize {item.name}
                </h3>
                <button
                  onClick={() => {
                    setIsCustomizing(false)
                    setSelectedCustomizations({})
                    setTempQuantity(1)
                  }}
                  className="p-2 hover:bg-gray-200/80 rounded-lg transition-colors text-gray-700 hover:text-gray-900 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[50vh] p-4">
              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setTempQuantity(Math.max(1, tempQuantity - 1))}
                    className="
                      w-10 
                      h-10 
                      rounded-full 
                      bg-gray-100 
                      flex 
                      items-center 
                      justify-center 
                      hover:bg-gray-200 
                      transition-colors
                    "
                  >
                    <Minus className="h-4 w-4 text-gray-600" />
                  </button>
                  
                  <span className="text-lg font-medium text-gray-900 min-w-[32px] text-center">
                    {tempQuantity}
                  </span>
                  
                  <button
                    onClick={() => setTempQuantity(tempQuantity + 1)}
                    className="
                      w-10 
                      h-10 
                      rounded-full 
                      bg-blue-600 
                      flex 
                      items-center 
                      justify-center 
                      hover:bg-blue-700 
                      transition-colors
                    "
                  >
                    <Plus className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Customizations */}
              {dbCustomizations?.map((customization) => (
                <div key={customization.id} className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      {customization.name}
                    </h4>
                    {customization.required && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                        Wajib
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {customization.options.map((option) => {
                      const isSelected = selectedCustomizations[customization.id]?.includes(option.id) || false
                      
                      return (
                        <label
                          key={option.id}
                          className="
                            flex 
                            items-center 
                            justify-between 
                            p-3 
                            border 
                            border-gray-200 
                            rounded-lg 
                            cursor-pointer 
                            hover:bg-gray-50 
                            transition-colors
                          "
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type={customization.type === 'single' ? 'radio' : 'checkbox'}
                              name={`customization-${customization.id}`}
                              checked={isSelected}
                              onChange={(e) => handleCustomizationChange(
                                customization.id, 
                                option.id, 
                                e.target.checked
                              )}
                              className="
                                w-4 
                                h-4 
                                text-blue-600 
                                border-gray-300 
                                rounded 
                                focus:ring-blue-500
                              "
                            />
                            <span className="text-sm text-gray-900">
                              {option.name}
                            </span>
                          </div>
                          
                          {option.price_modifier !== 0 && (
                            <span className={`text-sm font-medium ${
                              option.price_modifier > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {option.price_modifier > 0 ? '+' : ''}
                              Rp {option.price_modifier.toLocaleString('id-ID')}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-bold text-gray-900">
                  Total: Rp {(calculateTotalPrice() * tempQuantity).toLocaleString('id-ID')}
                </div>
                <div className="text-sm text-gray-600">
                  {tempQuantity} × Rp {calculateTotalPrice().toLocaleString('id-ID')}
                </div>
              </div>
              
              <button
                onClick={handleAddToCart}
                disabled={!canAddToCart()}
                className="
                  w-full 
                  py-3 
                  px-4 
                  bg-blue-600 
                  text-white 
                  rounded-lg 
                  font-medium 
                  hover:bg-blue-700 
                  disabled:bg-gray-300 
                  disabled:cursor-not-allowed 
                  transition-colors
                "
              >
                {!canAddToCart() 
                  ? 'Pilih semua opsi yang diperlukan' 
                  : `Tambah ke Keranjang - Rp ${(calculateTotalPrice() * tempQuantity).toLocaleString('id-ID')}`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}