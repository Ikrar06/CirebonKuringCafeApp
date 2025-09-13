/**
 * Stock Prediction Edge Function - Main Handler
 * 
 * AI-powered stock prediction and inventory optimization
 * Predicts consumption patterns and provides reorder recommendations
 * 
 * @endpoints
 * POST /stock-prediction/predict - Predict stock consumption for specific ingredients
 * POST /stock-prediction/bulk-predict - Predict consumption for all ingredients
 * GET  /stock-prediction/reorder-suggestions - Get automatic reorder suggestions
 * POST /stock-prediction/analyze-patterns - Analyze consumption patterns
 * POST /stock-prediction/seasonal-adjustments - Apply seasonal demand adjustments
 */

import { withCors } from '../_shared/cors'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  createUnauthorizedResponse,
  parseJsonBody,
  createHandler
} from '../_shared/response'
import { 
  supabaseAdmin, 
  getAuthenticatedClient,
  logAudit 
} from '../_shared/supabase-client'
import { 
  validateFields,
  sanitizeString
} from '../../../packages/utils/src/validators/index'
import { 
  predictIngredientConsumption,
  predictBulkConsumption,
  generateReorderSuggestions,
  analyzeConsumptionPatterns,
  applySeasonalAdjustments
} from './predictor'

// Request interfaces
interface StockPredictionRequest {
  ingredient_ids: string[]
  prediction_days: number // 7, 14, 30 days
  include_seasonal: boolean
  include_trends: boolean
  confidence_threshold?: number
}

interface BulkPredictionRequest {
  category_filter?: string
  prediction_days: number
  min_stock_threshold?: number
  include_reorder_suggestions: boolean
  seasonal_adjustments: boolean
}

interface PatternAnalysisRequest {
  ingredient_ids?: string[]
  analysis_period_days: number // 30, 60, 90 days
  include_menu_correlation: boolean
  detect_anomalies: boolean
}

interface SeasonalAdjustmentRequest {
  adjustments: Array<{
    ingredient_id: string
    season: 'dry' | 'wet' | 'holiday' | 'ramadan'
    multiplier: number
    start_date: string
    end_date: string
  }>
  apply_to_predictions: boolean
}

interface ReorderSuggestionsRequest {
  urgency_filter?: 'low' | 'medium' | 'high' | 'critical'
  supplier_filter?: string
  budget_limit?: number
  lead_time_days?: number
}

// Response interfaces
interface PredictionResult {
  ingredient_id: string
  ingredient_name: string
  current_stock: number
  consumption_predictions: Array<{
    date: string
    predicted_consumption: number
    confidence: number
    factors: string[]
  }>
  reorder_recommendation: {
    suggested_date: string
    suggested_quantity: number
    estimated_cost: number
    urgency: string
    supplier_recommendations: Array<{
      supplier_id: string
      supplier_name: string
      estimated_price: number
      delivery_days: number
    }>
  }
  risk_analysis: {
    stockout_probability: number
    days_until_stockout: number
    impact_severity: 'low' | 'medium' | 'high' | 'critical'
    affected_menu_items: string[]
  }
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Predict stock consumption for specific ingredients
 */
async function handlePredictStock(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const predictionData = body as StockPredictionRequest

    // Validate required fields
    const validation = validateFields(predictionData, {
      ingredient_ids: { required: true },
      prediction_days: { required: true, type: 'number' }
    })

    if (!validation.valid) {
      return createValidationErrorResponse(
        Object.entries(validation.errors).map(([field, errors]) => ({
          field,
          message: errors[0],
          code: 'VALIDATION_ERROR'
        })),
        request
      )
    }

    // Authenticate request
    const authResult = await authenticateStockRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Validate prediction parameters
    if (predictionData.prediction_days < 1 || predictionData.prediction_days > 90) {
      return createErrorResponse(
        'Prediction days must be between 1 and 90',
        400,
        undefined,
        request
      )
    }

    // Validate ingredients exist
    const ingredientValidation = await validateIngredientIds(predictionData.ingredient_ids)
    if (!ingredientValidation.success) {
      return createErrorResponse(
        'Invalid ingredients',
        400,
        { invalid_ingredients: ingredientValidation.invalid_ingredients },
        request
      )
    }

    // Generate predictions
    const predictionResult = await predictIngredientConsumption(
      predictionData,
      {
        user_id: authResult.user_id || 'system',
        include_historical_analysis: true
      }
    )

    if (!predictionResult.success) {
      return createErrorResponse(
        'Stock prediction failed',
        500,
        { error: predictionResult.error },
        request
      )
    }

    // Log prediction request
    await logStockPrediction(
      predictionData,
      predictionResult.predictions!,
      authResult.user_id || 'system'
    )

    return createSuccessResponse(
      {
        predictions: predictionResult.predictions,
        summary: {
          total_ingredients: predictionData.ingredient_ids.length,
          prediction_period: `${predictionData.prediction_days} days`,
          high_risk_ingredients: predictionResult.predictions?.filter(p => 
            p.risk_analysis.impact_severity === 'high' || p.risk_analysis.impact_severity === 'critical'
          ).length || 0,
          immediate_reorders_needed: predictionResult.predictions?.filter(p => 
            p.reorder_recommendation.urgency === 'high' || p.reorder_recommendation.urgency === 'critical'
          ).length || 0
        },
        generated_at: new Date().toISOString()
      },
      'Stock predictions generated successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handlePredictStock:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Predict consumption for all ingredients (bulk operation)
 */
async function handleBulkPredict(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const bulkData = body as BulkPredictionRequest

    // Validate required fields
    const validation = validateFields(bulkData, {
      prediction_days: { required: true, type: 'number' }
    })

    if (!validation.valid) {
      return createValidationErrorResponse(
        Object.entries(validation.errors).map(([field, errors]) => ({
          field,
          message: errors[0],
          code: 'VALIDATION_ERROR'
        })),
        request
      )
    }

    // Authenticate request (owner or stok role only)
    const authResult = await authenticateStockRequest(request, ['owner', 'stok'])
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Generate bulk predictions
    const bulkResult = await predictBulkConsumption(
      bulkData,
      {
        user_id: authResult.user_id || 'system',
        include_reorder_suggestions: bulkData.include_reorder_suggestions
      }
    )

    if (!bulkResult.success) {
      return createErrorResponse(
        'Bulk prediction failed',
        500,
        { error: bulkResult.error },
        request
      )
    }

    // Log bulk prediction
    await logAudit(
      authResult.user_id || 'system',
      'BULK_STOCK_PREDICTION',
      {
        total_ingredients: bulkResult.predictions?.length || 0,
        prediction_days: bulkData.prediction_days,
        category_filter: bulkData.category_filter,
        critical_items: bulkResult.summary?.critical_items || 0
      },
      'ingredients',
      'bulk_prediction'
    )

    return createSuccessResponse(
      {
        predictions: bulkResult.predictions,
        summary: bulkResult.summary,
        reorder_suggestions: bulkResult.reorder_suggestions,
        analytics: {
          total_predicted_cost: bulkResult.summary?.total_predicted_cost || 0,
          items_needing_reorder: bulkResult.summary?.items_needing_reorder || 0,
          average_confidence: bulkResult.summary?.average_confidence || 0
        }
      },
      'Bulk stock predictions completed',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleBulkPredict:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get automatic reorder suggestions
 */
async function handleReorderSuggestions(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const urgencyFilter = url.searchParams.get('urgency') as 'low' | 'medium' | 'high' | 'critical' | null
    const supplierFilter = url.searchParams.get('supplier_id')
    const budgetLimit = url.searchParams.get('budget_limit') ? 
      parseFloat(url.searchParams.get('budget_limit')!) : undefined
    const leadTimeDays = url.searchParams.get('lead_time_days') ? 
      parseInt(url.searchParams.get('lead_time_days')!) : undefined

    // Authenticate request
    const authResult = await authenticateStockRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Generate reorder suggestions
    const suggestionsResult = await generateReorderSuggestions({
      urgency_filter: urgencyFilter,
      supplier_filter: supplierFilter,
      budget_limit: budgetLimit,
      lead_time_days: leadTimeDays
    }, {
      user_id: authResult.user_id || 'system'
    })

    if (!suggestionsResult.success) {
      return createErrorResponse(
        'Failed to generate reorder suggestions',
        500,
        { error: suggestionsResult.error },
        request
      )
    }

    return createSuccessResponse(
      {
        suggestions: suggestionsResult.suggestions,
        summary: {
          total_suggestions: suggestionsResult.suggestions?.length || 0,
          critical_items: suggestionsResult.suggestions?.filter(s => s.urgency === 'critical').length || 0,
          total_estimated_cost: suggestionsResult.suggestions?.reduce((sum, s) => sum + s.estimated_cost, 0) || 0,
          suppliers_involved: suggestionsResult.suggestions ? [...new Set(suggestionsResult.suggestions.map(s => s.preferred_supplier_id).filter(Boolean))] : []
        },
        filters_applied: {
          urgency: urgencyFilter,
          supplier: supplierFilter,
          budget_limit: budgetLimit,
          lead_time_days: leadTimeDays
        }
      },
      'Reorder suggestions generated successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleReorderSuggestions:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Analyze consumption patterns and trends
 */
async function handleAnalyzePatterns(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    const analysisData = (body || {}) as PatternAnalysisRequest

    // Set defaults
    if (!analysisData.analysis_period_days) {
      analysisData.analysis_period_days = 30
    }

    // Authenticate request
    const authResult = await authenticateStockRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Analyze consumption patterns
    const analysisResult = await analyzeConsumptionPatterns(
      analysisData,
      {
        user_id: authResult.user_id || 'system'
      }
    )

    if (!analysisResult.success) {
      return createErrorResponse(
        'Pattern analysis failed',
        500,
        { error: analysisResult.error },
        request
      )
    }

    return createSuccessResponse(
      analysisResult.analysis,
      'Consumption pattern analysis completed',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleAnalyzePatterns:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Apply seasonal adjustments to predictions
 */
async function handleSeasonalAdjustments(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const adjustmentData = body as SeasonalAdjustmentRequest

    // Validate required fields
    const validation = validateFields(adjustmentData, {
      adjustments: { required: true }
    })

    if (!validation.valid) {
      return createValidationErrorResponse(
        Object.entries(validation.errors).map(([field, errors]) => ({
          field,
          message: errors[0],
          code: 'VALIDATION_ERROR'
        })),
        request
      )
    }

    // Authenticate request (owner only)
    const authResult = await authenticateStockRequest(request, ['owner'])
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Apply seasonal adjustments
    const adjustmentResult = await applySeasonalAdjustments(
      adjustmentData,
      {
        user_id: authResult.user_id || 'system'
      }
    )

    if (!adjustmentResult.success) {
      return createErrorResponse(
        'Seasonal adjustment failed',
        500,
        { error: adjustmentResult.error },
        request
      )
    }

    // Log seasonal adjustments
    await logAudit(
      authResult.user_id || 'system',
      'SEASONAL_ADJUSTMENT_APPLIED',
      {
        total_adjustments: adjustmentData.adjustments.length,
        seasons_affected: [...new Set(adjustmentData.adjustments.map(a => a.season))],
        apply_to_predictions: adjustmentData.apply_to_predictions
      },
      'ingredients',
      'seasonal_adjustment'
    )

    return createSuccessResponse(
      adjustmentResult.result,
      'Seasonal adjustments applied successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleSeasonalAdjustments:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Validate that ingredient IDs exist
 */
async function validateIngredientIds(ingredientIds: string[]): Promise<{
  success: boolean
  invalid_ingredients?: string[]
}> {
  try {
    const { data: existingIngredients, error } = await supabaseAdmin
      .from('ingredients')
      .select('id')
      .in('id', ingredientIds)
      .eq('is_active', true)

    if (error) {
      console.error('Error validating ingredient IDs:', error)
      return { success: false }
    }

    const existingIds = existingIngredients?.map(i => i.id) || []
    const invalidIngredients = ingredientIds.filter(id => !existingIds.includes(id))

    if (invalidIngredients.length > 0) {
      return {
        success: false,
        invalid_ingredients: invalidIngredients
      }
    }

    return { success: true }

  } catch (error) {
    console.error('Error in validateIngredientIds:', error)
    return { success: false }
  }
}

/**
 * Log stock prediction for audit trail
 */
async function logStockPrediction(
  request: StockPredictionRequest,
  predictions: PredictionResult[],
  userId: string
): Promise<void> {
  try {
    await logAudit(
      userId,
      'STOCK_PREDICTION',
      {
        ingredient_count: request.ingredient_ids.length,
        prediction_days: request.prediction_days,
        include_seasonal: request.include_seasonal,
        include_trends: request.include_trends,
        high_risk_count: predictions.filter(p => 
          p.risk_analysis.impact_severity === 'high' || p.risk_analysis.impact_severity === 'critical'
        ).length,
        average_confidence: predictions.reduce((sum, p) => 
          sum + p.consumption_predictions[0]?.confidence || 0, 0
        ) / predictions.length
      },
      'ingredients',
      'stock_prediction'
    )
  } catch (error) {
    console.error('Error logging stock prediction:', error)
  }
}

/**
 * Authenticate stock prediction request
 */
async function authenticateStockRequest(
  request: Request,
  allowedRoles: string[] = ['owner', 'kasir', 'stok']
): Promise<{
  success: boolean
  error?: string
  user_id?: string
}> {
  try {
    // Try device authentication first
    const deviceId = request.headers.get('X-Device-ID')
    const deviceRole = request.headers.get('X-Device-Role')

    if (deviceId && deviceRole) {
      const deviceRoleName = `device_${deviceRole}`
      if (allowedRoles.includes(deviceRole) || allowedRoles.includes(deviceRoleName)) {
        return { success: true, user_id: deviceId }
      }
    }

    // Try user authentication
    const authResult = await getAuthenticatedClient(request)
    if (authResult) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', authResult.user.id)
        .single()

      if (user && allowedRoles.includes(user.role)) {
        return { success: true, user_id: authResult.user.id }
      }

      // Check if employee with allowed position
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('user_id, position')
        .eq('user_id', authResult.user.id)
        .eq('status', 'active')
        .single()

      if (employee && allowedRoles.includes(employee.position)) {
        return { success: true, user_id: authResult.user.id }
      }
    }

    return {
      success: false,
      error: 'Unauthorized access'
    }

  } catch (error) {
    console.error('Error authenticating stock request:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

// ===========================================
// MAIN HANDLER WITH ROUTING
// ===========================================

const handler = withCors(createHandler({
  POST: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/predict')) {
      return handlePredictStock(request)
    } else if (url.pathname.includes('/bulk-predict')) {
      return handleBulkPredict(request)
    } else if (url.pathname.includes('/analyze-patterns')) {
      return handleAnalyzePatterns(request)
    } else if (url.pathname.includes('/seasonal-adjustments')) {
      return handleSeasonalAdjustments(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/reorder-suggestions')) {
      return handleReorderSuggestions(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler