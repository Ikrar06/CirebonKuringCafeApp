'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  X, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle,
  Snowflake,
  Coffee,
  Zap,
  Flame
} from 'lucide-react'
import { toast } from 'sonner'

// Store
import { useCartStore } from '@/stores/cartStore'

// Types
interface MenuCustomizationProps {
  item: MenuItem
  isOpen: boolean
  onClose: () => void
  onConfirm: (customizedItem: CustomizedCartItem) => void
  initialCustomizations?: Record<string, string[]>
  initialQuantity?: number
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image_url?: string
  category_id: string
  category_name: string
  is_available: boolean
  preparation_time: number
  is_halal: boolean
  spice_level?: number
  customizations?: MenuCustomization[]
  allergens?: string[]
  nutritional_info?: NutritionalInfo
}

interface MenuCustomization {
  id: string
  name: string
  type: 'single' | 'multiple' | 'range'
  category: 'size' | 'temperature' | 'sweetness' | 'spice' | 'extras' | 'removal'
  options: CustomizationOption[]
  required: boolean
  max_selections?: number
  default_option?: string
}

interface CustomizationOption {
  id: string
  name: string
  price_modifier: number
  is_available: boolean
  description?: string
  calories_modifier?: number
}

interface NutritionalInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  sugar: number
  caffeine?: number
}

interface CustomizedCartItem {
  id: string
  name: string
  price: number
  quantity: number
  customizations: Record<string, string[]>
  notes?: string
  estimated_calories?: number
}

// Preset customizations for common items
const PRESET_CUSTOMIZATIONS = {
  beverages: {
    temperature: ['hot', 'cold', 'iced'],
    sweetness: ['no-sugar', 'less-sweet', 'normal', 'extra-sweet'],
    size: ['small', 'medium', 'large', 'extra-large']
  },
  food: {
    spice: ['mild', 'medium', 'hot', 'extra-hot'],
    size: ['regular', 'large'],
    extras: ['extra-cheese', 'extra-sauce', 'extra-meat']
  }
}

export default function MenuCustomization({
  item,
  isOpen,
  onClose,
  onConfirm,
  initialCustomizations = {},
  initialQuantity = 1
}: MenuCustomizationProps) {
  // State management
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>(initialCustomizations)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [specialNotes, setSpecialNotes] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomizations(initialCustomizations)
      setQuantity(initialQuantity)
      setSpecialNotes('')
      setCurrentStep(0)
      setValidationErrors([])
    }
  }, [isOpen, initialCustomizations, initialQuantity])

  // Group customizations by category
  const groupedCustomizations = item.customizations?.reduce((groups, customization) => {
    const category = customization.category || 'others'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(customization)
    return groups
  }, {} as Record<string, MenuCustomization[]>) || {}

  const customizationSteps = Object.keys(groupedCustomizations)

  // Calculate total price with customizations
  const calculateTotalPrice = () => {
    let totalPrice = item.price
    
    Object.entries(selectedCustomizations).forEach(([customizationId, optionIds]) => {
      const customization = item.customizations?.find(c => c.id === customizationId)
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

  // Calculate estimated calories
  const calculateCalories = () => {
    if (!item.nutritional_info) return null
    
    let totalCalories = item.nutritional_info.calories
    
    Object.entries(selectedCustomizations).forEach(([customizationId, optionIds]) => {
      const customization = item.customizations?.find(c => c.id === customizationId)
      if (customization) {
        optionIds.forEach(optionId => {
          const option = customization.options.find(o => o.id === optionId)
          if (option && option.calories_modifier) {
            totalCalories += option.calories_modifier
          }
        })
      }
    })
    
    return totalCalories
  }

  // Handle customization selection
  const handleCustomizationChange = (customizationId: string, optionId: string, checked: boolean) => {
    const customization = item.customizations?.find(c => c.id === customizationId)
    if (!customization) return

    setSelectedCustomizations(prev => {
      const currentOptions = prev[customizationId] || []

      if (customization.type === 'single') {
        // Single selection - replace
        return {
          ...prev,
          [customizationId]: checked ? [optionId] : []
        }
      } else if (customization.type === 'multiple') {
        // Multiple selection with limit
        const maxSelections = customization.max_selections || 99
        
        if (checked) {
          if (currentOptions.length >= maxSelections) {
            toast.error(`Maksimal ${maxSelections} pilihan`)
            return prev
          }
          return {
            ...prev,
            [customizationId]: [...currentOptions, optionId]
          }
        } else {
          return {
            ...prev,
            [customizationId]: currentOptions.filter(id => id !== optionId)
          }
        }
      }
      
      return prev
    })
  }

  // Validate current selections
  const validateSelections = () => {
    const errors: string[] = []
    
    // Check required customizations
    const requiredCustomizations = item.customizations?.filter(c => c.required) || []
    requiredCustomizations.forEach(customization => {
      const selections = selectedCustomizations[customization.id] || []
      if (selections.length === 0) {
        errors.push(`${customization.name} harus dipilih`)
      }
    })

    setValidationErrors(errors)
    return errors.length === 0
  }

  // Handle next step
  const handleNextStep = () => {
    if (currentStep < customizationSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Handle previous step
  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle confirm
  const handleConfirm = () => {
    if (!validateSelections()) {
      return
    }

    const customizedItem: CustomizedCartItem = {
      id: item.id,
      name: item.name,
      price: calculateTotalPrice(),
      quantity,
      customizations: selectedCustomizations,
      notes: specialNotes.trim() || undefined,
      estimated_calories: calculateCalories() || undefined
    }

    onConfirm(customizedItem)
    onClose()
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'temperature': return <Snowflake className="h-5 w-5" />
      case 'sweetness': return <Zap className="h-5 w-5" />
      case 'spice': return <Flame className="h-5 w-5" />
      case 'size': return <Coffee className="h-5 w-5" />
      default: return <Plus className="h-5 w-5" />
    }
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'temperature': return 'text-blue-600 bg-blue-50'
      case 'sweetness': return 'text-yellow-600 bg-yellow-50'
      case 'spice': return 'text-red-600 bg-red-50'
      case 'size': return 'text-green-600 bg-green-50'
      case 'extras': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (!isOpen) return null

  const currentCategory = customizationSteps[currentStep]
  const currentCustomizations = groupedCustomizations[currentCategory] || []

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end justify-center">
      <div className="bg-white rounded-t-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {item.image_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Customize pesanan Anda
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Progress indicator */}
          {customizationSteps.length > 1 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Langkah {currentStep + 1} dari {customizationSteps.length}</span>
                <span className="capitalize">{currentCategory.replace('_', ' ')}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / customizationSteps.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[50vh] p-4">
          {/* Quantity selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Jumlah Pesanan
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </button>
              
              <span className="text-xl font-medium text-gray-900 min-w-[40px] text-center">
                {quantity}
              </span>
              
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Current step customizations */}
          {currentCustomizations.map((customization) => (
            <div key={customization.id} className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className={`p-2 rounded-lg ${getCategoryColor(customization.category)}`}>
                  {getCategoryIcon(customization.category)}
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-medium text-gray-900">
                    {customization.name}
                  </h4>
                  {customization.required && (
                    <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full mt-1">
                      Wajib dipilih
                    </span>
                  )}
                  {customization.max_selections && customization.max_selections > 1 && (
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full mt-1 ml-2">
                      Maks {customization.max_selections} pilihan
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                {customization.options.map((option) => {
                  const isSelected = selectedCustomizations[customization.id]?.includes(option.id) || false
                  const isDisabled = !option.is_available
                  
                  return (
                    <label
                      key={option.id}
                      className={`
                        flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                        }
                        ${isDisabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : ''
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <input
                            type={customization.type === 'single' ? 'radio' : 'checkbox'}
                            name={`customization-${customization.id}`}
                            checked={isSelected}
                            onChange={(e) => handleCustomizationChange(
                              customization.id, 
                              option.id, 
                              e.target.checked
                            )}
                            disabled={isDisabled}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          {isSelected && (
                            <Check className="absolute inset-0 w-4 h-4 text-blue-600 pointer-events-none" />
                          )}
                        </div>
                        
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {option.name}
                          </span>
                          {option.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {option.description}
                            </p>
                          )}
                          {!option.is_available && (
                            <span className="inline-block text-xs text-red-600 mt-1">
                              Tidak tersedia
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {option.price_modifier !== 0 && (
                          <span className={`text-sm font-medium ${
                            option.price_modifier > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {option.price_modifier > 0 ? '+' : ''}
                            Rp {Math.abs(option.price_modifier).toLocaleString('id-ID')}
                          </span>
                        )}
                        {option.calories_modifier && (
                          <p className="text-xs text-gray-500 mt-1">
                            {option.calories_modifier > 0 ? '+' : ''}
                            {option.calories_modifier} kal
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Special notes (on last step) */}
          {currentStep === customizationSteps.length - 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Khusus (Opsional)
              </label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Tambahkan catatan khusus untuk pesanan Anda..."
                rows={3}
                maxLength={200}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {specialNotes.length}/200 karakter
              </p>
            </div>
          )}

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Harap lengkapi:</span>
              </div>
              <ul className="mt-2 text-sm text-red-600 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span>•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          {/* Price summary */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-bold text-gray-900">
                Total: Rp {(calculateTotalPrice() * quantity).toLocaleString('id-ID')}
              </div>
              <div className="text-sm text-gray-600">
                {quantity} × Rp {calculateTotalPrice().toLocaleString('id-ID')}
              </div>
              {calculateCalories() && (
                <div className="text-xs text-gray-500">
                  ~{calculateCalories()} kalori per porsi
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            {customizationSteps.length > 1 && currentStep > 0 && (
              <button
                onClick={handlePreviousStep}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Sebelumnya
              </button>
            )}
            
            {currentStep < customizationSteps.length - 1 ? (
              <button
                onClick={handleNextStep}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Lanjut
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Tambah ke Keranjang
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}