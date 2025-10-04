/**
 * AI-powered price suggestion system for menu items
 * Calculates optimal pricing based on ingredients, market analysis, and business rules
 */

interface Ingredient {
  id: string
  name: string
  cost_per_unit: number
  unit: string
  supplier_id?: string
}

interface MenuIngredient {
  ingredient_id: string
  quantity: number
  ingredient: Ingredient
}

interface MarketData {
  categoryAverage: number
  competitorPrices: number[]
  demandIndex: number
  seasonalMultiplier: number
}

interface PricingSuggestion {
  suggestedPrice: number
  basePrice: number
  ingredientCost: number
  laborCost: number
  overheadCost: number
  margin: number
  marginPercentage: number
  confidence: number
  reasoning: string[]
  alternatives: {
    conservative: number
    aggressive: number
    premium: number
  }
}

interface PricingConfig {
  minMargin: number
  maxMargin: number
  defaultMargin: number
  laborCostPerMinute: number
  overheadMultiplier: number
  categoryMultipliers: Record<string, number>
}

// Default pricing configuration
const DEFAULT_CONFIG: PricingConfig = {
  minMargin: 0.60, // 60% minimum margin
  maxMargin: 0.70, // 70% maximum margin
  defaultMargin: 0.65, // 65% default margin
  laborCostPerMinute: 500, // IDR 500 per minute of preparation
  overheadMultiplier: 0.15, // 15% overhead on ingredient cost
  categoryMultipliers: {
    'coffee': 1.2,
    'tea': 1.1,
    'food': 1.0,
    'dessert': 1.3,
    'beverage': 1.1,
    'specialty': 1.4
  }
}

/**
 * Calculate ingredient cost for a menu item
 */
export function calculateIngredientCost(menuIngredients: MenuIngredient[]): number {
  return menuIngredients.reduce((total, mi) => {
    const unitCost = mi.ingredient.cost_per_unit || 0
    const quantity = mi.quantity || 0
    return total + (unitCost * quantity)
  }, 0)
}

/**
 * Calculate labor cost based on preparation time
 */
export function calculateLaborCost(preparationTimeMinutes: number, config: PricingConfig = DEFAULT_CONFIG): number {
  return preparationTimeMinutes * config.laborCostPerMinute
}

/**
 * Calculate overhead cost as percentage of ingredient cost
 */
export function calculateOverheadCost(ingredientCost: number, config: PricingConfig = DEFAULT_CONFIG): number {
  return ingredientCost * config.overheadMultiplier
}

/**
 * Get market data for price analysis
 * In a real implementation, this would fetch from market research APIs or competitor analysis
 */
export async function getMarketData(category: string, basePrice: number): Promise<MarketData> {
  // Simulated market data - in production, this would come from real market analysis
  const categoryMultiplier = DEFAULT_CONFIG.categoryMultipliers[category.toLowerCase()] || 1.0

  return {
    categoryAverage: basePrice * categoryMultiplier * 1.1,
    competitorPrices: [
      basePrice * 0.9,
      basePrice * 1.1,
      basePrice * 1.2,
      basePrice * 0.95,
      basePrice * 1.15
    ],
    demandIndex: 0.8, // 0-1 scale, 0.8 = high demand
    seasonalMultiplier: 1.0 // No seasonal adjustment for now
  }
}

/**
 * Calculate price suggestion with AI-powered logic
 */
export async function calculatePriceSuggestion(
  menuIngredients: MenuIngredient[],
  preparationTimeMinutes: number,
  category: string,
  currentPrice?: number,
  config: PricingConfig = DEFAULT_CONFIG
): Promise<PricingSuggestion> {
  // Calculate base costs
  const ingredientCost = calculateIngredientCost(menuIngredients)
  const laborCost = calculateLaborCost(preparationTimeMinutes, config)
  const overheadCost = calculateOverheadCost(ingredientCost, config)

  const totalCost = ingredientCost + laborCost + overheadCost

  // Calculate base price with default margin
  const basePrice = totalCost / (1 - config.defaultMargin)

  // Get market data for analysis
  const marketData = await getMarketData(category, basePrice)

  // Apply category multiplier
  const categoryMultiplier = config.categoryMultipliers[category.toLowerCase()] || 1.0
  const categoryAdjustedPrice = basePrice * categoryMultiplier

  // Market-based adjustments
  const marketAverage = marketData.categoryAverage
  const demandAdjustment = 1 + (marketData.demandIndex - 0.5) * 0.2 // ±10% based on demand
  const seasonalAdjustment = marketData.seasonalMultiplier

  // Calculate suggested price
  let suggestedPrice = categoryAdjustedPrice * demandAdjustment * seasonalAdjustment

  // Ensure price is within market range
  const competitorMin = Math.min(...marketData.competitorPrices)
  const competitorMax = Math.max(...marketData.competitorPrices)

  // Don't price too far outside competitor range
  if (suggestedPrice < competitorMin * 0.8) {
    suggestedPrice = competitorMin * 0.9
  } else if (suggestedPrice > competitorMax * 1.2) {
    suggestedPrice = competitorMax * 1.1
  }

  // Round to nearest 500 IDR
  suggestedPrice = Math.round(suggestedPrice / 500) * 500

  // Calculate margin
  const margin = suggestedPrice - totalCost
  const marginPercentage = margin / suggestedPrice

  // Ensure minimum margin
  if (marginPercentage < config.minMargin) {
    suggestedPrice = totalCost / (1 - config.minMargin)
    suggestedPrice = Math.round(suggestedPrice / 500) * 500
  }

  // Generate confidence score
  let confidence = 0.8

  // Reduce confidence if no ingredient data
  if (menuIngredients.length === 0) confidence *= 0.7

  // Reduce confidence if price is significantly different from current price
  if (currentPrice && Math.abs(suggestedPrice - currentPrice) / currentPrice > 0.3) {
    confidence *= 0.8
  }

  // Increase confidence if price is close to market average
  if (Math.abs(suggestedPrice - marketAverage) / marketAverage < 0.1) {
    confidence *= 1.2
  }

  confidence = Math.min(confidence, 1.0)

  // Generate reasoning
  const reasoning: string[] = []

  reasoning.push(`Ingredient cost: ${formatCurrency(ingredientCost)}`)
  reasoning.push(`Labor cost: ${formatCurrency(laborCost)} (${preparationTimeMinutes} minutes)`)
  reasoning.push(`Overhead cost: ${formatCurrency(overheadCost)}`)
  reasoning.push(`Target margin: ${(config.defaultMargin * 100).toFixed(0)}%`)

  if (categoryMultiplier !== 1.0) {
    reasoning.push(`Category adjustment: ${((categoryMultiplier - 1) * 100).toFixed(0)}% for ${category}`)
  }

  if (Math.abs(demandAdjustment - 1) > 0.05) {
    reasoning.push(`Demand adjustment: ${((demandAdjustment - 1) * 100).toFixed(0)}%`)
  }

  reasoning.push(`Market range: ${formatCurrency(competitorMin)} - ${formatCurrency(competitorMax)}`)

  if (currentPrice) {
    const change = ((suggestedPrice - currentPrice) / currentPrice * 100)
    reasoning.push(`Change from current: ${change > 0 ? '+' : ''}${change.toFixed(1)}%`)
  }

  // Calculate alternatives
  const alternatives = {
    conservative: Math.round((totalCost / (1 - config.minMargin)) / 500) * 500,
    aggressive: Math.round((totalCost / (1 - config.maxMargin)) / 500) * 500,
    premium: Math.round((suggestedPrice * 1.2) / 500) * 500
  }

  return {
    suggestedPrice,
    basePrice: totalCost,
    ingredientCost,
    laborCost,
    overheadCost,
    margin,
    marginPercentage,
    confidence,
    reasoning,
    alternatives
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}
