'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import apiClient from '@/lib/api/client'
import { searchMenuItems, sortMenuItems } from '@/components/menu/SearchBar'
import { applyFilters } from '@/components/menu/CategoryFilter'
import type { ActiveFilters } from '@/components/menu/CategoryFilter'
import type { AdvancedSearchFilters } from '@/components/menu/SearchBar'

// Types
import type { MenuItem, MenuCategory } from '@/types/menu'

interface MenuItemExtended extends MenuItem {
  ingredients?: string[]
  search_keywords?: string[]
  nutritional_info?: NutritionalInfo
  total_reviews?: number
  allergens?: string[]
  created_at: string
  updated_at: string
}

interface MenuCategoryExtended extends MenuCategory {
  is_active: boolean
  color?: string
}

interface MenuCustomization {
  id: string
  name: string
  type: 'single' | 'multiple' | 'range'
  category: string
  options: CustomizationOption[]
  required: boolean
  max_selections?: number
}

interface CustomizationOption {
  id: string
  name: string
  price_modifier: number
  is_available: boolean
  description?: string
}

interface NutritionalInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  sugar: number
  caffeine?: number
  is_vegetarian?: boolean
  is_vegan?: boolean
}

interface MenuFilters {
  search: string
  category: string
  activeFilters: ActiveFilters
  sortBy: AdvancedSearchFilters['sortBy']
  showUnavailable: boolean
}

interface UseMenuOptions {
  tableId?: string
  autoRefresh?: boolean
  refreshInterval?: number
  enableRealtime?: boolean
  cacheKey?: string
}

interface UseMenuReturn {
  // Data
  items: MenuItem[]
  categories: MenuCategory[]
  filteredItems: MenuItem[]
  
  // Loading states
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  
  // Filters
  filters: MenuFilters
  setFilters: (filters: Partial<MenuFilters>) => void
  resetFilters: () => void
  
  // Actions
  refreshMenu: () => Promise<void>
  loadMenuCategories: () => Promise<void>
  getMenuItem: (id: string) => MenuItem | undefined
  searchItems: (query: string) => MenuItem[]
  
  // Real-time updates
  subscribeToUpdates: () => void
  unsubscribeFromUpdates: () => void
  
  // Statistics
  stats: MenuStats
  
  // Cache management
  clearCache: () => void
  getLastUpdate: () => Date | null
}

interface MenuStats {
  totalItems: number
  availableItems: number
  categoriesCount: number
  averagePrice: number
  averagePrepTime: number
  mostExpensiveItem?: MenuItem
  cheapestItem?: MenuItem
  quickestItem?: MenuItem
}

const DEFAULT_FILTERS: MenuFilters = {
  search: '',
  category: 'all',
  activeFilters: {
    dietary: [],
    priceRange: [],
    prepTime: [],
    spiceLevel: [],
    availability: false
  },
  sortBy: 'relevance',
  showUnavailable: false
}

const DEFAULT_OPTIONS: UseMenuOptions = {
  autoRefresh: true,
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  enableRealtime: true,
  cacheKey: 'menu-data'
}

export default function useMenu(options: UseMenuOptions = {}): UseMenuReturn {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // State management
  const [items, setItems] = useState<MenuItemExtended[]>([])
  const [categories, setCategories] = useState<MenuCategoryExtended[]>([])
  const [filters, setFiltersState] = useState<MenuFilters>(DEFAULT_FILTERS)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Refs for cleanup
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const subscriptionRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cache keys
  const ITEMS_CACHE_KEY = `${config.cacheKey}-items${config.tableId ? `-${config.tableId}` : ''}`
  const CATEGORIES_CACHE_KEY = `${config.cacheKey}-categories`
  const LAST_UPDATE_KEY = `${config.cacheKey}-last-update`

  // Load initial data
  useEffect(() => {
    loadInitialData()
    
    return () => {
      cleanup()
    }
  }, [config.tableId])

  // Setup auto-refresh
  useEffect(() => {
    if (config.autoRefresh && config.refreshInterval) {
      refreshTimerRef.current = setInterval(() => {
        refreshMenu()
      }, config.refreshInterval)

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current)
        }
      }
    }
  }, [config.autoRefresh, config.refreshInterval])

  // Load initial data from cache and API
  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Try to load from cache first
      const cachedItems = loadFromCache(ITEMS_CACHE_KEY)
      const cachedCategories = loadFromCache(CATEGORIES_CACHE_KEY)
      const cachedLastUpdate = localStorage.getItem(LAST_UPDATE_KEY)

      if (cachedItems && cachedCategories) {
        setItems(cachedItems)
        setCategories(cachedCategories)
        setLastUpdate(cachedLastUpdate ? new Date(cachedLastUpdate) : null)
        
        // Show cached data immediately
        setIsLoading(false)
        
        // Check if cache is stale (older than 10 minutes)
        const cacheAge = cachedLastUpdate ? Date.now() - new Date(cachedLastUpdate).getTime() : Infinity
        if (cacheAge < 10 * 60 * 1000) {
          return // Cache is fresh, no need to fetch
        }
      }

      // Fetch fresh data
      await Promise.all([
        loadMenuItems(),
        loadMenuCategories()
      ])

    } catch (error) {
      console.error('Error loading initial menu data:', error)
      handleError(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load menu items from API
  const loadMenuItems = async () => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      
      const response = await apiClient.getMenu(config.tableId)
      
      if (response.error) {
        throw new Error(response.error.message)
      }

      if (response.data) {
        const menuItems = response.data.map(item => ({
          ...item,
          // Map from API response to our extended type
          category_name: categories.find(cat => cat.id === item.category_id)?.name || 'Lainnya',
          is_available: item.status === 'available',
          is_halal: item.tags?.includes('halal') || true,
          ingredients_available: item.status === 'available',
          // Ensure optional fields have defaults
          description: item.description || '',
          preparation_time: item.preparation_time || 15,
          tags: item.tags || [],
          ingredients: [],
          search_keywords: [],
          customizations: [],
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString()
        }))

        setItems(menuItems)
        saveToCache(ITEMS_CACHE_KEY, menuItems)
        setLastUpdate(new Date())
        localStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString())
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading menu items:', error)
        throw error
      }
    }
  }

  // Load menu categories from API
  const loadMenuCategories = async () => {
    try {
      const response = await apiClient.getMenuCategories()
      
      if (response.error) {
        throw new Error(response.error.message)
      }

      if (response.data) {
        const categories = response.data.map(cat => ({
          ...cat,
          icon: cat.name.toLowerCase().includes('coffee') ? 'coffee' : 
                cat.name.toLowerCase().includes('makanan') ? 'chef-hat' : 'utensils'
        })).filter(category => category.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)

        setCategories(categories)
        saveToCache(CATEGORIES_CACHE_KEY, categories)
      }

    } catch (error: any) {
      console.error('Error loading menu categories:', error)
      throw error
    }
  }

  // Refresh menu data
  const refreshMenu = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      await Promise.all([
        loadMenuItems(),
        loadMenuCategories()
      ])

      toast.success('Menu diperbarui')

    } catch (error) {
      console.error('Error refreshing menu:', error)
      handleError(error)
    } finally {
      setIsRefreshing(false)
    }
  }, [config.tableId])

  // Handle errors
  const handleError = (error: any) => {
    const message = error?.message || 'Gagal memuat menu'
    setError(message)
    toast.error(message)
  }

  // Filter menu items based on current filters
  const filteredItems = useMemo(() => {
    let filtered: MenuItem[] = [...items]

    // Apply search filter
    if (filters.search.trim()) {
      filtered = searchMenuItems(filtered, filters.search)
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category_id === filters.category)
    }

    // Apply advanced filters
    filtered = filtered.filter(item => applyFilters(item, filters.activeFilters))

    // Apply availability filter
    if (!filters.showUnavailable) {
      filtered = filtered.filter(item => item.is_available)
    }

    // Apply sorting
    filtered = sortMenuItems(filtered, filters.sortBy)

    return filtered
  }, [items, filters])

  // Update filters
  const setFilters = useCallback((newFilters: Partial<MenuFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Reset filters
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
  }, [])

  // Get single menu item
  const getMenuItem = useCallback((id: string): MenuItem | undefined => {
    return items.find(item => item.id === id)
  }, [items])

  // Search items (without filters)
  const searchItems = useCallback((query: string): MenuItem[] => {
    return searchMenuItems(items as MenuItem[], query)
  }, [items])

  // Subscribe to real-time updates
  const subscribeToUpdates = useCallback(() => {
    if (!config.enableRealtime || subscriptionRef.current) return

    subscriptionRef.current = apiClient.getSupabase()
      .channel('menu-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items'
        },
        (payload) => {
          
          if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(item => 
              item.id === payload.new.id ? { ...item, ...payload.new } : item
            ))
          } else if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new as MenuItemExtended])
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== payload.old.id))
          }
          
          // Update cache
          setLastUpdate(new Date())
          localStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString())
        }
      )
      .subscribe()
  }, [config.enableRealtime])

  // Unsubscribe from updates
  const unsubscribeFromUpdates = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }
  }, [])

  // Calculate menu statistics
  const stats: MenuStats = useMemo(() => {
    const availableItems = items.filter(item => item.is_available)
    
    return {
      totalItems: items.length,
      availableItems: availableItems.length,
      categoriesCount: categories.length,
      averagePrice: availableItems.length > 0 
        ? Math.round(availableItems.reduce((sum, item) => sum + item.price, 0) / availableItems.length)
        : 0,
      averagePrepTime: availableItems.length > 0
        ? Math.round(availableItems.reduce((sum, item) => sum + (item.preparation_time || 0), 0) / availableItems.length)
        : 0,
      mostExpensiveItem: availableItems.length > 0
        ? availableItems.reduce((max, item) => item.price > max.price ? item : max)
        : undefined,
      cheapestItem: availableItems.length > 0
        ? availableItems.reduce((min, item) => item.price < min.price ? item : min)
        : undefined,
      quickestItem: availableItems.length > 0
        ? availableItems.reduce((min, item) => (item.preparation_time || 0) < (min.preparation_time || 0) ? item : min)
        : undefined
    }
  }, [items, categories])

  // Cache utilities
  const saveToCache = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving to cache:', error)
    }
  }

  const loadFromCache = (key: string) => {
    try {
      const cached = localStorage.getItem(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error loading from cache:', error)
      return null
    }
  }

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(ITEMS_CACHE_KEY)
      localStorage.removeItem(CATEGORIES_CACHE_KEY)
      localStorage.removeItem(LAST_UPDATE_KEY)
      toast.success('Cache menu dihapus')
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }, [ITEMS_CACHE_KEY, CATEGORIES_CACHE_KEY, LAST_UPDATE_KEY])

  const getLastUpdate = useCallback(() => {
    return lastUpdate
  }, [lastUpdate])

  // Cleanup function
  const cleanup = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    unsubscribeFromUpdates()
  }

  return {
    // Data
    items,
    categories,
    filteredItems,
    
    // Loading states
    isLoading,
    isRefreshing,
    error,
    
    // Filters
    filters,
    setFilters,
    resetFilters,
    
    // Actions
    refreshMenu,
    loadMenuCategories,
    getMenuItem,
    searchItems,
    
    // Real-time updates
    subscribeToUpdates,
    unsubscribeFromUpdates,
    
    // Statistics
    stats,
    
    // Cache management
    clearCache,
    getLastUpdate
  }
}

// Custom hooks for specific use cases
export function useMenuSearch(initialQuery: string = '') {
  const [query, setQuery] = useState(initialQuery)
  const { items, isLoading } = useMenu()
  
  const results = useMemo(() => {
    return query.trim() ? searchMenuItems(items, query) : []
  }, [items, query])

  return {
    query,
    setQuery,
    results,
    isLoading,
    hasResults: results.length > 0
  }
}

export function useMenuCategories() {
  const { categories, isLoading, error } = useMenu()
  
  const getCategoryById = useCallback((id: string) => {
    return categories.find(category => category.id === id)
  }, [categories])

  const getCategoryItems = useCallback((categoryId: string) => {
    const { items } = useMenu()
    return items.filter(item => item.category_id === categoryId)
  }, [])

  return {
    categories,
    isLoading,
    error,
    getCategoryById,
    getCategoryItems
  }
}

export function useMenuStats() {
  const { stats, isLoading } = useMenu()
  return { stats, isLoading }
}

export type { MenuItem, MenuCategory, MenuFilters, UseMenuOptions, UseMenuReturn }