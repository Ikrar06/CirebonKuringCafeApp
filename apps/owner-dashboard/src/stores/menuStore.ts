'use client'

import { create } from 'zustand'
import { menuService, MenuItem, MenuCategory, CreateMenuItemData, UpdateMenuItemData } from '@/services/menuService'

interface MenuFilters {
  category_id?: string
  is_available?: boolean
  search?: string
}

interface MenuStats {
  totalItems: number
  availableItems: number
  unavailableItems: number
  categories: number
}

interface MenuStore {
  // State
  items: MenuItem[]
  categories: MenuCategory[]
  stats: MenuStats | null
  filters: MenuFilters
  selectedItems: string[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchMenuItems: () => Promise<void>
  fetchCategories: () => Promise<void>
  fetchStats: () => Promise<void>
  createItem: (itemData: CreateMenuItemData) => Promise<MenuItem>
  updateItem: (itemData: UpdateMenuItemData) => Promise<MenuItem>
  deleteItem: (id: string) => Promise<void>
  toggleItemAvailability: (id: string, isAvailable: boolean) => Promise<void>
  bulkUpdateAvailability: (itemIds: string[], isAvailable: boolean) => Promise<void>

  // Filters and selection
  setFilters: (filters: Partial<MenuFilters>) => void
  clearFilters: () => void
  toggleItemSelection: (id: string) => void
  selectAllItems: () => void
  clearSelection: () => void

  // Utility
  getItemById: (id: string) => MenuItem | undefined
  getItemsByCategory: (categoryId: string) => MenuItem[]
  getAvailableItems: () => MenuItem[]
  getUnavailableItems: () => MenuItem[]

  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  // Initial state
  items: [],
  categories: [],
  stats: null,
  filters: {},
  selectedItems: [],
  isLoading: false,
  error: null,

  // Fetch menu items with current filters
  fetchMenuItems: async () => {
    set({ isLoading: true, error: null })

    try {
      const { filters } = get()
      const items = await menuService.getMenuItems(filters)
      set({ items, isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch menu items'
      set({ error: errorMessage, isLoading: false })
    }
  },

  // Fetch categories
  fetchCategories: async () => {
    try {
      const categories = await menuService.getMenuCategories()
      set({ categories })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories'
      set({ error: errorMessage })
    }
  },

  // Fetch menu statistics
  fetchStats: async () => {
    try {
      const stats = await menuService.getMenuStats()
      set({ stats })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch menu stats'
      set({ error: errorMessage })
    }
  },

  // Create new menu item
  createItem: async (itemData: CreateMenuItemData) => {
    set({ isLoading: true, error: null })

    try {
      const newItem = await menuService.createMenuItem(itemData)
      const { items } = get()
      set({
        items: [...items, newItem],
        isLoading: false
      })

      // Refresh stats
      get().fetchStats()

      return newItem
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create menu item'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // Update menu item
  updateItem: async (itemData: UpdateMenuItemData) => {
    set({ isLoading: true, error: null })

    try {
      const updatedItem = await menuService.updateMenuItem(itemData)
      const { items } = get()
      const updatedItems = items.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      )

      set({
        items: updatedItems,
        isLoading: false
      })

      // Refresh stats
      get().fetchStats()

      return updatedItem
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update menu item'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // Delete menu item
  deleteItem: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      await menuService.deleteMenuItem(id)
      const { items, selectedItems } = get()
      const updatedItems = items.filter(item => item.id !== id)
      const updatedSelection = selectedItems.filter(itemId => itemId !== id)

      set({
        items: updatedItems,
        selectedItems: updatedSelection,
        isLoading: false
      })

      // Refresh stats
      get().fetchStats()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete menu item'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // Toggle single item availability
  toggleItemAvailability: async (id: string, isAvailable: boolean) => {
    try {
      const updatedItem = await menuService.toggleItemAvailability(id, isAvailable)
      const { items } = get()
      const updatedItems = items.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      )

      set({ items: updatedItems })

      // Refresh stats
      get().fetchStats()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle item availability'
      set({ error: errorMessage })
    }
  },

  // Bulk update availability
  bulkUpdateAvailability: async (itemIds: string[], isAvailable: boolean) => {
    set({ isLoading: true, error: null })

    try {
      await menuService.bulkUpdateAvailability(itemIds, isAvailable)
      const { items } = get()
      const updatedItems = items.map(item =>
        itemIds.includes(item.id) ? { ...item, is_available: isAvailable } : item
      )

      set({
        items: updatedItems,
        selectedItems: [], // Clear selection after bulk update
        isLoading: false
      })

      // Refresh stats
      get().fetchStats()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to bulk update availability'
      set({ error: errorMessage, isLoading: false })
    }
  },

  // Set filters and refresh items
  setFilters: (newFilters: Partial<MenuFilters>) => {
    const { filters } = get()
    const updatedFilters = { ...filters, ...newFilters }
    set({ filters: updatedFilters })

    // Automatically fetch items with new filters
    get().fetchMenuItems()
  },

  // Clear all filters
  clearFilters: () => {
    set({ filters: {} })
    get().fetchMenuItems()
  },

  // Toggle item selection
  toggleItemSelection: (id: string) => {
    const { selectedItems } = get()
    const isSelected = selectedItems.includes(id)

    if (isSelected) {
      set({ selectedItems: selectedItems.filter(itemId => itemId !== id) })
    } else {
      set({ selectedItems: [...selectedItems, id] })
    }
  },

  // Select all visible items
  selectAllItems: () => {
    const { items } = get()
    const allItemIds = items.map(item => item.id)
    set({ selectedItems: allItemIds })
  },

  // Clear selection
  clearSelection: () => {
    set({ selectedItems: [] })
  },

  // Utility functions
  getItemById: (id: string) => {
    const { items } = get()
    return items.find(item => item.id === id)
  },

  getItemsByCategory: (categoryId: string) => {
    const { items } = get()
    return items.filter(item => item.category_id === categoryId)
  },

  getAvailableItems: () => {
    const { items } = get()
    return items.filter(item => item.is_available || false)
  },

  getUnavailableItems: () => {
    const { items } = get()
    return items.filter(item => !(item.is_available || false))
  },

  // Error handling
  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  }
}))
