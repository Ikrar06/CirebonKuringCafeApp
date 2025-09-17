// Shared menu types for customer app

export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  image_url?: string
  category_id: string
  category_name: string
  is_available: boolean
  preparation_time?: number
  is_halal: boolean
  spice_level?: number
  tags?: string[]
  ingredients_available: boolean
  customizations?: MenuCustomization[]
  rating?: number
  total_reviews?: number
  nutritional_info?: NutritionalInfo
}

export interface MenuCustomization {
  id: string
  name: string
  type: 'single' | 'multiple'
  options: CustomizationOption[]
  required: boolean
}

export interface CustomizationOption {
  id: string
  name: string
  price_modifier: number
}

export interface MenuCategory {
  id: string
  name: string
  slug?: string
  icon: string
  description?: string
  sort_order: number
  color?: string
  image_url?: string
  is_active?: boolean
}

export interface NutritionalInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  sugar: number
  caffeine?: number
  is_vegetarian?: boolean
  is_vegan?: boolean
}
