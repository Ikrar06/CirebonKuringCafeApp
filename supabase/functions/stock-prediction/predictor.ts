/**
 * Stock Prediction Predictor - ML Algorithm Implementation
 * 
 * Core machine learning algorithms for stock consumption prediction
 * Implements time series analysis, seasonal adjustments, and risk assessment
 */

import { supabaseAdmin } from '../_shared/supabase-client'

// Prediction configuration
const PREDICTION_CONFIG = {
  MIN_HISTORICAL_DAYS: 7, // Minimum days of data needed
  CONFIDENCE_THRESHOLD: 0.6,
  SEASONAL_WEIGHT: 0.3, // 30% weight for seasonal factors
  TREND_WEIGHT: 0.4, // 40% weight for trend analysis
  RECENT_WEIGHT: 0.3, // 30% weight for recent patterns
  SMOOTHING_FACTOR: 0.3, // Exponential smoothing alpha
  ANOMALY_THRESHOLD: 2.0, // Standard deviations for anomaly detection
  LEAD_TIME_BUFFER: 3 // Extra days buffer for reorder calculations
}

// Seasonal multipliers for Indonesian climate/culture
const SEASONAL_MULTIPLIERS = {
  dry_season: { // April - September
    coffee: 1.2,
    tea: 0.9,
    ice: 1.5,
    cold_drinks: 1.3,
    default: 1.0
  },
  wet_season: { // October - March
    coffee: 1.1,
    tea: 1.2,
    hot_drinks: 1.3,
    soup: 1.4,
    default: 1.0
  },
  ramadan: { // Fasting month
    all_items: 0.3, // During day
    iftar_items: 2.5, // Breaking fast items
    sahur_items: 1.8 // Pre-dawn meal items
  },
  holidays: { // Indonesian holidays
    premium_items: 1.5,
    party_items: 2.0,
    default: 1.2
  }
}

// Interfaces
interface PredictionOptions {
  user_id?: string
  include_historical_analysis?: boolean
  include_reorder_suggestions?: boolean
}

interface ConsumptionData {
  date: string
  consumption: number
  order_count: number
  weather_factor?: number
  day_of_week: number
  is_holiday: boolean
}

interface PredictionResult {
  success: boolean
  predictions?: any[]
  error?: string
}

interface BulkPredictionResult {
  success: boolean
  predictions?: any[]
  summary?: any
  reorder_suggestions?: any[]
  error?: string
}

interface TrendAnalysis {
  slope: number
  direction: 'increasing' | 'decreasing' | 'stable'
  confidence: number
  seasonality_detected: boolean
  cycle_length?: number
}

// ===========================================
// CORE PREDICTION FUNCTIONS
// ===========================================

/**
 * Predict consumption for specific ingredients
 */
export async function predictIngredientConsumption(
  predictionData: any,
  options: PredictionOptions = {}
): Promise<PredictionResult> {
  try {
    const predictions: any[] = []

    for (const ingredientId of predictionData.ingredient_ids) {
      // Get historical consumption data
      const historicalData = await getHistoricalConsumption(
        ingredientId,
        Math.max(predictionData.prediction_days * 3, 30) // Get 3x prediction period or min 30 days
      )

      if (historicalData.length < PREDICTION_CONFIG.MIN_HISTORICAL_DAYS) {
        // Not enough data, use fallback prediction
        const fallbackPrediction = await generateFallbackPrediction(
          ingredientId,
          predictionData.prediction_days
        )
        predictions.push(fallbackPrediction)
        continue
      }

      // Analyze consumption trends
      const trendAnalysis = analyzeTrend(historicalData)

      // Generate base prediction using exponential smoothing
      const basePrediction = generateBasePrediction(
        historicalData,
        predictionData.prediction_days
      )

      // Apply seasonal adjustments
      let seasonalPrediction = basePrediction
      if (predictionData.include_seasonal) {
        seasonalPrediction = applySeasonalFactors(
          basePrediction,
          ingredientId,
          getCurrentSeason()
        )
      }

      // Apply trend adjustments
      let trendAdjustedPrediction = seasonalPrediction
      if (predictionData.include_trends && trendAnalysis.confidence > 0.6) {
        trendAdjustedPrediction = applyTrendAdjustments(
          seasonalPrediction,
          trendAnalysis
        )
      }

      // Calculate risk analysis
      const riskAnalysis = await calculateRiskAnalysis(
        ingredientId,
        trendAdjustedPrediction
      )

      // Generate reorder recommendations
      const reorderRecommendation = await generateReorderRecommendation(
        ingredientId,
        trendAdjustedPrediction,
        riskAnalysis
      )

      // Build final prediction result
      const predictionResult = {
        ingredient_id: ingredientId,
        ingredient_name: await getIngredientName(ingredientId),
        current_stock: await getCurrentStock(ingredientId),
        consumption_predictions: trendAdjustedPrediction,
        reorder_recommendation: reorderRecommendation,
        risk_analysis: riskAnalysis,
        trend_analysis: trendAnalysis,
        confidence_factors: {
          data_quality: calculateDataQuality(historicalData),
          trend_confidence: trendAnalysis.confidence,
          seasonal_confidence: predictionData.include_seasonal ? 0.8 : 0,
          overall_confidence: calculateOverallConfidence(historicalData, trendAnalysis)
        }
      }

      predictions.push(predictionResult)
    }

    return {
      success: true,
      predictions
    }

  } catch (error) {
    console.error('Error in predictIngredientConsumption:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Prediction failed'
    }
  }
}

/**
 * Predict consumption for all ingredients (bulk operation)
 */
export async function predictBulkConsumption(
  bulkData: any,
  options: PredictionOptions = {}
): Promise<BulkPredictionResult> {
  try {
    // Get all active ingredients (with optional category filter)
    let query = supabaseAdmin
      .from('ingredients')
      .select('id, name, current_stock, minimum_stock, unit, cost_per_unit')
      .eq('is_active', true)

    if (bulkData.category_filter) {
      // Join with menu items to filter by category
      query = query.gt('current_stock', 0) // Only predict items with stock
    }

    const { data: ingredients, error } = await query

    if (error || !ingredients) {
      return {
        success: false,
        error: 'Failed to fetch ingredients for bulk prediction'
      }
    }

    // Filter by minimum stock threshold if specified
    const filteredIngredients = bulkData.min_stock_threshold 
      ? ingredients.filter(ing => ing.current_stock >= bulkData.min_stock_threshold)
      : ingredients

    // Generate predictions for all ingredients
    const predictionRequest = {
      ingredient_ids: filteredIngredients.map(ing => ing.id),
      prediction_days: bulkData.prediction_days,
      include_seasonal: bulkData.seasonal_adjustments,
      include_trends: true
    }

    const bulkPredictions = await predictIngredientConsumption(
      predictionRequest,
      options
    )

    if (!bulkPredictions.success) {
      return bulkPredictions
    }

    // Generate summary analytics
    const summary = generatePredictionSummary(bulkPredictions.predictions!)

    // Generate reorder suggestions if requested
    let reorderSuggestions: any[] = []
    if (options.include_reorder_suggestions) {
      const suggestionsResult = await generateReorderSuggestions({}, options)
      if (suggestionsResult.success) {
        reorderSuggestions = suggestionsResult.suggestions || []
      }
    }

    return {
      success: true,
      predictions: bulkPredictions.predictions,
      summary,
      reorder_suggestions: reorderSuggestions
    }

  } catch (error) {
    console.error('Error in predictBulkConsumption:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bulk prediction failed'
    }
  }
}

/**
 * Generate automatic reorder suggestions
 */
export async function generateReorderSuggestions(
  requestData: any,
  options: PredictionOptions = {}
): Promise<{
  success: boolean
  suggestions?: any[]
  error?: string
}> {
  try {
    // Get ingredients that need reordering
    const { data: lowStockIngredients, error } = await supabaseAdmin
      .from('ingredients')
      .select(`
        id, name, current_stock, minimum_stock, maximum_stock, 
        unit, cost_per_unit,
        suppliers!ingredients_supplier_id_fkey (
          id, name, delivery_days, minimum_order_amount
        )
      `)
      .lte('current_stock', 'minimum_stock * 1.5') // 150% of minimum stock
      .eq('is_active', true)

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch low stock ingredients'
      }
    }

    const suggestions: any[] = []

    for (const ingredient of lowStockIngredients || []) {
      // Calculate consumption rate (last 7 days average)
      const recentConsumption = await getRecentConsumptionRate(ingredient.id, 7)
      
      // Calculate days until stockout
      const daysUntilStockout = recentConsumption > 0 
        ? Math.floor(ingredient.current_stock / recentConsumption)
        : 999

      // Determine urgency
      const urgency = calculateUrgency(daysUntilStockout, ingredient.minimum_stock, ingredient.current_stock)
      
      // Apply filters
      if (requestData.urgency_filter && urgency !== requestData.urgency_filter) {
        continue
      }

      // Calculate suggested reorder quantity
      const suggestedQuantity = calculateReorderQuantity(
        ingredient,
        recentConsumption,
        requestData.lead_time_days || 7
      )

      // Estimate cost
      const estimatedCost = suggestedQuantity * ingredient.cost_per_unit

      // Apply budget filter
      if (requestData.budget_limit && estimatedCost > requestData.budget_limit) {
        continue
      }

      // Get supplier recommendations
      const supplierRecommendations = await getSupplierRecommendations(
        ingredient.id,
        suggestedQuantity,
        requestData.supplier_filter
      )

      const suggestion = {
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        current_stock: ingredient.current_stock,
        minimum_stock: ingredient.minimum_stock,
        suggested_quantity: suggestedQuantity,
        estimated_cost: estimatedCost,
        urgency,
        days_until_stockout: daysUntilStockout,
        consumption_rate: recentConsumption,
        reason: generateReorderReason(urgency, daysUntilStockout, ingredient.current_stock, ingredient.minimum_stock),
        supplier_recommendations: supplierRecommendations,
        created_at: new Date().toISOString()
      }

      suggestions.push(suggestion)
    }

    // Sort by urgency and potential impact
    suggestions.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const aScore = urgencyOrder[a.urgency as keyof typeof urgencyOrder] * 1000 + a.estimated_cost
      const bScore = urgencyOrder[b.urgency as keyof typeof urgencyOrder] * 1000 + b.estimated_cost
      return bScore - aScore
    })

    return {
      success: true,
      suggestions
    }

  } catch (error) {
    console.error('Error in generateReorderSuggestions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions'
    }
  }
}

/**
 * Analyze consumption patterns and detect trends
 */
export async function analyzeConsumptionPatterns(
  analysisData: any,
  options: PredictionOptions = {}
): Promise<{
  success: boolean
  analysis?: any
  error?: string
}> {
  try {
    const ingredients = analysisData.ingredient_ids || await getAllActiveIngredientIds()
    const analysis = {
      period_analyzed: analysisData.analysis_period_days,
      ingredients_analyzed: ingredients.length,
      patterns: {
        seasonal_patterns: [] as any[],
        weekly_patterns: [] as any[],
        daily_patterns: [] as any[],
        trend_analysis: [] as any[]
      },
      anomalies: [] as any[],
      correlations: [] as any[],
      recommendations: [] as any[]
    }

    for (const ingredientId of ingredients) {
      const historicalData = await getHistoricalConsumption(
        ingredientId,
        analysisData.analysis_period_days
      )

      if (historicalData.length < PREDICTION_CONFIG.MIN_HISTORICAL_DAYS) {
        continue
      }

      // Detect weekly patterns
      const weeklyPattern = analyzeWeeklyPattern(historicalData)
      if (weeklyPattern.significance > 0.6) {
        analysis.patterns.weekly_patterns.push({
          ingredient_id: ingredientId,
          pattern: weeklyPattern
        })
      }

      // Detect anomalies
      if (analysisData.detect_anomalies) {
        const anomalies = detectAnomalies(historicalData)
        analysis.anomalies.push(...anomalies.map(a => ({
          ingredient_id: ingredientId,
          ...a
        })))
      }

      // Menu correlation analysis
      if (analysisData.include_menu_correlation) {
        const menuCorrelation = await analyzeMenuCorrelation(ingredientId)
        if (menuCorrelation.correlation > 0.7) {
          analysis.correlations.push({
            ingredient_id: ingredientId,
            correlation: menuCorrelation
          })
        }
      }
    }

    // Generate recommendations based on patterns
    analysis.recommendations = generatePatternRecommendations(analysis)

    return {
      success: true,
      analysis
    }

  } catch (error) {
    console.error('Error in analyzeConsumptionPatterns:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Pattern analysis failed'
    }
  }
}

/**
 * Apply seasonal adjustments to predictions
 */
export async function applySeasonalAdjustments(
  adjustmentData: any,
  options: PredictionOptions = {}
): Promise<{
  success: boolean
  result?: any
  error?: string
}> {
  try {
    const results: any[] = []

    for (const adjustment of adjustmentData.adjustments) {
      // Store seasonal adjustment in database
      const { error: insertError } = await supabaseAdmin
        .from('seasonal_adjustments')
        .upsert({
          ingredient_id: adjustment.ingredient_id,
          season: adjustment.season,
          multiplier: adjustment.multiplier,
          start_date: adjustment.start_date,
          end_date: adjustment.end_date,
          is_active: true,
          created_by: options.user_id,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error storing seasonal adjustment:', insertError)
        results.push({
          ingredient_id: adjustment.ingredient_id,
          success: false,
          error: 'Failed to store adjustment'
        })
        continue
      }

      // If requested, recalculate predictions with new adjustments
      if (adjustmentData.apply_to_predictions) {
        const recalculationResult = await recalculateWithSeasonalFactors(
          adjustment.ingredient_id,
          adjustment
        )
        
        results.push({
          ingredient_id: adjustment.ingredient_id,
          success: true,
          adjustment_applied: adjustment,
          updated_predictions: recalculationResult
        })
      } else {
        results.push({
          ingredient_id: adjustment.ingredient_id,
          success: true,
          adjustment_stored: adjustment
        })
      }
    }

    return {
      success: true,
      result: {
        total_processed: adjustmentData.adjustments.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
      }
    }

  } catch (error) {
    console.error('Error in applySeasonalAdjustments:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Seasonal adjustment failed'
    }
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get historical consumption data from stock movements
 */
async function getHistoricalConsumption(ingredientId: string, days: number): Promise<ConsumptionData[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: movements } = await supabaseAdmin
    .from('stock_movements')
    .select('created_at, quantity, type')
    .eq('ingredient_id', ingredientId)
    .eq('type', 'out')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  // Group by date and sum consumption
  const dailyConsumption = new Map<string, number>()
  
  movements?.forEach(movement => {
    const date = movement.created_at.split('T')[0]
    const current = dailyConsumption.get(date) || 0
    dailyConsumption.set(date, current + movement.quantity)
  })

  // Convert to array format
  const result: ConsumptionData[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (days - i - 1))
    const dateStr = date.toISOString().split('T')[0]
    
    result.push({
      date: dateStr,
      consumption: dailyConsumption.get(dateStr) || 0,
      order_count: 0, // Could be enhanced with order correlation
      day_of_week: date.getDay(),
      is_holiday: false // Could be enhanced with holiday detection
    })
  }

  return result
}

/**
 * Analyze trend in historical data
 */
function analyzeTrend(data: ConsumptionData[]): TrendAnalysis {
  if (data.length < 7) {
    return {
      slope: 0,
      direction: 'stable',
      confidence: 0,
      seasonality_detected: false
    }
  }

  // Simple linear regression for trend
  const n = data.length
  const x = data.map((_, i) => i)
  const y = data.map(d => d.consumption)
  
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  
  // Calculate R-squared for confidence
  const yMean = sumY / n
  const ssRes = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + (sumY - slope * sumX) / n
    return sum + Math.pow(yi - predicted, 2)
  }, 0)
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
  const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot)

  return {
    slope,
    direction: Math.abs(slope) < 0.1 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing',
    confidence: Math.max(0, rSquared),
    seasonality_detected: detectSeasonality(data)
  }
}

/**
 * Generate base prediction using exponential smoothing
 */
function generateBasePrediction(data: ConsumptionData[], predictionDays: number): any[] {
  if (data.length === 0) return []

  const alpha = PREDICTION_CONFIG.SMOOTHING_FACTOR
  let smoothedValue = data[0].consumption
  
  // Calculate exponentially smoothed values
  for (let i = 1; i < data.length; i++) {
    smoothedValue = alpha * data[i].consumption + (1 - alpha) * smoothedValue
  }

  // Generate predictions
  const predictions: any[] = []
  for (let i = 0; i < predictionDays; i++) {
    const predictionDate = new Date()
    predictionDate.setDate(predictionDate.getDate() + i + 1)

    predictions.push({
      date: predictionDate.toISOString().split('T')[0],
      predicted_consumption: Math.max(0, Math.round(smoothedValue)),
      confidence: calculatePredictionConfidence(data, i),
      factors: ['exponential_smoothing', 'historical_average']
    })
  }

  return predictions
}

/**
 * Apply seasonal factors to predictions
 */
function applySeasonalFactors(predictions: any[], ingredientId: string, season: string): any[] {
  const seasonalMultiplier = getSeasonalMultiplier(ingredientId, season)
  
  return predictions.map(pred => ({
    ...pred,
    predicted_consumption: Math.round(pred.predicted_consumption * seasonalMultiplier),
    factors: [...pred.factors, 'seasonal_adjustment'],
    confidence: pred.confidence * 0.9 // Slight confidence reduction for added complexity
  }))
}

/**
 * Calculate risk analysis for ingredient
 */
async function calculateRiskAnalysis(ingredientId: string, predictions: any[]): Promise<any> {
  const currentStock = await getCurrentStock(ingredientId)
  const totalPredictedConsumption = predictions.reduce((sum, p) => sum + p.predicted_consumption, 0)
  
  // Get affected menu items
  const { data: menuItems } = await supabaseAdmin
    .from('recipe_ingredients')
    .select('menu_item:menu_items(id, name)')
    .eq('ingredient_id', ingredientId)

  const affectedMenuItems = menuItems?.map(item => item.menu_item.name) || []

  // Calculate stockout probability
  const stockoutProbability = Math.min(1, Math.max(0, 
    (totalPredictedConsumption - currentStock) / totalPredictedConsumption
  ))

  // Calculate days until stockout
  const averageDailyConsumption = totalPredictedConsumption / predictions.length
  const daysUntilStockout = averageDailyConsumption > 0 
    ? Math.floor(currentStock / averageDailyConsumption)
    : 999

  // Determine impact severity
  let impactSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (affectedMenuItems.length > 5 || daysUntilStockout <= 3) {
    impactSeverity = 'critical'
  } else if (affectedMenuItems.length > 2 || daysUntilStockout <= 7) {
    impactSeverity = 'high'
  } else if (daysUntilStockout <= 14) {
    impactSeverity = 'medium'
  }

  return {
    stockout_probability: stockoutProbability,
    days_until_stockout: daysUntilStockout,
    impact_severity: impactSeverity,
    affected_menu_items: affectedMenuItems
  }
}

/**
 * Generate reorder recommendation
 */
async function generateReorderRecommendation(
  ingredientId: string, 
  predictions: any[], 
  riskAnalysis: any
): Promise<any> {
  const currentStock = await getCurrentStock(ingredientId)
  const totalPrediction = predictions.reduce((sum, p) => sum + p.predicted_consumption, 0)
  
  // Calculate when to reorder (with lead time buffer)
  const leadTimeDays = 7 // Default lead time
  const bufferDays = PREDICTION_CONFIG.LEAD_TIME_BUFFER
  const reorderPoint = (leadTimeDays + bufferDays) * (totalPrediction / predictions.length)
  
  const suggestedDate = new Date()
  suggestedDate.setDate(suggestedDate.getDate() + Math.max(0, 
    riskAnalysis.days_until_stockout - leadTimeDays - bufferDays
  ))

  // Get ingredient details for cost calculation
  const { data: ingredient } = await supabaseAdmin
    .from('ingredients')
    .select('cost_per_unit, maximum_stock')
    .eq('id', ingredientId)
    .single()

  const suggestedQuantity = Math.max(
    reorderPoint,
    (ingredient?.maximum_stock || totalPrediction * 2) - currentStock
  )

  const estimatedCost = suggestedQuantity * (ingredient?.cost_per_unit || 0)

  // Get supplier recommendations
  const supplierRecommendations = await getSupplierRecommendations(ingredientId, suggestedQuantity)

  return {
    suggested_date: suggestedDate.toISOString().split('T')[0],
    suggested_quantity: Math.round(suggestedQuantity),
    estimated_cost: estimatedCost,
    urgency: riskAnalysis.impact_severity,
    supplier_recommendations: supplierRecommendations
  }
}

// Additional helper functions (simplified implementations)
async function generateFallbackPrediction(ingredientId: string, days: number): Promise<any> {
  const currentStock = await getCurrentStock(ingredientId)
  return {
    ingredient_id: ingredientId,
    ingredient_name: await getIngredientName(ingredientId),
    current_stock: currentStock,
    consumption_predictions: [],
    reorder_recommendation: null,
    risk_analysis: { impact_severity: 'low' },
    confidence_factors: { overall_confidence: 0.3 }
  }
}

async function getIngredientName(ingredientId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('ingredients')
    .select('name')
    .eq('id', ingredientId)
    .single()
  return data?.name || 'Unknown'
}

async function getCurrentStock(ingredientId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('ingredients')
    .select('current_stock')
    .eq('id', ingredientId)
    .single()
  return data?.current_stock || 0
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1
  return (month >= 4 && month <= 9) ? 'dry_season' : 'wet_season'
}

function getSeasonalMultiplier(ingredientId: string, season: string): number {
  // Simplified - in production would be more sophisticated
  return SEASONAL_MULTIPLIERS.dry_season?.default || 1.0
}

function detectSeasonality(data: ConsumptionData[]): boolean {
  // Simplified seasonality detection
  return data.length > 14 // Need at least 2 weeks for pattern
}

function calculatePredictionConfidence(data: ConsumptionData[], dayOffset: number): number {
  // Confidence decreases with distance from current date
  const baseConfidence = Math.max(0.4, 1 - (dayOffset * 0.05))
  const dataQualityFactor = Math.min(1, data.length / 30) // Better confidence with more data
  return baseConfidence * dataQualityFactor
}

function calculateDataQuality(data: ConsumptionData[]): number {
  if (data.length === 0) return 0
  
  const nonZeroDays = data.filter(d => d.consumption > 0).length
  const completeness = nonZeroDays / data.length
  const consistency = 1 - (calculateVariationCoefficient(data.map(d => d.consumption)))
  
  return (completeness + consistency) / 2
}

function calculateVariationCoefficient(values: number[]): number {
  if (values.length === 0) return 1
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  
  return stdDev / mean
}

function calculateOverallConfidence(data: ConsumptionData[], trend: TrendAnalysis): number {
  const dataQuality = calculateDataQuality(data)
  const trendConfidence = trend.confidence
  const sampleSize = Math.min(1, data.length / 30)
  
  return (dataQuality * 0.4 + trendConfidence * 0.4 + sampleSize * 0.2)
}

// Placeholder implementations for complex functions
async function getSupplierRecommendations(ingredientId: string, quantity: number, supplierFilter?: string): Promise<any[]> {
  // Simplified implementation
  return []
}

async function getRecentConsumptionRate(ingredientId: string, days: number): Promise<number> {
  const data = await getHistoricalConsumption(ingredientId, days)
  const totalConsumption = data.reduce((sum, d) => sum + d.consumption, 0)
  return totalConsumption / days
}

function calculateUrgency(daysUntilStockout: number, minStock: number, currentStock: number): string {
  if (daysUntilStockout <= 3 || currentStock <= minStock * 0.5) return 'critical'
  if (daysUntilStockout <= 7 || currentStock <= minStock) return 'high'
  if (daysUntilStockout <= 14) return 'medium'
  return 'low'
}

function calculateReorderQuantity(ingredient: any, consumptionRate: number, leadTimeDays: number): number {
  const leadTimeConsumption = consumptionRate * leadTimeDays
  const safetyStock = ingredient.minimum_stock
  const targetStock = ingredient.maximum_stock || (safetyStock * 3)
  
  // Calculate optimal reorder quantity
  const reorderQuantity = Math.max(
    targetStock - ingredient.current_stock, // Restore to target level
    leadTimeConsumption + safetyStock // Cover lead time + safety buffer
  )
  
  return Math.round(reorderQuantity)
}

function generateReorderReason(urgency: string, daysUntilStockout: number, currentStock: number, minStock: number): string {
  switch (urgency) {
    case 'critical':
      return `URGENT: Stock critically low (${daysUntilStockout} days until stockout)`
    case 'high':
      return `HIGH: Below minimum stock level (${currentStock} < ${minStock})`
    case 'medium':
      return `MEDIUM: Stock running low, reorder recommended`
    case 'low':
    default:
      return `LOW: Preventive reorder to maintain optimal levels`
  }
}

function generatePredictionSummary(predictions: any[]): any {
  const totalIngredients = predictions.length
  const highRiskItems = predictions.filter(p => 
    p.risk_analysis.impact_severity === 'high' || p.risk_analysis.impact_severity === 'critical'
  ).length
  
  const avgConfidence = predictions.reduce((sum, p) => 
    sum + (p.confidence_factors?.overall_confidence || 0), 0
  ) / totalIngredients
  
  const itemsNeedingReorder = predictions.filter(p => 
    p.reorder_recommendation && (
      p.reorder_recommendation.urgency === 'high' || 
      p.reorder_recommendation.urgency === 'critical'
    )
  ).length
  
  const totalPredictedCost = predictions.reduce((sum, p) => 
    sum + (p.reorder_recommendation?.estimated_cost || 0), 0
  )

  return {
    total_ingredients: totalIngredients,
    high_risk_items: highRiskItems,
    critical_items: predictions.filter(p => p.risk_analysis.impact_severity === 'critical').length,
    average_confidence: Math.round(avgConfidence * 100) / 100,
    items_needing_reorder: itemsNeedingReorder,
    total_predicted_cost: totalPredictedCost,
    risk_distribution: {
      critical: predictions.filter(p => p.risk_analysis.impact_severity === 'critical').length,
      high: predictions.filter(p => p.risk_analysis.impact_severity === 'high').length,
      medium: predictions.filter(p => p.risk_analysis.impact_severity === 'medium').length,
      low: predictions.filter(p => p.risk_analysis.impact_severity === 'low').length
    }
  }
}

async function getAllActiveIngredientIds(): Promise<string[]> {
  const { data: ingredients } = await supabaseAdmin
    .from('ingredients')
    .select('id')
    .eq('is_active', true)
  
  return ingredients?.map(ing => ing.id) || []
}

function analyzeWeeklyPattern(data: ConsumptionData[]): any {
  const weeklyConsumption = new Array(7).fill(0)
  const weeklyCounts = new Array(7).fill(0)
  
  data.forEach(d => {
    const dayOfWeek = d.day_of_week
    weeklyConsumption[dayOfWeek] += d.consumption
    weeklyCounts[dayOfWeek]++
  })
  
  // Calculate average consumption per day of week
  const weeklyAverages = weeklyConsumption.map((total, i) => 
    weeklyCounts[i] > 0 ? total / weeklyCounts[i] : 0
  )
  
  // Calculate pattern significance (coefficient of variation)
  const mean = weeklyAverages.reduce((a, b) => a + b, 0) / 7
  const variance = weeklyAverages.reduce((sum, avg) => sum + Math.pow(avg - mean, 2), 0) / 7
  const stdDev = Math.sqrt(variance)
  const significance = mean > 0 ? 1 - (stdDev / mean) : 0
  
  return {
    daily_averages: weeklyAverages,
    peak_day: weeklyAverages.indexOf(Math.max(...weeklyAverages)),
    low_day: weeklyAverages.indexOf(Math.min(...weeklyAverages)),
    significance: Math.max(0, significance)
  }
}

function detectAnomalies(data: ConsumptionData[]): any[] {
  const values = data.map(d => d.consumption)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const stdDev = Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  )
  
  const anomalies: any[] = []
  const threshold = PREDICTION_CONFIG.ANOMALY_THRESHOLD * stdDev
  
  data.forEach((d, i) => {
    if (Math.abs(d.consumption - mean) > threshold) {
      anomalies.push({
        date: d.date,
        consumption: d.consumption,
        expected: mean,
        deviation: Math.abs(d.consumption - mean),
        type: d.consumption > mean ? 'spike' : 'drop',
        severity: Math.abs(d.consumption - mean) / stdDev
      })
    }
  })
  
  return anomalies
}

async function analyzeMenuCorrelation(ingredientId: string): Promise<any> {
  // Get menu items using this ingredient
  const { data: menuItems } = await supabaseAdmin
    .from('recipe_ingredients')
    .select(`
      menu_item_id,
      quantity,
      menu_item:menu_items(name, category)
    `)
    .eq('ingredient_id', ingredientId)
  
  if (!menuItems || menuItems.length === 0) {
    return { correlation: 0 }
  }
  
  // Simplified correlation analysis
  // In production, this would analyze order patterns vs ingredient consumption
  return {
    correlation: 0.8, // Placeholder
    related_menu_items: menuItems.map(item => ({
      name: item.menu_item.name,
      category: item.menu_item.category,
      usage_quantity: item.quantity
    })),
    primary_category: menuItems[0].menu_item.category
  }
}

function generatePatternRecommendations(analysis: any): string[] {
  const recommendations: string[] = []
  
  // Weekly pattern recommendations
  if (analysis.patterns.weekly_patterns.length > 0) {
    recommendations.push(
      'Adjust staffing levels based on weekly consumption patterns',
      'Schedule deliveries to align with peak consumption days'
    )
  }
  
  // Anomaly recommendations
  if (analysis.anomalies.length > 0) {
    const highSeverityAnomalies = analysis.anomalies.filter(a => a.severity > 3)
    if (highSeverityAnomalies.length > 0) {
      recommendations.push(
        'Investigate causes of consumption spikes and drops',
        'Implement alerts for unusual consumption patterns'
      )
    }
  }
  
  // Correlation recommendations
  if (analysis.correlations.length > 0) {
    recommendations.push(
      'Consider menu popularity when planning ingredient purchases',
      'Bundle ingredient orders for highly correlated items'
    )
  }
  
  return recommendations
}

async function recalculateWithSeasonalFactors(ingredientId: string, adjustment: any): Promise<any> {
  // Get current predictions for this ingredient
  const predictionRequest = {
    ingredient_ids: [ingredientId],
    prediction_days: 30,
    include_seasonal: true,
    include_trends: true
  }
  
  const result = await predictIngredientConsumption(predictionRequest)
  
  return result.success ? result.predictions?.[0] : null
}

function applyTrendAdjustments(predictions: any[], trendAnalysis: TrendAnalysis): any[] {
  const trendFactor = Math.min(Math.abs(trendAnalysis.slope), 0.5) // Cap trend impact
  const multiplier = trendAnalysis.direction === 'increasing' ? (1 + trendFactor) : (1 - trendFactor)
  
  return predictions.map((pred, index) => ({
    ...pred,
    predicted_consumption: Math.round(pred.predicted_consumption * Math.pow(multiplier, index * 0.1)),
    factors: [...pred.factors, `trend_${trendAnalysis.direction}`],
    confidence: pred.confidence * trendAnalysis.confidence
  }))
}