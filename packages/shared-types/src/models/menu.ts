import { MenuCategory, MenuStatus, CustomizationType } from '../enums/index'

// Menu Category
export interface MenuCategoryType {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  image_url?: string
  created_at: string
  updated_at: string
}

// Ingredient for recipes and inventory
export interface Ingredient {
  id: string
  name: string
  unit: string // gram, ml, piece, etc.
  cost_per_unit: number
  current_stock: number
  minimum_stock: number
  maximum_stock: number
  expiry_date?: string
  supplier_id?: string
  barcode?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Recipe ingredient - ingredient usage in menu items
export interface RecipeIngredient {
  id: string
  menu_item_id: string
  ingredient_id: string
  quantity: number
  notes?: string
  created_at: string
  updated_at: string
  
  // Relations
  ingredient?: Ingredient
}

// Menu Item Base
export interface MenuItem {
  id: string
  name: string
  description: string
  category: MenuCategory
  base_price: number
  cost_price: number // Calculated from recipe
  profit_margin: number // Percentage
  image_url?: string
  status: MenuStatus
  is_available: boolean
  preparation_time: number // minutes
  calories?: number
  is_spicy: boolean
  is_vegetarian: boolean
  is_halal: boolean
  tags: string[]
  sort_order: number
  created_at: string
  updated_at: string
  
  // Relations
  category_info?: MenuCategoryType
  recipe_ingredients?: RecipeIngredient[]
  customizations?: MenuCustomization[]
}

// Menu Item with calculated fields
export interface MenuItemWithDetails extends MenuItem {
  total_cost: number
  suggested_price: number // AI suggested price
  popularity_score: number
  average_rating: number
  total_reviews: number
}

// Menu Customization Options
export interface MenuCustomization {
  id: string
  menu_item_id: string
  name: string
  type: CustomizationType
  is_required: boolean
  min_selections: number
  max_selections: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  
  // Relations
  options?: CustomizationOption[]
}

// Individual customization option
export interface CustomizationOption {
  id: string
  customization_id: string
  name: string
  price_modifier: number // Additional cost
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Customer's selected customizations in order
export interface OrderCustomization {
  customization_id: string
  customization_name: string
  option_id: string
  option_name: string
  price_modifier: number
}

// Menu item with customer customizations (for cart/order)
export interface CustomizedMenuItem {
  menu_item: MenuItem
  customizations: OrderCustomization[]
  quantity: number
  unit_price: number // Base price + customization modifiers
  total_price: number // unit_price * quantity
  special_instructions?: string
}

// Menu pricing analytics
export interface MenuPricing {
  menu_item_id: string
  current_price: number
  suggested_price: number
  cost_price: number
  current_margin: number
  suggested_margin: number
  competitor_avg_price?: number
  demand_score: number
  price_elasticity?: number
}

// Menu performance metrics
export interface MenuPerformance {
  menu_item_id: string
  total_orders: number
  total_revenue: number
  average_rating: number
  profit_contribution: number
  velocity: number // orders per day
  last_ordered_at?: string
}

// Menu search and filter options
export interface MenuFilters {
  category?: MenuCategory
  is_available?: boolean
  is_spicy?: boolean
  is_vegetarian?: boolean
  is_halal?: boolean
  min_price?: number
  max_price?: number
  tags?: string[]
  search_query?: string
}

// Bulk menu operations
export interface BulkMenuOperation {
  action: 'update_prices' | 'toggle_availability' | 'update_category' | 'delete'
  menu_item_ids: string[]
  data?: {
    price_adjustment?: number
    price_adjustment_type?: 'fixed' | 'percentage'
    is_available?: boolean
    category?: MenuCategory
  }
}

// Menu import/export
export interface MenuExport {
  categories: MenuCategoryType[]
  menu_items: MenuItem[]
  customizations: MenuCustomization[]
  customization_options: CustomizationOption[]
  recipe_ingredients: RecipeIngredient[]
}

export interface MenuImportResult {
  success: boolean
  imported_items: number
  failed_items: number
  errors: string[]
  warnings: string[]
}
