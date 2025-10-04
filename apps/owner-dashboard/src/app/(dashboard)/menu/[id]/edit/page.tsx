'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Upload, X, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import CustomizationBuilder from '../../components/CustomizationBuilder'
import { createClient } from '@/lib/supabase/client'
import { imageUploadService } from '@/services/imageUploadService'

interface MenuItem {
  id: string
  name: string
  description: string
  base_price?: number
  price?: number // Keep for backward compatibility
  category_id: string
  image_url?: string
  is_available: boolean
  estimated_prep_time?: number
  preparation_time?: number // Keep for backward compatibility
  calories?: number
  allergens?: string[]
  ingredients?: string[]
}

interface CustomizationGroup {
  id?: string
  group_name: string
  group_type: 'single' | 'multiple'
  is_required: boolean
  display_order: number
  options: CustomizationOption[]
}

interface CustomizationOption {
  id?: string
  option_name: string
  price_adjustment: number
  is_default: boolean
  is_available: boolean
  display_order: number
  ingredient_id?: string
  ingredient_quantity?: number
}

interface Category {
  id: string
  name: string
}

export default function EditMenuItemPage() {
  const router = useRouter()
  const params = useParams()
  const menuItemId = params.id as string

  const [menuItem, setMenuItem] = useState<MenuItem | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const supabase = createClient()

  // Load data
  useEffect(() => {
    loadData()
  }, [menuItemId])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Load menu item
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', menuItemId)
        .single()

      if (menuError) throw menuError

      setMenuItem(menuData)
      setImagePreview(menuData.image_url)

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_categories')
        .select('id, name')
        .order('name')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Load customization groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('menu_customization_groups')
        .select(`
          *,
          menu_customization_options(*)
        `)
        .eq('menu_item_id', menuItemId)
        .order('display_order')

      if (groupsError) throw groupsError

      const formattedGroups = groupsData?.map(group => ({
        ...group,
        options: (group.menu_customization_options || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
      })) || []

      setCustomizationGroups(formattedGroups)

    } catch (error) {
      console.error('Load error:', error)
      toast.error('Failed to load menu item')
      router.push('/menu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const uploadResult = await imageUploadService.uploadMenuImage(file, menuItem?.name || 'menu-item')

    if (uploadResult.error) {
      throw new Error(uploadResult.error)
    }

    return uploadResult.url
  }

  const handleSave = async () => {
    if (!menuItem) return

    setIsSaving(true)
    try {
      let imageUrl = menuItem.image_url

      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      const updateData = {
        name: menuItem.name,
        description: menuItem.description,
        base_price: menuItem.base_price || menuItem.price || 0,
        category_id: menuItem.category_id,
        image_url: imageUrl,
        is_available: menuItem.is_available,
        estimated_prep_time: menuItem.estimated_prep_time || menuItem.preparation_time || 0,
        calories: menuItem.calories,
        allergens: menuItem.allergens,
        updated_at: new Date().toISOString()
      }

      // Use API route with service role key to bypass RLS
      const response = await fetch(`/api/menu-items/${menuItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update menu item')
      }

      toast.success('Menu item updated successfully')

      // Redirect to menu page
      window.location.href = '/menu'
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save menu item')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCustomizationSave = async (groups: CustomizationGroup[]) => {
    try {
      // Delete existing customizations
      await supabase
        .from('menu_customization_groups')
        .delete()
        .eq('menu_item_id', menuItemId)

      // Insert new groups and options
      for (const group of groups) {
        const { data: groupData, error: groupError } = await supabase
          .from('menu_customization_groups')
          .insert({
            group_name: group.group_name,
            group_type: group.group_type,
            menu_item_id: menuItemId,
            is_required: group.is_required,
            display_order: group.display_order
          })
          .select()
          .single()

        if (groupError) throw groupError

        if (group.options.length > 0) {
          const optionsToInsert = group.options.map(option => ({
            option_name: option.option_name,
            group_id: groupData.id,
            price_adjustment: option.price_adjustment,
            is_default: option.is_default,
            is_available: option.is_available,
            display_order: option.display_order,
            ingredient_id: option.ingredient_id,
            ingredient_quantity: option.ingredient_quantity
          }))

          const { error: optionsError } = await supabase
            .from('menu_customization_options')
            .insert(optionsToInsert)

          if (optionsError) throw optionsError
        }
      }

      toast.success('Customizations saved successfully')
    } catch (error) {
      console.error('Customization save error:', error)
      throw new Error('Failed to save customizations')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading menu item...</p>
        </div>
      </div>
    )
  }

  if (!menuItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Menu item not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Edit Menu Item</h1>
                <p className="text-sm text-gray-600">Update menu item details and customizations</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={menuItem.name}
                    onChange={(e) => setMenuItem({ ...menuItem, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Menu item name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={menuItem.description}
                    onChange={(e) => setMenuItem({ ...menuItem, description: e.target.value })}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe this menu item..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (IDR)</label>
                  <input
                    type="number"
                    value={menuItem.base_price || menuItem.price || ''}
                    onChange={(e) => setMenuItem({ ...menuItem, base_price: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={menuItem.category_id}
                    onChange={(e) => setMenuItem({ ...menuItem, category_id: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preparation Time (minutes)</label>
                  <input
                    type="number"
                    value={menuItem.estimated_prep_time || menuItem.preparation_time || ''}
                    onChange={(e) => setMenuItem({ ...menuItem, estimated_prep_time: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Calories (optional)</label>
                  <input
                    type="number"
                    value={menuItem.calories || ''}
                    onChange={(e) => setMenuItem({ ...menuItem, calories: parseInt(e.target.value) || undefined })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={menuItem.is_available}
                    onChange={(e) => setMenuItem({ ...menuItem, is_available: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Available for ordering</span>
                </label>
              </div>
            </div>

            {/* Customizations */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <CustomizationBuilder
                menuItemId={menuItemId}
                initialGroups={customizationGroups}
                onSave={handleCustomizationSave}
              />
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Image</h2>

              <div className="space-y-4">
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setImagePreview(null)
                        setImageFile(null)
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">Upload menu item image</p>
                    <p className="text-xs text-gray-500 mb-4">PNG, JPG up to 5MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="btn-secondary cursor-pointer inline-block"
                    >
                      Choose File
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
