/**
 * Inventory-related Database Queries
 * 
 * Centralized queries for inventory management, stock movements,
 * supplier management, and inventory analytics with FIFO tracking
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../shared-types/src/database'
import { QueryBuilder, dbUtils } from '../client'

// Type definitions from database schema
type Ingredient = Database['public']['Tables']['ingredients']['Row']
type StockMovement = Database['public']['Tables']['stock_movements']['Row']
type StockBatch = Database['public']['Tables']['stock_batches']['Row']
type Supplier = Database['public']['Tables']['suppliers']['Row']
type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']
// Note: Using stock_movements for waste tracking instead of separate waste_records table

// Extended types for business logic
interface IngredientWithStock extends Ingredient {
  stock_batches: StockBatch[]
  recent_movements: StockMovement[]
  total_value: number
  days_until_expiry: number | null
  reorder_needed: boolean
  supplier?: Supplier
}

interface InventoryValuation {
  ingredient_id: string
  ingredient_name: string
  current_stock: number
  unit_cost: number
  total_value: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock'
  expiry_status: 'fresh' | 'expiring_soon' | 'expired'
  last_movement_date: string | null
}

interface InventoryAnalytics {
  total_value: number
  total_ingredients: number
  low_stock_count: number
  out_of_stock_count: number
  expired_items: number
  expiring_soon: number
  waste_value_30days: number
  turnover_rate: number
  top_consumed: Array<{
    ingredient_id: string
    name: string
    consumption_30days: number
    value: number
  }>
}

interface StockAlert {
  type: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' | 'overstock'
  ingredient_id: string
  ingredient_name: string
  current_stock: number
  threshold: number
  expiry_date?: string
  days_until_expiry?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Inventory Query Service
 */
export class InventoryQueries {
  private queryBuilder: QueryBuilder<Ingredient>

  constructor(private client: SupabaseClient<Database>) {
    this.queryBuilder = new QueryBuilder(client, 'ingredients')
  }

  /**
   * Get all ingredients with stock details
   */
  async getIngredientsWithStock(options: {
    include_inactive?: boolean
    stock_status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
    expiry_filter?: 'all' | 'fresh' | 'expiring_soon' | 'expired'
    supplier_id?: string
    search?: string
  } = {}): Promise<{ data: IngredientWithStock[] | null; error: any }> {
    let query = ((this.client as any) as any)
      .from('ingredients')
      .select(`
        *,
        stock_batches (
          id, batch_number, quantity, unit_cost, expiry_date, received_date, status
        ),
        stock_movements (
          id, type, quantity, created_at
        ),
        suppliers (
          id, name, contact_person, phone
        )
      `)

    // All ingredients are considered active since there's no is_active field
    // if (!options.include_inactive) {
    //   query = query.eq('is_active', true)
    // }

    if (options.supplier_id) {
      query = query.eq('supplier_id', options.supplier_id)
    }

    if (options.search) {
      query = query.ilike('name', `%${options.search}%`)
    }

    // Order by name
    query = query.order('name', { ascending: true })

    const { data: ingredients, error } = await query

    if (error) return { data: null, error }

    // Process and filter results
    const processedIngredients = (ingredients || []).map((ingredient: any) => {
      const totalValue = ingredient.current_stock * ingredient.unit_cost
      const daysUntilExpiry = this.calculateDaysUntilExpiry(ingredient.stock_batches || [])
      const reorderNeeded = ingredient.current_stock <= ingredient.min_stock

      return {
        ...ingredient,
        total_value: totalValue,
        days_until_expiry: daysUntilExpiry,
        reorder_needed: reorderNeeded
      }
    })

    // Apply stock status filter
    let filteredIngredients = processedIngredients
    if (options.stock_status && options.stock_status !== 'all') {
      filteredIngredients = processedIngredients.filter((ingredient: any) => {
        switch (options.stock_status) {
          case 'in_stock':
            return ingredient.current_stock > ingredient.min_stock
          case 'low_stock':
            return ingredient.current_stock <= ingredient.min_stock && ingredient.current_stock > 0
          case 'out_of_stock':
            return ingredient.current_stock <= 0
          default:
            return true
        }
      })
    }

    // Apply expiry filter
    if (options.expiry_filter && options.expiry_filter !== 'all') {
      filteredIngredients = filteredIngredients.filter((ingredient: any) => {
        const expiryStatus = this.getExpiryStatus(ingredient.days_until_expiry)
        return expiryStatus === options.expiry_filter
      })
    }

    return { data: filteredIngredients, error: null }
  }

  /**
   * Record stock movement with FIFO handling
   */
  async recordStockMovement(movementData: {
    ingredient_id: string
    type: 'stock_in' | 'stock_out'
    quantity: number
    unit_cost?: number
    reference_type: 'purchase_order' | 'order_consumption' | 'waste' | 'adjustment'
    reference_id?: string
    batch_number?: string
    expiry_date?: string
    reason?: string
    notes?: string
    performed_by: string
  }): Promise<{ data: StockMovement | null; error: any }> {
    try {
      const totalCost = (movementData.unit_cost || 0) * movementData.quantity

      // Create stock movement record
      const { data: movement, error: movementError } = await (this.client as any)
        .from('stock_movements')
        .insert({
          ingredient_id: movementData.ingredient_id,
          type: movementData.type,
          quantity: movementData.quantity,
          unit_cost: movementData.unit_cost || 0,
          total_cost: totalCost,
          reference_type: movementData.reference_type,
          reference_id: movementData.reference_id,
          batch_number: movementData.batch_number,
          expiry_date: movementData.expiry_date,
          reason: movementData.reason,
          notes: movementData.notes,
          performed_by: movementData.performed_by,
          created_at: dbUtils.formatDate(new Date())
        })
        .select()
        .single()

      if (movementError) return { data: null, error: movementError }

      // Handle stock batch operations
      if (movementData.type === 'stock_in') {
        await this.handleStockIn(movementData)
      } else {
        await this.handleStockOut(movementData)
      }

      // Update ingredient current stock
      await this.updateIngredientStock(movementData.ingredient_id)

      return { data: movement, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get inventory valuation
   */
  async getInventoryValuation(options: {
    as_of_date?: string
    include_inactive?: boolean
  } = {}): Promise<{ data: InventoryValuation[] | null; error: any }> {
    const { data: ingredients, error } = await this.getIngredientsWithStock({
      include_inactive: options.include_inactive
    })

    if (error || !ingredients) {
      return { data: null, error }
    }

    const valuation: InventoryValuation[] = ingredients.map(ingredient => {
      const stockStatus = this.determineStockStatus(ingredient)
      const expiryStatus = this.getExpiryStatus(ingredient.days_until_expiry)
      const lastMovement = ingredient.recent_movements?.[0]

      return {
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        current_stock: ingredient.current_stock,
        unit_cost: ingredient.unit_cost,
        total_value: ingredient.total_value,
        stock_status: stockStatus,
        expiry_status: expiryStatus,
        last_movement_date: lastMovement?.created_at || null
      }
    })

    return { data: valuation, error: null }
  }

  /**
   * Get stock alerts
   */
  async getStockAlerts(): Promise<{ data: StockAlert[] | null; error: any }> {
    const { data: ingredients, error } = await this.getIngredientsWithStock()

    if (error || !ingredients) {
      return { data: null, error }
    }

    const alerts: StockAlert[] = []

    ingredients.forEach(ingredient => {
      // Low stock alerts
      if (ingredient.current_stock <= ingredient.min_stock && ingredient.current_stock > 0) {
        alerts.push({
          type: 'low_stock',
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          current_stock: ingredient.current_stock,
          threshold: ingredient.min_stock,
          severity: ingredient.current_stock <= (ingredient.min_stock * 0.5) ? 'high' : 'medium'
        })
      }

      // Out of stock alerts
      if (ingredient.current_stock <= 0) {
        alerts.push({
          type: 'out_of_stock',
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          current_stock: ingredient.current_stock,
          threshold: ingredient.min_stock,
          severity: 'critical'
        })
      }

      // Expiry alerts
      if (ingredient.days_until_expiry !== null) {
        if (ingredient.days_until_expiry <= 0) {
          alerts.push({
            type: 'expired',
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.name,
            current_stock: ingredient.current_stock,
            threshold: 0,
            days_until_expiry: ingredient.days_until_expiry,
            severity: 'critical'
          })
        } else if (ingredient.days_until_expiry <= 3) {
          alerts.push({
            type: 'expiring_soon',
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.name,
            current_stock: ingredient.current_stock,
            threshold: 3,
            days_until_expiry: ingredient.days_until_expiry,
            severity: 'high'
          })
        }
      }

      // Overstock alerts
      if (ingredient.max_stock > 0 && ingredient.current_stock > ingredient.max_stock) {
        alerts.push({
          type: 'overstock',
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          current_stock: ingredient.current_stock,
          threshold: ingredient.max_stock,
          severity: 'low'
        })
      }
    })

    // Sort by severity
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    alerts.sort((a: any, b: any) => severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder])

    return { data: alerts, error: null }
  }

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(options: {
    period_days?: number
  } = {}): Promise<{ data: InventoryAnalytics | null; error: any }> {
    try {
      const periodDays = options.period_days || 30
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - periodDays)

      // Get current inventory
      const { data: ingredients } = await this.getIngredientsWithStock()
      
      // Get recent movements for consumption analysis
      const { data: movements } = await (this.client as any)
        .from('stock_movements')
        .select(`
          ingredient_id, quantity, total_cost, created_at,
          ingredient:ingredients (
            id, name
          )
        `)
        .eq('type', 'stock_out')
        .gte('created_at', dbUtils.formatDate(dateFrom))

      // Get waste records
      const { data: wasteRecords } = await (this.client as any)
        .from('waste_records')
        .select('total_value')
        .gte('created_at', dbUtils.formatDate(dateFrom))

      if (!ingredients) {
        return { data: null, error: 'Failed to get inventory data' }
      }

      // Calculate basic metrics
      const totalValue = ingredients.reduce((sum, ing) => sum + ing.total_value, 0)
      const lowStockCount = ingredients.filter(ing => 
        ing.current_stock <= ing.min_stock && ing.current_stock > 0
      ).length
      const outOfStockCount = ingredients.filter(ing => ing.current_stock <= 0).length
      
      const expiredItems = ingredients.filter(ing => 
        ing.days_until_expiry !== null && ing.days_until_expiry <= 0
      ).length
      
      const expiringSoon = ingredients.filter(ing => 
        ing.days_until_expiry !== null && ing.days_until_expiry > 0 && ing.days_until_expiry <= 7
      ).length

      const wasteValue = wasteRecords?.reduce((sum: number, record: any) => sum + (record.total_cost || 0), 0) || 0

      // Calculate consumption and top consumed items
      const consumptionMap = new Map<string, { name: string; consumption: number; value: number }>()
      
      movements?.forEach((movement: any) => {
        if (!movement.ingredient) return
        
        const key = movement.ingredient_id
        const existing = consumptionMap.get(key) || {
          name: movement.ingredient.name,
          consumption: 0,
          value: 0
        }
        
        existing.consumption += movement.quantity
        existing.value += movement.total_cost
        consumptionMap.set(key, existing)
      })

      const topConsumed = Array.from(consumptionMap.entries())
        .map(([ingredient_id, data]) => ({ ingredient_id, ...data }))
        .sort((a, b) => b.consumption - a.consumption)
        .slice(0, 10)

      // Calculate turnover rate (simplified)
      const totalConsumptionValue = topConsumed.reduce((sum, item) => sum + item.value, 0)
      const turnoverRate = totalValue > 0 ? (totalConsumptionValue / totalValue) * (365 / periodDays) : 0

      const analytics: InventoryAnalytics = {
        total_value: Math.round(totalValue),
        total_ingredients: ingredients.length,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        expired_items: expiredItems,
        expiring_soon: expiringSoon,
        waste_value_30days: Math.round(wasteValue),
        turnover_rate: Math.round(turnoverRate * 100) / 100,
        top_consumed: topConsumed.map(item => ({
          ...item,
          consumption_30days: Math.round(item.consumption),
          value: Math.round(item.value)
        }))
      }

      return { data: analytics, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Process purchase order receipt
   */
  async processPurchaseOrderReceipt(receiptData: {
    purchase_order_id: string
    received_items: Array<{
      ingredient_id: string
      quantity_received: number
      unit_cost: number
      expiry_date?: string
      batch_number?: string
      quality_notes?: string
    }>
    received_by: string
  }): Promise<{ data: any; error: any }> {
    try {
      const results = []

      for (const item of receiptData.received_items) {
        // Record stock movement
        const movement = await this.recordStockMovement({
          ingredient_id: item.ingredient_id,
          type: 'stock_in',
          quantity: item.quantity_received,
          unit_cost: item.unit_cost,
          reference_type: 'purchase_order',
          reference_id: receiptData.purchase_order_id,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          notes: item.quality_notes,
          performed_by: receiptData.received_by
        })

        results.push(movement)
      }

      // Update purchase order status
      await (this.client as any)
        .from('purchase_orders')
        .update({
          status: 'delivered',
          actual_delivery_date: dbUtils.formatDate(new Date()),
          received_by: receiptData.received_by,
          updated_at: dbUtils.formatDate(new Date())
        })
        .eq('id', receiptData.purchase_order_id)

      return { data: results, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Record waste
   */
  async recordWaste(wasteData: {
    ingredient_id: string
    quantity: number
    waste_type: 'expired' | 'damaged' | 'spoiled' | 'over_preparation'
    reason: string
    batch_number?: string
    reported_by: string
  }): Promise<{ data: any | null; error: any }> {
    try {
      // Get ingredient cost
      const { data: ingredient } = await this.queryBuilder.findById(wasteData.ingredient_id)
      
      if (!ingredient) {
        return { data: null, error: 'Ingredient not found' }
      }

      const totalValue = wasteData.quantity * ingredient.unit_cost

      // Create waste record
      const { data: wasteRecord, error: wasteError } = await (this.client as any)
        .from('waste_records')
        .insert({
          ingredient_id: wasteData.ingredient_id,
          ingredient_name: ingredient.name,
          quantity: wasteData.quantity,
          unit_cost: ingredient.unit_cost,
          total_value: totalValue,
          waste_type: wasteData.waste_type,
          reason: wasteData.reason,
          batch_number: wasteData.batch_number,
          reported_by: wasteData.reported_by,
          created_at: dbUtils.formatDate(new Date())
        })
        .select()
        .single()

      if (wasteError) {
        return { data: null, error: wasteError }
      }

      // Record stock movement
      await this.recordStockMovement({
        ingredient_id: wasteData.ingredient_id,
        type: 'stock_out',
        quantity: wasteData.quantity,
        unit_cost: ingredient.unit_cost,
        reference_type: 'waste',
        reference_id: wasteRecord.id,
        reason: `Waste: ${wasteData.reason}`,
        performed_by: wasteData.reported_by
      })

      return { data: wasteRecord, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Get reorder suggestions
   */
  async getReorderSuggestions(options: {
    lead_time_days?: number
    safety_stock_multiplier?: number
  } = {}): Promise<{ data: Array<{
    ingredient_id: string
    ingredient_name: string
    current_stock: number
    minimum_stock: number
    suggested_quantity: number
    estimated_cost: number
    supplier_info?: {
      name: string
      contact_person: string
      phone: string
      delivery_days: number
    }
    urgency: 'low' | 'medium' | 'high' | 'critical'
  }> | null; error: any }> {
    try {
      const leadTimeDays = options.lead_time_days || 7
      const safetyMultiplier = options.safety_stock_multiplier || 1.5

      // Get ingredients that need reordering
      const { data: ingredients } = await (this.client as any)
        .from('ingredients')
        .select(`
          *,
          supplier:suppliers (
            name, contact_person, phone, delivery_days
          )
        `)
        .lte('current_stock', dbUtils.sanitizeInput('minimum_stock * 1.5'))
        // All ingredients are considered active
        // .eq('is_active', true)

      if (!ingredients) return { data: null, error: 'Failed to get ingredients' }

      // Calculate consumption rates (last 30 days)
      const consumptionRates = await this.calculateConsumptionRates(
        ingredients.map((ing: any) => ing.id)
      )

      const suggestions = ingredients.map((ingredient: any) => {
        const consumptionRate = consumptionRates.get(ingredient.id) || 0
        const leadTimeConsumption = consumptionRate * leadTimeDays
        const safetyStock = ingredient.min_stock * safetyMultiplier
        
        const suggestedQuantity = Math.max(
          ingredient.max_stock - ingredient.current_stock,
          leadTimeConsumption + safetyStock - ingredient.current_stock
        )

        const estimatedCost = suggestedQuantity * ingredient.unit_cost

        // Determine urgency
        let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low'
        if (ingredient.current_stock <= 0) {
          urgency = 'critical'
        } else if (ingredient.current_stock <= ingredient.min_stock * 0.5) {
          urgency = 'high'
        } else if (ingredient.current_stock <= ingredient.min_stock) {
          urgency = 'medium'
        }

        return {
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          current_stock: ingredient.current_stock,
          minimum_stock: ingredient.min_stock,
          suggested_quantity: Math.round(suggestedQuantity),
          estimated_cost: Math.round(estimatedCost),
          supplier_info: ingredient.supplier,
          urgency
        }
      })

      // Sort by urgency
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      suggestions.sort((a: any, b: any) => urgencyOrder[b.urgency as keyof typeof urgencyOrder] - urgencyOrder[a.urgency as keyof typeof urgencyOrder])

      return { data: suggestions, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Private helper methods
   */
  private async handleStockIn(movementData: any): Promise<void> {
    // Create stock batch for FIFO tracking
    await (this.client as any)
      .from('stock_batches')
      .insert({
        ingredient_id: movementData.ingredient_id,
        batch_number: movementData.batch_number || `BATCH_${Date.now()}`,
        quantity_received: movementData.quantity,
        quantity: movementData.quantity,
        unit_cost: movementData.unit_cost || 0,
        expiry_date: movementData.expiry_date,
        received_date: dbUtils.formatDate(new Date()),
        status: 'active'
      })
  }

  private async handleStockOut(movementData: any): Promise<void> {
    // FIFO stock deduction
    let remainingQuantity = movementData.quantity

    const { data: batches } = await (this.client as any)
      .from('stock_batches')
      .select('*')
      .eq('ingredient_id', movementData.ingredient_id)
      .eq('status', 'active')
      .gt('quantity', 0)
      .order('received_date', { ascending: true })

    for (const batch of batches || []) {
      if (remainingQuantity <= 0) break

      const deductAmount = Math.min(remainingQuantity, batch.quantity)
      const newRemaining = batch.quantity - deductAmount

      await (this.client as any)
        .from('stock_batches')
        .update({
          quantity: newRemaining,
          status: newRemaining <= 0 ? 'consumed' : 'active'
        })
        .eq('id', batch.id)

      remainingQuantity -= deductAmount
    }
  }

  private async updateIngredientStock(ingredientId: string): Promise<void> {
    // Calculate current stock from active batches
    const { data: batches } = await (this.client as any)
      .from('stock_batches')
      .select('quantity')
      .eq('ingredient_id', ingredientId)
      .eq('status', 'active')

    const currentStock = batches?.reduce((sum: number, batch: any) => sum + batch.quantity, 0) || 0

    await (this.client as any)
      .from('ingredients')
      .update({ current_stock: currentStock })
      .eq('id', ingredientId)
  }

  private calculateDaysUntilExpiry(batches: StockBatch[]): number | null {
    if (!batches || batches.length === 0) return null

    const earliestExpiry = batches
      .filter(batch => batch.expiry_date && batch.quantity > 0)
      .map(batch => new Date(batch.expiry_date!).getTime())
      .filter(time => !isNaN(time))

    if (earliestExpiry.length === 0) return null

    const earliest = Math.min(...earliestExpiry)
    const now = new Date().getTime()
    
    return Math.ceil((earliest - now) / (1000 * 60 * 60 * 24))
  }

  private determineStockStatus(ingredient: IngredientWithStock): 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock' {
    if (ingredient.current_stock <= 0) return 'out_of_stock'
    if (ingredient.current_stock <= ingredient.min_stock) return 'low_stock'
    if (ingredient.max_stock > 0 && ingredient.current_stock > ingredient.max_stock) return 'overstock'
    return 'in_stock'
  }

  private getExpiryStatus(daysUntilExpiry: number | null): 'fresh' | 'expiring_soon' | 'expired' {
    if (daysUntilExpiry === null) return 'fresh'
    if (daysUntilExpiry <= 0) return 'expired'
    if (daysUntilExpiry <= 7) return 'expiring_soon'
    return 'fresh'
  }

  private async calculateConsumptionRates(ingredientIds: string[]): Promise<Map<string, number>> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: movements } = await (this.client as any)
      .from('stock_movements')
      .select('ingredient_id, quantity')
      .in('ingredient_id', ingredientIds)
      .eq('type', 'out')
      .gte('created_at', dbUtils.formatDate(thirtyDaysAgo))

    const rates = new Map<string, number>()

    movements?.forEach((movement: any) => {
      const current = rates.get(movement.ingredient_id) || 0
      rates.set(movement.ingredient_id, current + movement.quantity)
    })

    // Convert to daily rates
    rates.forEach((total, id) => {
      rates.set(id, total / 30)
    })

    return rates
  }
}

/**
 * Factory function to create InventoryQueries instance
 */
export function createInventoryQueries(client: SupabaseClient<Database>): InventoryQueries {
  return new InventoryQueries(client)
}

// Export types
export type {
  Ingredient,
  StockMovement,
  StockBatch,
  Supplier,
  PurchaseOrder,
  IngredientWithStock,
  InventoryValuation,
  InventoryAnalytics,
  StockAlert
}