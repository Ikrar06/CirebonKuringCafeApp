'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Ingredient {
  id: string
  name: string
  code?: string
  category?: string
  unit: string
  unit_conversion?: number
  current_stock?: number
  min_stock_level?: number
  max_stock_level?: number
  reorder_point?: number
  reorder_quantity?: number
  unit_cost?: number
  last_purchase_price?: number
  average_cost?: number
  is_active?: boolean
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface MenuItemIngredient {
  id: string
  menu_item_id: string
  ingredient_id: string
  quantity_needed: number
  unit: string
  preparation_notes?: string
  is_required?: boolean
  alternative_group?: string
  created_at?: string
  updated_at?: string
  ingredient?: Ingredient
}

class IngredientService {
  async getIngredients(filters?: {
    category?: string
    is_active?: boolean
    search?: string
  }): Promise<Ingredient[]> {
    try {
      console.log('🔍 Fetching ingredients with filters:', filters)

      // Build query params
      const params = new URLSearchParams()
      if (filters?.category) params.append('category', filters.category)
      if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
      if (filters?.search) params.append('search', filters.search)

      // Fetch from API route which uses service role key
      const response = await fetch(`/api/ingredients?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch ingredients')
      }

      const { data } = await response.json()

      console.log('📊 API result:', { count: data?.length, data })

      return data || []
    } catch (error) {
      console.error('❌ Error fetching ingredients:', error)
      throw error
    }
  }

  async getIngredient(id: string): Promise<Ingredient | null> {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching ingredient:', error)
      throw error
    }
  }

  async getIngredientCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('category')
        .not('category', 'is', null)
        .eq('is_active', true)

      if (error) throw error

      // Get unique categories
      const categories = [...new Set((data || []).map(item => item.category).filter(Boolean))]
      return categories.sort()
    } catch (error) {
      console.error('Error fetching ingredient categories:', error)
      throw error
    }
  }

  async getMenuItemIngredients(menuItemId: string): Promise<MenuItemIngredient[]> {
    try {
      const { data, error } = await supabase
        .from('menu_item_ingredients')
        .select(`
          *,
          ingredients (
            id,
            name,
            unit,
            unit_cost,
            category
          )
        `)
        .eq('menu_item_id', menuItemId)
        .order('created_at')

      if (error) throw error

      return (data || []).map(item => ({
        ...item,
        ingredient: item.ingredients as Ingredient
      }))
    } catch (error) {
      console.error('Error fetching menu item ingredients:', error)
      throw error
    }
  }

  async addMenuItemIngredient(data: {
    menu_item_id: string
    ingredient_id: string
    quantity_needed: number
    unit: string
    preparation_notes?: string
    is_required?: boolean
    alternative_group?: string
  }): Promise<MenuItemIngredient> {
    try {
      const { data: result, error } = await supabase
        .from('menu_item_ingredients')
        .insert([data])
        .select(`
          *,
          ingredients (
            id,
            name,
            unit,
            unit_cost,
            category
          )
        `)
        .single()

      if (error) throw error

      return {
        ...result,
        ingredient: result.ingredients as Ingredient
      }
    } catch (error) {
      console.error('Error adding menu item ingredient:', error)
      throw error
    }
  }

  async updateMenuItemIngredient(
    id: string,
    data: Partial<{
      quantity_needed: number
      unit: string
      preparation_notes: string
      is_required: boolean
      alternative_group: string
    }>
  ): Promise<MenuItemIngredient> {
    try {
      const { data: result, error } = await supabase
        .from('menu_item_ingredients')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          ingredients (
            id,
            name,
            unit,
            unit_cost,
            category
          )
        `)
        .single()

      if (error) throw error

      return {
        ...result,
        ingredient: result.ingredients as Ingredient
      }
    } catch (error) {
      console.error('Error updating menu item ingredient:', error)
      throw error
    }
  }

  async removeMenuItemIngredient(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('menu_item_ingredients')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error removing menu item ingredient:', error)
      throw error
    }
  }

  // CRUD operations for ingredients
  async createIngredient(data: {
    name: string
    code: string
    category: string
    unit: string
    unit_conversion?: number
    current_stock?: number
    min_stock_level: number
    max_stock_level?: number
    reorder_point?: number
    reorder_quantity?: number
    unit_cost: number
    notes?: string
  }): Promise<Ingredient> {
    try {
      const { data: result, error } = await supabase
        .from('ingredients')
        .insert([{
          ...data,
          is_active: true
        }])
        .select()
        .single()

      if (error) throw error

      return result
    } catch (error) {
      console.error('Error creating ingredient:', error)
      throw error
    }
  }

  async updateIngredient(id: string, data: Partial<Ingredient>): Promise<Ingredient> {
    try {
      const { data: result, error } = await supabase
        .from('ingredients')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return result
    } catch (error) {
      console.error('Error updating ingredient:', error)
      throw error
    }
  }

  async deleteIngredient(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting ingredient:', error)
      throw error
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  calculateIngredientCost(ingredient: Ingredient, quantity: number): number {
    const unitCost = ingredient.unit_cost || ingredient.last_purchase_price || ingredient.average_cost || 0
    return unitCost * quantity
  }
}

export const ingredientService = new IngredientService()