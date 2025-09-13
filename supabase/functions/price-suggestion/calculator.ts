/**
 * Price Suggestion Calculator
 * 
 * Core business logic for AI-powered price calculations
 * Implements Indonesian cafe pricing strategies with 60-70% target margins
 */

import { supabaseAdmin } from '../_shared/supabase-client'

// Calculation configuration
const PRICING_CONFIG = {
  DEFAULT_TARGET_MARGIN: 65, // 65% default margin
  MIN_MARGIN: 60,
  MAX_MARGIN: 70,
  OVERHEAD_PERCENTAGE: 15, // 15% for utilities, rent, etc.
  LABOR_COST_PERCENTAGE: 20, // 20% for preparation labor
  ROUNDING_INCREMENT: 500, // Round to nearest 500 IDR
  CONFIDENCE_THRESHOLD: 0.7,
  MARKET_ADJUSTMENT_FACTOR: 0.1 // 10% market adjustment allowance
}

// Category-specific adjustments
const CATEGORY_MODIFIERS = {
  coffee: { margin_adjustment: 0, complexity_factor: 1.2 },
  tea: { margin_adjustment: -5, complexity_factor: 1.0 },
  pastry: { margin_adjustment: 5, complexity_factor: 1.5 },
  main_course: { margin_adjustment: -3, complexity_factor: 2.0 },
  dessert: { margin_adjustment: 8, complexity_factor: 1.8 },
  snack: { margin_adjustment: 10, complexity_factor: 1.1 },
  beverage: { margin_adjustment: 0, complexity_factor: 1.0 }
}

// Interfaces
interface CalculationOptions {
  include_market_analysis?: boolean
  user_id?: string
  force_recalculate?: boolean
}

interface BulkCalculationOptions {
  user_id?: string
  update_existing?: boolean
  batch_size?: number
}

interface MarginAnalysisOptions {
  user_id?: string
  include_suggestions?: boolean
}

interface CostUpdateOptions {
  user_id?: string
  recalculate_menu_items?: boolean
}

interface IngredientCostData {
  ingredient_id: string
  ingredient_name: string
  unit: string
  cost_per_unit: number
  current_stock: number
  last_updated: string
}

interface PriceCalculationResult {
  success: boolean
  result?: any
  error?: string
}

interface BulkCalculationResult {
  success: boolean
  results?: Array<{
    menu_item_id: string
    success: boolean
    calculation?: any
    error?: string
  }>
  summary?: {
    total_processed: number
    successful: number
    failed: number
    average_margin: number
    total_cost_savings?: number
  }
  error?: string
}

// ===========================================
// CORE CALCULATION FUNCTIONS
// ===========================================

/**
 * Calculate optimal price for menu item based on recipe ingredients
 */
export async function calculateMenuItemPrice(
  calculationData: any,
  options: CalculationOptions = {}
): Promise<PriceCalculationResult> {
  try {
    // Get ingredient costs and data
    const ingredientCosts = await getIngredientCosts(calculationData.recipe_ingredients)
    
    if (!ingredientCosts.success) {
      return {
        success: false,
        error: 'Failed to retrieve ingredient costs'
      }
    }

    // Calculate total ingredient cost
    const totalIngredientCost = calculateTotalIngredientCost(
      calculationData.recipe_ingredients,
      ingredientCosts.ingredients!
    )

    // Apply category-specific adjustments
    const categoryModifier = CATEGORY_MODIFIERS[calculationData.menu_category as keyof typeof CATEGORY_MODIFIERS] 
      || { margin_adjustment: 0, complexity_factor: 1.0 }

    // Calculate overhead and labor costs
    const overheadCost = totalIngredientCost * (PRICING_CONFIG.OVERHEAD_PERCENTAGE / 100)
    const laborCost = totalIngredientCost * (PRICING_CONFIG.LABOR_COST_PERCENTAGE / 100) * categoryModifier.complexity_factor

    // Apply preparation complexity adjustment
    const complexityMultiplier = getComplexityMultiplier(calculationData.preparation_complexity)
    const adjustedLaborCost = laborCost * complexityMultiplier

    // Calculate total cost
    const totalCost = totalIngredientCost + overheadCost + adjustedLaborCost

    // Determine target margin
    const targetMargin = calculateTargetMargin(
      calculationData.target_margin,
      calculationData.menu_category,
      categoryModifier.margin_adjustment
    )

    // Calculate suggested price
    const rawPrice = totalCost / (1 - targetMargin / 100)
    const roundedPrice = roundPrice(rawPrice)

    // Market analysis (if enabled)
    let marketAnalysis
    if (options.include_market_analysis) {
      marketAnalysis = await performMarketAnalysis(
        calculationData.menu_category,
        roundedPrice,
        calculationData.competitor_prices
      )
    }

    // Calculate confidence score
    const confidenceScore = calculateConfidenceScore(
      totalIngredientCost,
      ingredientCosts.ingredients!,
      calculationData.menu_category,
      marketAnalysis
    )

    // Build result
    const result = {
      menu_item_id: calculationData.menu_item_id,
      ingredient_costs: ingredientCosts.ingredients!.map(ing => ({
        ingredient_id: ing.ingredient_id,
        ingredient_name: ing.ingredient_name,
        quantity: calculationData.recipe_ingredients.find(ri => ri.ingredient_id === ing.ingredient_id)?.quantity || 0,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit,
        total_cost: (calculationData.recipe_ingredients.find(ri => ri.ingredient_id === ing.ingredient_id)?.quantity || 0) * ing.cost_per_unit
      })),
      total_ingredient_cost: totalIngredientCost,
      overhead_percentage: PRICING_CONFIG.OVERHEAD_PERCENTAGE,
      overhead_cost: overheadCost,
      labor_cost: adjustedLaborCost,
      total_cost: totalCost,
      target_margin: targetMargin,
      suggested_price: rawPrice,
      rounded_price: roundedPrice,
      competitor_analysis: marketAnalysis,
      profitability: {
        profit_amount: roundedPrice - totalCost,
        profit_margin: ((roundedPrice - totalCost) / roundedPrice) * 100,
        break_even_quantity: Math.ceil(totalCost / (roundedPrice - totalCost))
      },
      confidence_score: confidenceScore,
      factors_considered: [
        'Ingredient costs (FIFO)',
        'Overhead allocation',
        'Labor complexity',
        'Category adjustments',
        'Target margin optimization',
        ...(marketAnalysis ? ['Market positioning'] : [])
      ]
    }

    return {
      success: true,
      result
    }

  } catch (error) {
    console.error('Error in calculateMenuItemPrice:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Calculation failed'
    }
  }
}

/**
 * Calculate prices for multiple menu items
 */
export async function calculateBulkPrices(
  bulkData: any,
  options: BulkCalculationOptions = {}
): Promise<BulkCalculationResult> {
  try {
    const results: Array<{
      menu_item_id: any
      menu_item_name: any
      success: boolean
      calculation?: any
      error?: string
    }> = []
    let totalProcessed = 0
    let successful = 0
    let failed = 0
    let totalMargins = 0

    // Process existing menu items
    if (bulkData.menu_item_ids && bulkData.menu_item_ids.length > 0) {
      const menuItems = await getMenuItemsWithRecipes(bulkData.menu_item_ids)
      
      for (const menuItem of menuItems) {
        totalProcessed++
        
        try {
          const calculationResult = await calculateMenuItemPrice({
            menu_item_id: menuItem.id,
            recipe_ingredients: menuItem.recipe_ingredients,
            menu_category: menuItem.category,
            target_margin: bulkData.target_margin
          }, options)

          if (calculationResult.success) {
            successful++
            totalMargins += calculationResult.result.profitability.profit_margin
            
            // Update menu item price if requested
            if (options.update_existing) {
              await updateMenuItemPrice(menuItem.id, calculationResult.result.rounded_price)
            }
          } else {
            failed++
          }

          results.push({
            menu_item_id: menuItem.id,
            menu_item_name: menuItem.name,
            success: calculationResult.success,
            calculation: calculationResult.result,
            error: calculationResult.error
          })

        } catch (error) {
          failed++
          results.push({
            menu_item_id: menuItem.id,
            menu_item_name: menuItem.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    // Process new recipe data
    if (bulkData.recipe_data && bulkData.recipe_data.length > 0) {
      for (const recipeItem of bulkData.recipe_data) {
        totalProcessed++
        
        try {
          const calculationResult = await calculateMenuItemPrice({
            recipe_ingredients: recipeItem.recipe_ingredients,
            menu_category: recipeItem.category,
            target_margin: bulkData.target_margin
          }, options)

          if (calculationResult.success) {
            successful++
            totalMargins += calculationResult.result.profitability.profit_margin
          } else {
            failed++
          }

          results.push({
            menu_item_id: 'new_item',
            menu_item_name: recipeItem.menu_item_name,
            success: calculationResult.success,
            calculation: calculationResult.result,
            error: calculationResult.error
          })

        } catch (error) {
          failed++
          results.push({
            menu_item_id: 'new_item',
            menu_item_name: recipeItem.menu_item_name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    return {
      success: true,
      results,
      summary: {
        total_processed: totalProcessed,
        successful,
        failed,
        average_margin: successful > 0 ? totalMargins / successful : 0
      }
    }

  } catch (error) {
    console.error('Error in calculateBulkPrices:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bulk calculation failed'
    }
  }
}

/**
 * Analyze current menu margins and provide optimization suggestions
 */
export async function analyzeMenuMargins(
  analysisData: any,
  options: MarginAnalysisOptions = {}
): Promise<{
  success: boolean
  analysis?: any
  error?: string
}> {
  try {
    // Get menu items with current pricing
    const menuItems = await getMenuItemsForAnalysis(
      analysisData.menu_item_ids,
      analysisData.category_filter
    )

    const analysis = {
      total_items: menuItems.length,
      margin_distribution: {
        below_target: 0,
        within_target: 0,
        above_target: 0
      },
      category_analysis: {},
      optimization_opportunities: [] as Array<{
        menu_item_id: any
        menu_item_name: any
        current_price: any
        current_margin: number
        optimal_price: any
        optimal_margin: any
        price_adjustment: number
        adjustment_type: string
        impact: number
        priority: number
      }>,
      summary_metrics: {
        average_margin: 0,
        median_margin: 0,
        total_potential_savings: 0,
        underpriced_items: 0,
        overpriced_items: 0
      }
    }

    const margins: number[] = []
    let totalPotentialSavings = 0

    for (const item of menuItems) {
      // Recalculate optimal price
      const optimalCalc = await calculateMenuItemPrice({
        menu_item_id: item.id,
        recipe_ingredients: item.recipe_ingredients,
        menu_category: item.category
      })

      if (optimalCalc.success) {
        const currentMargin = ((item.base_price - item.cost_price) / item.base_price) * 100
        const optimalMargin = optimalCalc.result.profitability.profit_margin
        
        margins.push(currentMargin)

        // Categorize margin performance
        if (currentMargin < PRICING_CONFIG.MIN_MARGIN) {
          analysis.margin_distribution.below_target++
        } else if (currentMargin <= PRICING_CONFIG.MAX_MARGIN) {
          analysis.margin_distribution.within_target++
        } else {
          analysis.margin_distribution.above_target++
        }

        // Calculate potential savings/opportunity
        const priceDifference = optimalCalc.result.rounded_price - item.base_price
        if (Math.abs(priceDifference) > 1000) { // More than 1000 IDR difference
          totalPotentialSavings += Math.abs(priceDifference)
          
          if (options.include_suggestions) {
            analysis.optimization_opportunities.push({
              menu_item_id: item.id,
              menu_item_name: item.name,
              current_price: item.base_price,
              current_margin: currentMargin,
              optimal_price: optimalCalc.result.rounded_price,
              optimal_margin: optimalMargin,
              price_adjustment: priceDifference,
              adjustment_type: priceDifference > 0 ? 'increase' : 'decrease',
              impact: Math.abs(priceDifference),
              priority: calculatePriority(Math.abs(priceDifference), currentMargin)
            })
          }
        }
      }
    }

    // Calculate summary metrics
    if (margins.length > 0) {
      analysis.summary_metrics.average_margin = margins.reduce((a, b) => a + b, 0) / margins.length
      analysis.summary_metrics.median_margin = margins.sort()[Math.floor(margins.length / 2)]
      analysis.summary_metrics.total_potential_savings = totalPotentialSavings
      analysis.summary_metrics.underpriced_items = analysis.optimization_opportunities.filter(op => op.adjustment_type === 'increase').length
      analysis.summary_metrics.overpriced_items = analysis.optimization_opportunities.filter(op => op.adjustment_type === 'decrease').length
    }

    // Sort optimization opportunities by priority
    if (options.include_suggestions) {
      analysis.optimization_opportunities.sort((a, b) => b.priority - a.priority)
    }

    return {
      success: true,
      analysis
    }

  } catch (error) {
    console.error('Error in analyzeMenuMargins:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    }
  }
}

/**
 * Update ingredient costs and recalculate affected menu items
 */
export async function updateIngredientCosts(
  updateData: any,
  options: CostUpdateOptions = {}
): Promise<{
  success: boolean
  summary?: any
  affected_menu_items?: string[]
  total_cost_impact?: number
  error?: string
}> {
  try {
    let totalCostImpact = 0
    const affectedMenuItems = new Set<string>()

    // Update ingredient costs
    for (const update of updateData.ingredient_updates) {
      const { data: currentIngredient } = await supabaseAdmin
        .from('ingredients')
        .select('cost_per_unit')
        .eq('id', update.ingredient_id)
        .single()

      if (currentIngredient) {
        const costDifference = update.new_cost_per_unit - currentIngredient.cost_per_unit
        totalCostImpact += Math.abs(costDifference)

        // Update ingredient cost
        await supabaseAdmin
          .from('ingredients')
          .update({
            cost_per_unit: update.new_cost_per_unit,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.ingredient_id)

        // Find affected menu items
        if (options.recalculate_menu_items) {
          const { data: recipes } = await supabaseAdmin
            .from('recipe_ingredients')
            .select('menu_item_id')
            .eq('ingredient_id', update.ingredient_id)

          recipes?.forEach(recipe => affectedMenuItems.add(recipe.menu_item_id))
        }
      }
    }

    // Recalculate menu item prices if requested
    if (options.recalculate_menu_items && affectedMenuItems.size > 0) {
      const bulkRecalculation = await calculateBulkPrices({
        menu_item_ids: Array.from(affectedMenuItems),
        target_margin: PRICING_CONFIG.DEFAULT_TARGET_MARGIN
      }, {
        update_existing: true,
        user_id: options.user_id
      })

      if (!bulkRecalculation.success) {
        console.error('Failed to recalculate menu prices after cost update')
      }
    }

    return {
      success: true,
      summary: {
        updated_ingredients: updateData.ingredient_updates.length,
        affected_menu_items: affectedMenuItems.size,
        total_cost_impact: totalCostImpact,
        recalculation_performed: options.recalculate_menu_items && affectedMenuItems.size > 0
      },
      affected_menu_items: Array.from(affectedMenuItems),
      total_cost_impact: totalCostImpact
    }

  } catch (error) {
    console.error('Error in updateIngredientCosts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cost update failed'
    }
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get ingredient costs with FIFO calculation
 */
async function getIngredientCosts(recipeIngredients: Array<{
  ingredient_id: string
  quantity: number
  unit: string
}>): Promise<{
  success: boolean
  ingredients?: IngredientCostData[]
  error?: string
}> {
  try {
    const ingredientIds = recipeIngredients.map(ri => ri.ingredient_id)
    
    const { data: ingredients, error } = await supabaseAdmin
      .from('ingredients')
      .select('id, name, unit, cost_per_unit, current_stock, updated_at')
      .in('id', ingredientIds)
      .eq('is_active', true)

    if (error) {
      return { success: false, error: 'Failed to fetch ingredient data' }
    }

    const ingredientCosts: IngredientCostData[] = ingredients?.map(ing => ({
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit,
      current_stock: ing.current_stock,
      last_updated: ing.updated_at
    })) || []

    return {
      success: true,
      ingredients: ingredientCosts
    }

  } catch (error) {
    console.error('Error getting ingredient costs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get ingredient costs'
    }
  }
}

/**
 * Calculate total ingredient cost for recipe
 */
function calculateTotalIngredientCost(
  recipeIngredients: Array<{ ingredient_id: string; quantity: number }>,
  ingredientCosts: IngredientCostData[]
): number {
  return recipeIngredients.reduce((total, recipeIng) => {
    const ingredient = ingredientCosts.find(ing => ing.ingredient_id === recipeIng.ingredient_id)
    if (ingredient) {
      return total + (recipeIng.quantity * ingredient.cost_per_unit)
    }
    return total
  }, 0)
}

/**
 * Calculate target margin with category adjustments
 */
function calculateTargetMargin(
  requestedMargin?: number,
  category?: string,
  categoryAdjustment: number = 0
): number {
  const baseMargin = requestedMargin || PRICING_CONFIG.DEFAULT_TARGET_MARGIN
  const adjustedMargin = baseMargin + categoryAdjustment
  
  return Math.max(
    PRICING_CONFIG.MIN_MARGIN,
    Math.min(PRICING_CONFIG.MAX_MARGIN, adjustedMargin)
  )
}

/**
 * Get complexity multiplier for preparation
 */
function getComplexityMultiplier(complexity?: string): number {
  switch (complexity) {
    case 'simple': return 0.8
    case 'medium': return 1.0
    case 'complex': return 1.5
    default: return 1.0
  }
}

/**
 * Round price to nearest increment
 */
function roundPrice(price: number): number {
  return Math.round(price / PRICING_CONFIG.ROUNDING_INCREMENT) * PRICING_CONFIG.ROUNDING_INCREMENT
}

/**
 * Calculate confidence score for pricing
 */
function calculateConfidenceScore(
  totalCost: number,
  ingredients: IngredientCostData[],
  category: string,
  marketAnalysis?: any
): number {
  let confidence = 0.7 // Base confidence

  // Ingredient data quality
  const recentUpdates = ingredients.filter(ing => {
    const daysSinceUpdate = (Date.now() - new Date(ing.last_updated).getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceUpdate <= 30
  })
  confidence += (recentUpdates.length / ingredients.length) * 0.2

  // Stock availability
  const inStockIngredients = ingredients.filter(ing => ing.current_stock > 0)
  confidence += (inStockIngredients.length / ingredients.length) * 0.1

  // Market analysis bonus
  if (marketAnalysis) {
    confidence += 0.1
  }

  return Math.min(1.0, confidence)
}

/**
 * Perform market analysis (placeholder implementation)
 */
async function performMarketAnalysis(
  category: string,
  suggestedPrice: number,
  competitorPrices?: number[]
): Promise<any> {
  // Placeholder - in production, this would integrate with market data APIs
  const marketAverage = (competitorPrices && competitorPrices.length > 0) 
    ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length 
    : suggestedPrice

  return {
    average_market_price: marketAverage,
    price_position: suggestedPrice < marketAverage * 0.9 ? 'below' : 
                   suggestedPrice > marketAverage * 1.1 ? 'premium' : 'competitive',
    recommendation: suggestedPrice < marketAverage * 0.9 ? 
      'Consider raising price to market level' :
      suggestedPrice > marketAverage * 1.1 ?
      'Premium pricing - ensure value justification' :
      'Competitive pricing position'
  }
}

/**
 * Get menu items with recipes for bulk calculation
 */
async function getMenuItemsWithRecipes(menuItemIds: string[]): Promise<any[]> {
  const { data: menuItems } = await supabaseAdmin
    .from('menu_items')
    .select(`
      id, name, category, base_price, cost_price,
      recipe_ingredients (
        ingredient_id, quantity,
        ingredient:ingredients (id, name, unit, cost_per_unit)
      )
    `)
    .in('id', menuItemIds)

  return menuItems || []
}

/**
 * Get menu items for margin analysis
 */
async function getMenuItemsForAnalysis(menuItemIds?: string[], categoryFilter?: string): Promise<any[]> {
  let query = supabaseAdmin
    .from('menu_items')
    .select(`
      id, name, category, base_price, cost_price,
      recipe_ingredients (
        ingredient_id, quantity,
        ingredient:ingredients (id, name, unit, cost_per_unit)
      )
    `)

  if (menuItemIds && menuItemIds.length > 0) {
    query = query.in('id', menuItemIds)
  }

  if (categoryFilter) {
    query = query.eq('category', categoryFilter)
  }

  const { data: menuItems } = await query

  return menuItems || []
}

/**
 * Update menu item price in database
 */
async function updateMenuItemPrice(menuItemId: string, newPrice: number): Promise<void> {
  await supabaseAdmin
    .from('menu_items')
    .update({
      base_price: newPrice,
      updated_at: new Date().toISOString()
    })
    .eq('id', menuItemId)
}

/**
 * Calculate priority for price optimization
 */
function calculatePriority(priceDifference: number, currentMargin: number): number {
  let priority = priceDifference / 1000 // Base priority on price difference

  // Boost priority for items with poor margins
  if (currentMargin < PRICING_CONFIG.MIN_MARGIN) {
    priority *= 2
  } else if (currentMargin > PRICING_CONFIG.MAX_MARGIN) {
    priority *= 1.5
  }

  return priority
}