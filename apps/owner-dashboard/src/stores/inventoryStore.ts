'use client'

import { create } from 'zustand'
import {
  inventoryService,
  IngredientWithStock,
  StockMovement,
  StockBatch,
  Supplier,
  InventoryStats,
  StockPrediction
} from '@/services/inventoryService'

interface InventoryState {
  // Data
  ingredients: IngredientWithStock[]
  stockMovements: StockMovement[]
  stockBatches: StockBatch[]
  suppliers: Supplier[]
  stats: InventoryStats | null
  predictions: StockPrediction[]

  // UI State
  isLoading: boolean
  error: string | null

  // Filters
  filters: {
    category?: string
    stock_status?: 'critical' | 'low' | 'optimal' | 'high'
    search?: string
  }

  // Actions
  fetchIngredients: (filters?: {
    category?: string
    stock_status?: 'critical' | 'low' | 'optimal' | 'high'
    search?: string
  }) => Promise<void>
  fetchStockMovements: (filters?: {
    ingredient_id?: string
    movement_type?: string
    start_date?: string
    end_date?: string
    limit?: number
  }) => Promise<void>
  fetchStockBatches: (filters?: {
    ingredient_id?: string
    is_active?: boolean
    expiring_soon?: boolean
  }) => Promise<void>
  fetchSuppliers: (filters?: {
    is_active?: boolean
    is_preferred?: boolean
    search?: string
  }) => Promise<void>
  fetchStats: () => Promise<void>
  fetchPredictions: (ingredientIds?: string[]) => Promise<void>
  createStockMovement: (movementData: {
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
  }) => Promise<void>
  setFilters: (filters: {
    category?: string
    stock_status?: 'critical' | 'low' | 'optimal' | 'high'
    search?: string
  }) => void
  clearError: () => void
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  // Initial state
  ingredients: [],
  stockMovements: [],
  stockBatches: [],
  suppliers: [],
  stats: null,
  predictions: [],
  isLoading: false,
  error: null,
  filters: {},

  // Fetch ingredients with stock info
  fetchIngredients: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const ingredients = await inventoryService.getIngredientsWithStock(filters)
      set({ ingredients, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch ingredients',
        isLoading: false
      })
    }
  },

  // Fetch stock movements
  fetchStockMovements: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const movements = await inventoryService.getStockMovements(filters)
      set({ stockMovements: movements, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch stock movements',
        isLoading: false
      })
    }
  },

  // Fetch stock batches
  fetchStockBatches: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const batches = await inventoryService.getStockBatches(filters)
      set({ stockBatches: batches, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch stock batches',
        isLoading: false
      })
    }
  },

  // Fetch suppliers
  fetchSuppliers: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const suppliers = await inventoryService.getSuppliers(filters)
      set({ suppliers, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch suppliers',
        isLoading: false
      })
    }
  },

  // Fetch inventory stats
  fetchStats: async () => {
    try {
      const stats = await inventoryService.getInventoryStats()
      set({ stats })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch stats'
      })
    }
  },

  // Fetch stock predictions
  fetchPredictions: async (ingredientIds) => {
    set({ isLoading: true, error: null })
    try {
      const predictions = await inventoryService.getStockPredictions(ingredientIds)
      set({ predictions, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch predictions',
        isLoading: false
      })
    }
  },

  // Create stock movement
  createStockMovement: async (movementData) => {
    set({ isLoading: true, error: null })
    try {
      await inventoryService.createStockMovement(movementData)

      // Refresh ingredients and movements after creating movement
      await get().fetchIngredients(get().filters)
      await get().fetchStockMovements({ limit: 50 })
      await get().fetchStats()

      set({ isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create stock movement',
        isLoading: false
      })
    }
  },

  // Set filters
  setFilters: (filters) => {
    set({ filters })
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  }
}))