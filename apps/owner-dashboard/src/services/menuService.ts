'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface MenuItem {
  id: string
  name: string
  slug: string
  description?: string
  base_price: number
  cost_price?: number
  tax_rate?: number
  category_id: string
  category_name?: string
  image_url?: string
  thumbnail_url?: string
  requires_stock?: boolean
  estimated_prep_time?: number
  is_available?: boolean
  available_from?: string
  available_until?: string
  daily_limit?: number
  current_daily_count?: number
  calories?: number
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_gluten_free?: boolean
  is_spicy?: boolean
  spicy_level?: number
  allergens?: string[]
  average_rating?: number
  rating_count?: number
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface MenuCategory {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  display_order?: number
  is_active?: boolean
  available_from?: string
  available_until?: string
  available_days?: number[]
  created_at?: string
  updated_at?: string
}

export interface CustomizationOption {
  id?: string
  option_name: string
  price_adjustment: number
  is_default: boolean
  is_available: boolean
  display_order: number
  ingredient_id?: string
  ingredient_quantity?: number
}

export interface CustomizationGroup {
  id?: string
  group_name: string
  group_type: 'single' | 'multiple'
  is_required: boolean
  display_order: number
  options: CustomizationOption[]
}

export interface CreateMenuItemData {
  name: string
  slug?: string
  description?: string
  base_price: number
  cost_price?: number
  tax_rate?: number
  category_id: string
  image_url?: string
  thumbnail_url?: string
  requires_stock?: boolean
  estimated_prep_time?: number
  is_available?: boolean
  available_from?: string
  available_until?: string
  daily_limit?: number
  calories?: number
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_gluten_free?: boolean
  is_spicy?: boolean
  spicy_level?: number
  allergens?: string[]
  ingredients?: { ingredient_id: string; quantity_needed: number; unit: string; preparation_notes?: string }[]
  customization_groups?: CustomizationGroup[]
}

export interface UpdateMenuItemData extends Partial<CreateMenuItemData> {
  id: string
}

class MenuService {
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)
  }
  async getMenuItems(filters?: {
    category_id?: string
    is_available?: boolean
    search?: string
  }): Promise<MenuItem[]> {
    try {
      // Build query params
      const params = new URLSearchParams()
      if (filters?.category_id) params.append('category_id', filters.category_id)
      if (filters?.is_available !== undefined) params.append('is_available', String(filters.is_available))
      if (filters?.search) params.append('search', filters.search)

      // Use API route to bypass RLS
      const response = await fetch(`/api/menu-items?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch menu items')
      }

      const { data } = await response.json()
      return data || []
    } catch (error) {
      console.error('Error fetching menu items:', error)
      throw error
    }
  }

  async getMenuCategories(): Promise<MenuCategory[]> {
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching menu menu_categories:', error)
      throw error
    }
  }

  async getMenuItem(id: string): Promise<MenuItem | null> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories (
            id,
            name
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      if (!data) return null

      return {
        ...data,
        category_name: (data.menu_categories as any)?.name
      }
    } catch (error) {
      console.error('Error fetching menu item:', error)
      throw error
    }
  }

  async createMenuItem(itemData: CreateMenuItemData): Promise<MenuItem> {
    try {
      // Use API route to bypass RLS
      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create menu item')
      }

      const { data } = await response.json()
      return data
    } catch (error) {
      console.error('Error creating menu item:', error)
      throw error
    }
  }

  async updateMenuItem(itemData: UpdateMenuItemData): Promise<MenuItem> {
    try {
      const { id, ...updateData } = itemData

      // Use API route to bypass RLS
      const response = await fetch(`/api/menu-items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update menu item')
      }

      const { data } = await response.json()
      return data
    } catch (error) {
      console.error('Error updating menu item:', error)
      throw error
    }
  }

  async deleteMenuItem(id: string): Promise<void> {
    try {
      // Use API route to bypass RLS
      const response = await fetch(`/api/menu-items/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete menu item')
      }
    } catch (error) {
      console.error('Error deleting menu item:', error)
      throw error
    }
  }

  async toggleItemAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
    try {
      // Use API route to bypass RLS
      const response = await fetch(`/api/menu-items/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_available: isAvailable })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to toggle item availability')
      }

      const { data } = await response.json()
      return data
    } catch (error) {
      console.error('Error toggling item availability:', error)
      throw error
    }
  }

  async bulkUpdateAvailability(itemIds: string[], isAvailable: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: isAvailable })
        .in('id', itemIds)

      if (error) throw error
    } catch (error) {
      console.error('Error bulk updating availability:', error)
      throw error
    }
  }

  async getMenuStats(): Promise<{
    totalItems: number
    availableItems: number
    unavailableItems: number
    categories: number
  }> {
    try {
      // Use API route to bypass RLS
      const response = await fetch('/api/menu-stats')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch menu stats')
      }

      const { data } = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching menu stats:', error)
      throw error
    }
  }
}

export const menuService = new MenuService()
