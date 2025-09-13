/**
 * Menu-related Database Queries
 * 
 * Centralized queries for menu management, recipe tracking,
 * customizations, and menu analytics for Indonesian cafe
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../shared-types/src/database'
import { QueryBuilder, dbUtils } from '../client'

// Type definitions from database schema
type MenuItem = Database['public']['Tables']['menu_items']['Row']
type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuItemIngredient = Database['public']['Tables']['menu_item_ingredients']['Row']
type MenuCustomizationGroup = Database['public']['Tables']['menu_customization_groups']['Row']
type MenuCustomizationOption = Database['public']['Tables']['menu_customization_options']['Row']

// Extended types for business logic
interface MenuItemWithDetails extends MenuItem {
  category: MenuCategory
  menu_item_ingredients: (MenuItemIngredient & {
    ingredient: {
      id: string
      name: string
      unit: string
      unit_cost: number
      current_stock: number
    }
  })[]
  customization_groups: (MenuCustomizationGroup & {
    options: MenuCustomizationOption[]
  })[]
}

interface MenuItemWithCost extends MenuItemWithDetails {
  calculated_cost: number
  suggested_price: number
  current_margin: number
  stock_status: 'available' | 'low_stock' | 'out_of_stock'
}

interface MenuAnalytics {
  total_items: number
  available_items: number
  categories_count: number
  average_price: number
  price_range: { min: number; max: number }
  popular_items: Array<{
    menu_item_id: string
    name: string
    orders_count: number
    revenue: number
  }>
  category_performance: Array<{
    category: string
    items_count: number
    avg_price: number
    popularity_score: number
  }>
}

/**
 * Menu Query Service
 */
export class MenuQueries {
  private queryBuilder: QueryBuilder<MenuItem>

  constructor(private client: SupabaseClient<Database>) {
    this.queryBuilder = new QueryBuilder(client, 'menu_items')
  }

  /**
   * Get all menu items with complete details
   */
  async getMenuItemsWithDetails(options: {
    category?: string
    is_available?: boolean
    include_inactive?: boolean
    search?: string
  } = {}): Promise<{ data: MenuItemWithDetails[] | null; error: any }> {
    let query = (this.client as any)
      .from('menu_items')
      .select(`
        *,
        category:menu_categories!category_id (
          id, name, sort_order, is_active
        ),
        menu_item_ingredients (
          id, quantity, unit, cost,
          ingredient:ingredients (
            id, name, unit, unit_cost, current_stock, min_stock
          )
        ),
        menu_customization_groups (
          id, name, type, is_required, min_selections, max_selections, sort_order,
          menu_menu_customization_options (
            id, name, price_modifier, is_default, sort_order
          )
        )
      `)

    // Apply filters
    if (options.category) {
      query = query.eq('category', options.category)
    }

    if (options.is_available !== undefined) {
      if (options.is_available) {
        query = query.eq('status', 'active')
      } else {
        query = query.in('status', ['inactive', 'out_of_stock', 'discontinued'])
      }
    }

    if (!options.include_inactive) {
      query = query.eq('status', 'active')
    }

    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`)
    }

    // Order by category and sort order
    query = query.order('sort_order', { ascending: true })

    return await query
  }

  /**
   * Get single menu item with all details
   */
  async getMenuItemById(menuItemId: string): Promise<{ data: MenuItemWithDetails | null; error: any }> {
    return await (this.client as any)
      .from('menu_items')
      .select(`
        *,
        category:menu_categories!category_id (
          id, name, sort_order, is_active
        ),
        menu_item_ingredients (
          id, quantity, unit, cost,
          ingredient:ingredients (
            id, name, unit, unit_cost, current_stock, min_stock
          )
        ),
        menu_customization_groups (
          id, name, type, is_required, min_selections, max_selections, sort_order,
          menu_menu_customization_options (
            id, name, price_modifier, is_default, sort_order
          )
        )
      `)
      .eq('id', menuItemId)
      .single()
  }

  /**
   * Get menu items with calculated costs and stock status
   */
  async getMenuItemsWithCost(): Promise<{ data: MenuItemWithCost[] | null; error: any }> {
    const { data: menuItems, error } = await this.getMenuItemsWithDetails()
    
    if (error || !menuItems) {
      return { data: null, error }
    }

    const menuItemsWithCost: MenuItemWithCost[] = menuItems.map((item: any) => {
      // Calculate ingredient cost
      const calculatedCost = (item.menu_item_ingredients || []).reduce(
        (total: number, recipeIng: any) => {
          if (!recipeIng.ingredient) return total
          return total + (recipeIng.quantity * recipeIng.ingredient.unit_cost)
        }, 
        0
      )

      // Calculate suggested price with 65% margin
      const targetMargin = 0.65
      const suggestedPrice = calculatedCost / (1 - targetMargin)

      // Calculate current margin
      const currentMargin = item.price > 0 
        ? ((item.price - calculatedCost) / item.price) * 100
        : 0

      // Determine stock status
      const stockStatus = this.determineStockStatus(item.menu_item_ingredients || [])

      return {
        ...item,
        calculated_cost: Math.round(calculatedCost),
        suggested_price: Math.round(suggestedPrice / 500) * 500, // Round to nearest 500
        current_margin: Math.round(currentMargin * 100) / 100,
        stock_status: stockStatus
      }
    })

    return { data: menuItemsWithCost, error: null }
  }

  /**
   * Create menu item with recipe and customizations
   */
  async createMenuItem(menuData: {
    name: string
    description: string
    category: string
    price: number
    image_url?: string
    preparation_time: number
    is_spicy?: boolean
    is_vegetarian?: boolean
    is_halal?: boolean
    tags?: string[]
    menu_item_ingredients: Array<{
      ingredient_id: string
      quantity: number
      notes?: string
    }>
    customizations?: Array<{
      name: string
      type: 'single_select' | 'multi_select' | 'numeric'
      is_required: boolean
      min_selections: number
      max_selections: number
      options: Array<{
        name: string
        price_modifier: number
        is_default: boolean
      }>
    }>
  }): Promise<{ data: MenuItemWithDetails | null; error: any }> {
    try {
      // Create menu item
      const { data: menuItem, error: menuError } = await (this.client as any)
        .from('menu_items')
        .insert({
          name: menuData.name,
          description: menuData.description,
          category: menuData.category,
          price: menuData.price,
          image_url: menuData.image_url,
          preparation_time: menuData.preparation_time,
          is_spicy: menuData.is_spicy || false,
          is_vegetarian: menuData.is_vegetarian || false,
          is_halal: menuData.is_halal !== false, // Default to true
          tags: menuData.tags || [],
          status: 'active',
          created_at: dbUtils.formatDate(new Date())
        })
        .select()
        .single()

      if (menuError || !menuItem) {
        return { data: null, error: menuError }
      }

      // Create recipe ingredients
      if (menuData.menu_item_ingredients.length > 0) {
        const recipeIngredients = menuData.menu_item_ingredients.map(ing => ({
          menu_item_id: menuItem.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          notes: ing.notes
        }))

        const { error: recipeError } = await (this.client as any)
          .from('menu_item_ingredients')
          .insert(recipeIngredients)

        if (recipeError) {
          // Rollback menu item
          await (this.client as any).from('menu_items').delete().eq('id', menuItem.id)
          return { data: null, error: recipeError }
        }
      }

      // Create customizations
      if (menuData.customizations && menuData.customizations.length > 0) {
        for (const customization of menuData.customizations) {
          const { data: customizationRecord, error: customizationError } = await (this.client as any)
            .from('menu_customization_groups')
            .insert({
              menu_item_id: menuItem.id,
              name: customization.name,
              type: customization.type,
              is_required: customization.is_required,
              min_selections: customization.min_selections,
              max_selections: customization.max_selections,
              is_active: true
            })
            .select()
            .single()

          if (customizationError) {
            // Continue with other customizations
            continue
          }

          // Create customization options
          const options = customization.options.map((option, index) => ({
            customization_id: customizationRecord.id,
            name: option.name,
            price_modifier: option.price_modifier,
            is_default: option.is_default,
            sort_order: index,
            is_active: true
          }))

          await (this.client as any)
            .from('menu_customization_options')
            .insert(options)
        }
      }

      // Return complete menu item
      return await this.getMenuItemById(menuItem.id)

    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to create menu item', details: error }
      }
    }
  }

  /**
   * Update menu item availability
   */
  async updateMenuItemAvailability(
    menuItemId: string, 
    isAvailable: boolean,
    reason?: string
  ): Promise<{ data: MenuItem | null; error: any }> {
    return await this.queryBuilder.updateById(menuItemId, {
      status: isAvailable ? 'active' : 'inactive',
      // availability_reason: reason, // Field doesn't exist in schema
      updated_at: dbUtils.formatDate(new Date())
    })
  }

  /**
   * Bulk update menu prices
   */
  async bulkUpdatePrices(updates: Array<{
    menu_item_id: string
    new_price: number
  }>): Promise<{ data: MenuItem[] | null; error: any }> {
    try {
      const results = []

      for (const update of updates) {
        const { data: updated, error } = await this.queryBuilder.updateById(
          update.menu_item_id,
          { 
            price: update.new_price,
            updated_at: dbUtils.formatDate(new Date())
          }
        )

        if (error) {
          console.error(`Failed to update price for ${update.menu_item_id}:`, error)
          continue
        }

        if (updated) results.push(updated)
      }

      return { data: results, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get menu categories with item counts
   */
  async getMenuCategories(): Promise<{ data: Array<MenuCategory & { items_count: number }> | null; error: any }> {
    const { data: categories, error: categoryError } = await (this.client as any)
      .from('menu_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (categoryError) {
      return { data: null, error: categoryError }
    }

    // Get item counts for each category
    const categoriesWithCounts = await Promise.all(
      (categories || []).map(async (category: any) => {
        const { count } = await (this.client as any)
          .from('menu_items')
          .select('*', { count: 'exact', head: true })
          .eq('category', category.name)
          .eq('is_active', true)

        return {
          ...category,
          items_count: count || 0
        }
      })
    )

    return { data: categoriesWithCounts, error: null }
  }

  /**
   * Search menu items
   */
  async searchMenuItems(searchTerm: string, options: {
    category?: string
    available_only?: boolean
    limit?: number
  } = {}): Promise<{ data: MenuItemWithDetails[] | null; error: any }> {
    let query = (this.client as any)
      .from('menu_items')
      .select(`
        *,
        category:menu_categories!category_id (
          id, name, sort_order
        ),
        menu_item_ingredients (
          id, quantity,
          ingredient:ingredients (
            id, name, unit, current_stock, min_stock
          )
        ),
        customizations:menu_customization_groups (
          id, name, type, is_required,
          options:menu_customization_options (
            id, name, price_modifier, is_default
          )
        )
      `)

    // Search by name, description, or tags
    if (searchTerm.trim()) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
    }

    if (options.category) {
      query = query.eq('category', options.category)
    }

    if (options.available_only) {
      query = query.eq('status', true)
    }

    query = query.eq('is_active', true)

    if (options.limit) {
      query = query.limit(options.limit)
    }

    query = query.order('sort_order', { ascending: true })

    return await query
  }

  /**
   * Get menu analytics
   */
  async getMenuAnalytics(options: {
    date_from?: string
    date_to?: string
  } = {}): Promise<{ data: MenuAnalytics | null; error: any }> {
    try {
      // Get basic menu stats
      const { data: menuItems } = await (this.client as any)
        .from('menu_items')
        .select('id, name, category, price, status')

      const { data: categories } = await (this.client as any)
        .from('menu_categories')
        .select('name')
        .eq('is_active', true)

      // Get order statistics
      let orderQuery = (this.client as any)
        .from('order_items')
        .select(`
          quantity, total_price,
          menu_item:menu_items (
            id, name, category
          ),
          order:orders!inner (
            status
          )
        `)
        .eq('order.status', 'served')

      if (options.date_from) {
        orderQuery = orderQuery.gte('order.created_at', options.date_from)
      }

      if (options.date_to) {
        orderQuery = orderQuery.lte('order.created_at', options.date_to)
      }

      const { data: orderItems } = await orderQuery

      // Calculate analytics
      const analytics: MenuAnalytics = {
        total_items: menuItems?.filter((item: any) => item.status === 'active').length || 0,
        available_items: menuItems?.filter((item: any) => item.status === 'active').length || 0,
        categories_count: categories?.length || 0,
        average_price: 0,
        price_range: { min: 0, max: 0 },
        popular_items: [],
        category_performance: []
      }

      if (menuItems && menuItems.length > 0) {
        const activePrices = menuItems
          .filter((item: any) => item.status === 'active')
          .map((item: any) => item.price)

        analytics.average_price = Math.round(
          activePrices.reduce((sum: number, price: number) => sum + price, 0) / activePrices.length
        )
        analytics.price_range = {
          min: Math.min(...activePrices),
          max: Math.max(...activePrices)
        }
      }

      // Calculate popular items
      if (orderItems && orderItems.length > 0) {
        const itemStats = new Map<string, {
          name: string
          orders_count: number
          revenue: number
        }>()

        orderItems.forEach((orderItem: any) => {
          if (!orderItem.menu_item) return

          const key = orderItem.menu_item.id
          const existing = itemStats.get(key) || {
            name: orderItem.menu_item.name,
            orders_count: 0,
            revenue: 0
          }

          existing.orders_count += orderItem.quantity
          existing.revenue += orderItem.total_price || 0
          itemStats.set(key, existing)
        })

        analytics.popular_items = Array.from(itemStats.entries())
          .map(([menu_item_id, stats]) => ({ menu_item_id, ...stats }))
          .sort((a, b) => b.orders_count - a.orders_count)
          .slice(0, 10)

        // Calculate category performance
        const categoryStats = new Map<string, {
          items_count: number
          total_price: number
          orders_count: number
        }>()

        orderItems.forEach((orderItem: any) => {
          if (!orderItem.menu_item) return

          const category = orderItem.menu_item.category
          const existing = categoryStats.get(category) || {
            items_count: 0,
            total_price: 0,
            orders_count: 0
          }

          existing.orders_count += orderItem.quantity
          existing.total_price += orderItem.total_price || 0
          categoryStats.set(category, existing)
        })

        // Add item counts per category
        menuItems?.forEach((item: any) => {
          if (item.status !== 'active') return

          const existing = categoryStats.get(item.category)
          if (existing) {
            existing.items_count++
          } else {
            categoryStats.set(item.category, {
              items_count: 1,
              total_price: 0,
              orders_count: 0
            })
          }
        })

        analytics.category_performance = Array.from(categoryStats.entries()).map(([category, stats]) => ({
          category,
          items_count: stats.items_count,
          avg_price: stats.items_count > 0 ? Math.round(stats.total_price / stats.orders_count) || 0 : 0,
          popularity_score: stats.orders_count
        }))
      }

      return { data: analytics, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get low stock menu items
   */
  async getLowStockItems(): Promise<{ data: Array<{
    menu_item_id: string
    name: string
    category: string
    affected_ingredients: Array<{
      ingredient_name: string
      current_stock: number
      min_stock: number
    }>
  }> | null; error: any }> {
    const { data: menuItems } = await this.getMenuItemsWithDetails({ is_available: true })
    
    if (!menuItems) return { data: null, error: 'Failed to get menu items' }

    const lowStockItems = menuItems
      .map(item => {
        const affectedIngredients = item.menu_item_ingredients
          .filter(recipeIng => 
            recipeIng.ingredient && 
            recipeIng.ingredient.current_stock <= ((recipeIng.ingredient as any).min_stock || 0)
          )
          .map((recipeIng: any) => ({
            ingredient_name: recipeIng.ingredient.name,
            current_stock: recipeIng.ingredient.current_stock,
            min_stock: (recipeIng.ingredient as any).min_stock || 0
          }))

        return {
          menu_item_id: item.id,
          name: item.name,
          category: item.category.name,
          affected_ingredients: affectedIngredients
        }
      })
      .filter(item => item.affected_ingredients.length > 0)

    return { data: lowStockItems, error: null }
  }

  /**
   * Private helper methods
   */
  private determineStockStatus(recipeIngredients: any[]): 'available' | 'low_stock' | 'out_of_stock' {
    const outOfStock = recipeIngredients.some(recipeIng => 
      recipeIng.ingredient && recipeIng.ingredient.current_stock <= 0
    )

    if (outOfStock) return 'out_of_stock'

    const lowStock = recipeIngredients.some(recipeIng => 
      recipeIng.ingredient && 
      recipeIng.ingredient.current_stock <= ((recipeIng.ingredient as any).min_stock || 0)
    )

    return lowStock ? 'low_stock' : 'available'
  }
}

/**
 * Factory function to create MenuQueries instance
 */
export function createMenuQueries(client: SupabaseClient<Database>): MenuQueries {
  return new MenuQueries(client)
}

// Export types
export type {
  MenuItem,
  MenuCategory,
  MenuItemIngredient,
  MenuCustomizationGroup,
  MenuCustomizationOption,
  MenuItemWithDetails,
  MenuItemWithCost,
  MenuAnalytics
}