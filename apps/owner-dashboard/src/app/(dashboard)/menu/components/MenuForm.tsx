'use client'

import { useState, useEffect } from 'react'
import { Save, Camera, X } from 'lucide-react'
import { CreateMenuItemData, CustomizationGroup } from '@/services/menuService'
import { useMenuStore } from '@/stores/menuStore'
import IngredientsSelector from './IngredientsSelector'
import PriceSuggestion from './PriceSuggestion'
import CustomizationBuilder from './CustomizationBuilder'
import { IngredientCost, PricingData } from '@/services/pricingService'
import { imageUploadService } from '@/services/imageUploadService'

interface MenuFormProps {
  onSubmit: (data: CreateMenuItemData) => void
  isLoading?: boolean
  isPreview?: boolean
  initialData?: CreateMenuItemData
  className?: string
}

export default function MenuForm({
  onSubmit,
  isLoading = false,
  isPreview = false,
  initialData,
  className = ''
}: MenuFormProps) {
  const { categories, fetchCategories } = useMenuStore()

  // Form state
  const [formData, setFormData] = useState<CreateMenuItemData>({
    name: '',
    description: '',
    base_price: 0,
    category_id: '',
    estimated_prep_time: 15,
    is_available: true,
    calories: 0,
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    is_spicy: false,
    spicy_level: 0,
    ...initialData
  })

  // Additional form state
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientCost[]>([])
  const [difficultyLevel, setDifficultyLevel] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [portionSize, setPortionSize] = useState(1)
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationGroup[]>([])

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    if (initialData?.ingredients && Array.isArray(initialData.ingredients)) {
      // Convert ingredient format if needed
      setSelectedIngredients([])
    }
  }, [initialData])

  const handleInputChange = (field: keyof CreateMenuItemData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Generate pricing data from ingredients
  const pricingData: PricingData | null = selectedIngredients.length > 0 ? {
    ingredients: selectedIngredients,
    preparation_time: formData.estimated_prep_time || 15,
    difficulty_level: difficultyLevel,
    portion_size: portionSize,
    category: 'general' // Default category for pricing
  } : null

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Menu name is required'
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required'
    }

    if (formData.base_price <= 0) {
      newErrors.base_price = 'Price must be greater than 0'
    }

    if ((formData.estimated_prep_time || 0) <= 0) {
      newErrors.estimated_prep_time = 'Preparation time must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Image handling
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setImageUploadError(null)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setImageUploadError(null)
  }

  // Price change handler
  const handlePriceChange = (price: number) => {
    handleInputChange('base_price', price)
  }

  // Form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      let imageUrl = formData.image_url

      // Upload image if selected
      if (selectedImage) {
        const uploadResult = await imageUploadService.uploadMenuImage(
          selectedImage,
          formData.name
        )

        if (uploadResult.error) {
          setImageUploadError(uploadResult.error)
          return
        }

        imageUrl = uploadResult.url
      }

      // Prepare submission data
      const submissionData: CreateMenuItemData = {
        ...formData,
        image_url: imageUrl,
        base_price: Math.round(formData.base_price),
        ingredients: selectedIngredients.map(ing => ({
          ingredient_id: ing.id,
          quantity_needed: ing.quantity,
          unit: ing.unit,
          preparation_notes: `${ing.quantity} ${ing.unit} of ${ing.name}`
        })),
        customization_groups: customizationGroups.length > 0 ? customizationGroups : undefined
      }

      onSubmit(submissionData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (isPreview) {
    return (
      <div className={`max-w-2xl mx-auto ${className}`}>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {(imagePreview || formData.image_url) && (
            <div className="aspect-video">
              <img
                src={imagePreview || formData.image_url}
                alt={formData.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-8">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">{formData.name || 'Nama Menu'}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                formData.is_available
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {formData.is_available ? 'Tersedia' : 'Tidak Tersedia'}
              </span>
            </div>

            <p className="text-gray-600 mb-6">{formData.description || 'Deskripsi menu akan muncul di sini'}</p>

            <div className="flex items-center justify-between py-4 border-t border-b border-gray-200 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Harga</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(formData.base_price)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Waktu Persiapan</p>
                <p className="text-lg font-semibold text-gray-900">{formData.estimated_prep_time || 15} menit</p>
              </div>
            </div>

            {formData.calories && formData.calories > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500">Kalori: <span className="font-medium text-gray-900">{formData.calories} kcal</span></p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {formData.is_vegetarian && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">🌱 Vegetarian</span>
              )}
              {formData.is_vegan && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">🥬 Vegan</span>
              )}
              {formData.is_spicy && (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">🌶️ Pedas {formData.spicy_level ? `(${formData.spicy_level}/5)` : ''}</span>
              )}
              {formData.is_gluten_free && (
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">🌾 Gluten Free</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-8 ${className}`}>
      {/* Basic Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Menu Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter menu item name"
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => handleInputChange('category_id', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.category_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && <p className="text-red-600 text-sm mt-1">{errors.category_id}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe your menu item..."
          />
          {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Prep Time (minutes) *
            </label>
            <input
              type="number"
              min="1"
              value={formData.estimated_prep_time || ''}
              onChange={(e) => handleInputChange('estimated_prep_time', parseInt(e.target.value) || 0)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                errors.estimated_prep_time ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="15"
            />
            {errors.estimated_prep_time && <p className="text-red-600 text-sm mt-1">{errors.estimated_prep_time}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Availability
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_available || false}
                onChange={(e) => handleInputChange('is_available', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Available for ordering</span>
            </label>
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Menu Image</h3>

        {imagePreview || formData.image_url ? (
          <div className="relative">
            <img
              src={imagePreview || formData.image_url}
              alt="Menu preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Camera className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Upload a photo of your menu item</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="btn-primary cursor-pointer"
            >
              Choose Image
            </label>
          </div>
        )}

        {imageUploadError && (
          <p className="text-red-600 text-sm mt-2">{imageUploadError}</p>
        )}
      </div>

      {/* Ingredients & Pricing */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <IngredientsSelector
          selectedIngredients={selectedIngredients}
          onIngredientsChange={setSelectedIngredients}
        />
      </div>

      {/* AI Price Suggestion */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PriceSuggestion
          pricingData={pricingData}
          selectedPrice={formData.base_price}
          onPriceSelect={handlePriceChange}
        />
        {errors.base_price && <p className="text-red-600 text-sm mt-2">{errors.base_price}</p>}
      </div>

      {/* Dietary Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dietary Information</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_vegetarian || false}
              onChange={(e) => handleInputChange('is_vegetarian', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Vegetarian</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_vegan || false}
              onChange={(e) => handleInputChange('is_vegan', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Vegan</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_spicy || false}
              onChange={(e) => handleInputChange('is_spicy', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Spicy</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_gluten_free || false}
              onChange={(e) => handleInputChange('is_gluten_free', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Gluten Free</span>
          </label>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calories (optional)
            </label>
            <input
              type="number"
              min="0"
              value={formData.calories || ''}
              onChange={(e) => handleInputChange('calories', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              placeholder="250"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spice Level (0-5)
            </label>
            <input
              type="number"
              min="0"
              max="5"
              value={formData.spicy_level || ''}
              onChange={(e) => handleInputChange('spicy_level', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Menu Customizations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <CustomizationBuilder
          initialGroups={customizationGroups}
          onSave={(groups) => {
            setCustomizationGroups(groups)
            return Promise.resolve()
          }}
        />
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end space-x-4 sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 -mb-6">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg"
        >
          <Save className="h-5 w-5" />
          <span>{isLoading ? 'Saving...' : 'Save Menu Item'}</span>
        </button>
      </div>
    </form>
  )
}