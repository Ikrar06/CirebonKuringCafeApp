'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Supplier {
  id: string
  company_name: string
  contact_person?: string
  phone_primary: string
  phone_secondary?: string
  email?: string
  address?: string
  city?: string
  business_type?: string
  tax_id?: string
  payment_terms?: string
  payment_methods?: string[]
  bank_account?: string
  bank_name?: string
  delivery_rating?: number
  quality_rating?: number
  price_rating?: number
  total_purchases?: number
  is_active: boolean
  is_preferred: boolean
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface StockMovement {
  id: string
  ingredient_id: string
  ingredient_name?: string
  movement_type: 'purchase' | 'usage' | 'waste' | 'adjustment' | 'initial' | 'return'
  quantity: number
  unit?: string
  reference_type?: string
  reference_id?: string
  unit_cost?: number
  total_cost?: number
  stock_before?: number
  stock_after?: number
  supplier_id?: string
  supplier_name?: string
  batch_number?: string
  manufacturing_date?: string
  expiry_date?: string
  reason?: string
  notes?: string
  performed_by?: string
  device_id?: string
  created_at?: string
}

export interface StockBatch {
  id: string
  ingredient_id: string
  ingredient_name?: string
  batch_number: string
  supplier_id?: string
  supplier_name?: string
  purchase_order_id?: string
  initial_quantity: number
  remaining_quantity: number
  unit: string
  unit_cost: number
  received_date: string
  manufacturing_date?: string
  expiry_date?: string
  is_active: boolean
  is_expired: boolean
  created_at?: string
  updated_at?: string
}

export interface IngredientWithStock {
  id: string
  name: string
  code?: string
  category?: string
  unit: string
  current_stock: number
  min_stock_level: number
  max_stock_level?: number
  reorder_point?: number
  reorder_quantity?: number
  unit_cost: number
  last_purchase_price?: number
  average_cost?: number
  is_active: boolean
  stock_status?: 'critical' | 'low' | 'optimal' | 'high'
  days_until_reorder?: number
}

export interface InventoryStats {
  total_ingredients: number
  low_stock_items: number
  out_of_stock_items: number
  expiring_soon: number
  total_value: number
}

export interface StockPrediction {
  ingredient_id: string
  ingredient_name: string
  current_stock: number
  average_daily_usage: number
  predicted_days_remaining: number
  recommended_reorder_quantity: number
  predicted_stockout_date?: string
}

class InventoryService {
  // Suppliers
  async getSuppliers(filters?: {
    is_active?: boolean
    is_preferred?: boolean
    search?: string
  }): Promise<Supplier[]> {
    try {
      // Build query params
      const params = new URLSearchParams()
      if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
      if (filters?.is_preferred !== undefined) params.append('is_preferred', String(filters.is_preferred))
      if (filters?.search) params.append('search', filters.search)

      // Fetch from API route which uses service role key
      const response = await fetch(`/api/suppliers?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch suppliers')
      }

      const { data } = await response.json()

      return data || []
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      throw error
    }
  }

  async getSupplier(id: string): Promise<Supplier | null> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching supplier:', error)
      throw error
    }
  }

  // Stock Movements
  async getStockMovements(filters?: {
    ingredient_id?: string
    movement_type?: string
    start_date?: string
    end_date?: string
    limit?: number
  }): Promise<StockMovement[]> {
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          ingredients (
            name
          ),
          suppliers (
            company_name
          )
        `)
        .order('created_at', { ascending: false })

      if (filters?.ingredient_id) {
        query = query.eq('ingredient_id', filters.ingredient_id)
      }

      if (filters?.movement_type) {
        query = query.eq('movement_type', filters.movement_type)
      }

      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date)
      }

      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(item => ({
        ...item,
        ingredient_name: (item.ingredients as any)?.name,
        supplier_name: (item.suppliers as any)?.company_name
      }))
    } catch (error) {
      console.error('Error fetching stock movements:', error)
      throw error
    }
  }

  async createStockMovement(movementData: {
    ingredient_id: string
    movement_type: 'purchase' | 'usage' | 'waste' | 'adjustment' | 'initial' | 'return'
    quantity: number
    unit?: string
    unit_cost?: number
    supplier_id?: string
    batch_number?: string
    expiry_date?: string
    reason?: string
    notes?: string
  }): Promise<StockMovement> {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert([movementData])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating stock movement:', error)
      throw error
    }
  }

  // Stock Batches
  async getStockBatches(filters?: {
    ingredient_id?: string
    is_active?: boolean
    expiring_soon?: boolean
  }): Promise<StockBatch[]> {
    try {
      let query = supabase
        .from('stock_batches')
        .select(`
          *,
          ingredients (
            name
          ),
          suppliers (
            company_name
          )
        `)
        .order('expiry_date', { ascending: true })

      if (filters?.ingredient_id) {
        query = query.eq('ingredient_id', filters.ingredient_id)
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      if (filters?.expiring_soon) {
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
        query = query.lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        query = query.gt('expiry_date', new Date().toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(item => ({
        ...item,
        ingredient_name: (item.ingredients as any)?.name,
        supplier_name: (item.suppliers as any)?.company_name
      }))
    } catch (error) {
      console.error('Error fetching stock batches:', error)
      throw error
    }
  }

  // Ingredients with Stock Info
  async getIngredientsWithStock(filters?: {
    category?: string
    stock_status?: 'critical' | 'low' | 'optimal' | 'high'
    search?: string
  }): Promise<IngredientWithStock[]> {
    try {
      // Build query params
      const params = new URLSearchParams()
      params.append('is_active', 'true')
      if (filters?.category) params.append('category', filters.category)
      if (filters?.search) params.append('search', filters.search)

      // Fetch from API route which uses service role key
      const response = await fetch(`/api/ingredients?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch ingredients')
      }

      const { data } = await response.json()

      // Calculate stock status
      const ingredientsWithStatus: IngredientWithStock[] = (data || []).map((ingredient: any) => {
        const currentStock = ingredient.current_stock || 0
        const minStock = ingredient.min_stock_level || 0
        const reorderPoint = ingredient.reorder_point || minStock * 1.5

        let stock_status: 'critical' | 'low' | 'optimal' | 'high' = 'optimal'

        if (currentStock === 0) {
          stock_status = 'critical'
        } else if (currentStock <= minStock) {
          stock_status = 'critical'
        } else if (currentStock <= reorderPoint) {
          stock_status = 'low'
        } else if (ingredient.max_stock_level && currentStock >= ingredient.max_stock_level) {
          stock_status = 'high'
        }

        return {
          ...ingredient,
          stock_status
        }
      })

      // Filter by stock status if specified
      if (filters?.stock_status) {
        return ingredientsWithStatus.filter(i => i.stock_status === filters.stock_status)
      }

      return ingredientsWithStatus
    } catch (error) {
      console.error('Error fetching ingredients with stock:', error)
      throw error
    }
  }

  // Inventory Stats
  async getInventoryStats(): Promise<InventoryStats> {
    try {
      const { data: ingredients, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      const stats: InventoryStats = {
        total_ingredients: ingredients?.length || 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        expiring_soon: 0,
        total_value: 0
      }

      ingredients?.forEach(ingredient => {
        const currentStock = ingredient.current_stock || 0
        const reorderPoint = ingredient.reorder_point || ingredient.min_stock_level || 0

        if (currentStock === 0) {
          stats.out_of_stock_items++
          stats.low_stock_items++
        } else if (currentStock <= reorderPoint) {
          stats.low_stock_items++
        }

        stats.total_value += currentStock * (ingredient.unit_cost || 0)
      })

      // Get expiring batches
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { data: expiringBatches } = await supabase
        .from('stock_batches')
        .select('id')
        .eq('is_active', true)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gt('expiry_date', new Date().toISOString().split('T')[0])

      stats.expiring_soon = expiringBatches?.length || 0

      return stats
    } catch (error) {
      console.error('Error fetching inventory stats:', error)
      throw error
    }
  }

  // Stock Predictions
  async getStockPredictions(ingredientIds?: string[]): Promise<StockPrediction[]> {
    try {
      // Get ingredient data
      let ingredientQuery = supabase
        .from('ingredients')
        .select('*')
        .eq('is_active', true)

      if (ingredientIds && ingredientIds.length > 0) {
        ingredientQuery = ingredientQuery.in('id', ingredientIds)
      }

      const { data: ingredients, error: ingredientError } = await ingredientQuery

      if (ingredientError) throw ingredientError

      // Get recent usage data (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const predictions: StockPrediction[] = []

      for (const ingredient of ingredients || []) {
        // Get usage movements
        const { data: movements } = await supabase
          .from('stock_movements')
          .select('quantity, created_at')
          .eq('ingredient_id', ingredient.id)
          .eq('movement_type', 'usage')
          .gte('created_at', thirtyDaysAgo.toISOString())

        // Calculate average daily usage
        const totalUsage = movements?.reduce((sum, m) => sum + Math.abs(m.quantity), 0) || 0
        const averageDailyUsage = totalUsage / 30 // Use 30 days for consistency

        // Calculate days remaining
        const currentStock = ingredient.current_stock || 0
        const daysRemaining = averageDailyUsage > 0 ? currentStock / averageDailyUsage : 999

        // Calculate predicted stockout date
        let predictedStockoutDate
        if (daysRemaining < 999) {
          const stockoutDate = new Date()
          stockoutDate.setDate(stockoutDate.getDate() + Math.floor(daysRemaining))
          predictedStockoutDate = stockoutDate.toISOString().split('T')[0]
        }

        predictions.push({
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          current_stock: currentStock,
          average_daily_usage: Math.round(averageDailyUsage * 100) / 100,
          predicted_days_remaining: Math.floor(daysRemaining),
          recommended_reorder_quantity: ingredient.reorder_quantity || Math.ceil(averageDailyUsage * 14), // 2 weeks supply
          predicted_stockout_date: predictedStockoutDate
        })
      }

      // Sort by days remaining (urgent first)
      predictions.sort((a, b) => a.predicted_days_remaining - b.predicted_days_remaining)

      return predictions
    } catch (error) {
      console.error('Error getting stock predictions:', error)
      throw error
    }
  }

  // Utility functions
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  getStockStatusColor(status: 'critical' | 'low' | 'optimal' | 'high'): string {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'low':
        return 'bg-orange-100 text-orange-800'
      case 'optimal':
        return 'bg-green-100 text-green-800'
      case 'high':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  getStockStatusLabel(status: 'critical' | 'low' | 'optimal' | 'high'): string {
    switch (status) {
      case 'critical':
        return 'Critical'
      case 'low':
        return 'Low Stock'
      case 'optimal':
        return 'Optimal'
      case 'high':
        return 'Overstock'
      default:
        return 'Unknown'
    }
  }
}

export const inventoryService = new InventoryService()