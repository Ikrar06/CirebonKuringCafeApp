/**
 * Price Suggestion Edge Function - Main Handler
 * 
 * AI-powered price calculation endpoint for menu items
 * Calculates optimal pricing based on ingredient costs, market analysis, and target margins
 * 
 * @endpoints
 * POST /price-suggestion/calculate - Calculate price for menu item
 * POST /price-suggestion/bulk-calculate - Calculate prices for multiple items
 * POST /price-suggestion/analyze-margins - Analyze current menu margins
 * GET  /price-suggestion/market-data - Get market pricing benchmarks
 * POST /price-suggestion/update-costs - Update ingredient costs and recalculate
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
  calculateMenuItemPrice,
  calculateBulkPrices,
  analyzeMenuMargins,
  updateIngredientCosts
} from './calculator'

// Request interfaces
interface PriceCalculationRequest {
  menu_item_id?: string // For existing items
  recipe_ingredients: Array<{
    ingredient_id: string
    quantity: number
    unit: string
  }>
  menu_category: string
  target_margin?: number // 60-70% default
  market_analysis?: boolean
  competitor_prices?: number[]
  portion_size?: number
  preparation_complexity?: 'simple' | 'medium' | 'complex'
}

interface BulkCalculationRequest {
  menu_item_ids?: string[]
  recipe_data?: Array<{
    menu_item_name: string
    category: string
    recipe_ingredients: Array<{
      ingredient_id: string
      quantity: number
      unit: string
    }>
  }>
  target_margin?: number
  update_existing?: boolean
}

interface MarginAnalysisRequest {
  menu_item_ids?: string[]
  category_filter?: string
  include_suggestions?: boolean
}

interface CostUpdateRequest {
  ingredient_updates: Array<{
    ingredient_id: string
    new_cost_per_unit: number
    effective_date?: string
  }>
  recalculate_affected_items?: boolean
}

// Response interfaces
interface PriceCalculationResult {
  menu_item_id?: string
  ingredient_costs: Array<{
    ingredient_id: string
    ingredient_name: string
    quantity: number
    unit: string
    cost_per_unit: number
    total_cost: number
  }>
  total_ingredient_cost: number
  overhead_percentage: number
  labor_cost: number
  total_cost: number
  target_margin: number
  suggested_price: number
  rounded_price: number
  competitor_analysis?: {
    average_market_price: number
    price_position: 'below' | 'competitive' | 'premium'
    recommendation: string
  }
  profitability: {
    profit_amount: number
    profit_margin: number
    break_even_quantity: number
  }
  confidence_score: number
  factors_considered: string[]
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Calculate price for single menu item
 */
async function handleCalculatePrice(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const calculationData = body as PriceCalculationRequest

    // Validate required fields
    const validation = validateFields(calculationData, {
      recipe_ingredients: { required: true },
      menu_category: { required: true, type: 'string' }
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

    // Authenticate request (owner or kasir only)
    const authResult = await authenticatePriceRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Validate ingredients exist
    const ingredientValidation = await validateIngredients(calculationData.recipe_ingredients)
    if (!ingredientValidation.success) {
      return createErrorResponse(
        'Invalid ingredients',
        400,
        { 
          missing_ingredients: ingredientValidation.missing_ingredients,
          invalid_units: ingredientValidation.invalid_units
        },
        request
      )
    }

    // Calculate price
    const calculationResult = await calculateMenuItemPrice(
      calculationData,
      {
        include_market_analysis: calculationData.market_analysis || false,
        user_id: authResult.user_id || 'system'
      }
    )

    if (!calculationResult.success) {
      return createErrorResponse(
        'Price calculation failed',
        500,
        { error: calculationResult.error },
        request
      )
    }

    // Log calculation for audit
    await logPriceCalculation(
      calculationData,
      calculationResult.result!,
      authResult.user_id || 'system'
    )

    return createSuccessResponse(
      calculationResult.result,
      'Price calculated successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleCalculatePrice:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Calculate prices for multiple menu items
 */
async function handleBulkCalculate(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const bulkData = body as BulkCalculationRequest

    // Validate required fields
    if (!bulkData.menu_item_ids && !bulkData.recipe_data) {
      return createValidationErrorResponse(
        [{
          field: 'menu_item_ids_or_recipe_data',
          message: 'Either menu_item_ids or recipe_data is required',
          code: 'VALIDATION_ERROR'
        }],
        request
      )
    }

    // Authenticate request (owner only)
    const authResult = await authenticatePriceRequest(request, ['owner'])
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Calculate bulk prices
    const bulkResult = await calculateBulkPrices(
      bulkData,
      {
        user_id: authResult.user_id || 'system',
        update_existing: bulkData.update_existing || false
      }
    )

    if (!bulkResult.success) {
      return createErrorResponse(
        'Bulk calculation failed',
        500,
        { error: bulkResult.error },
        request
      )
    }

    // Log bulk operation
    await logAudit(
      authResult.user_id || 'system' || 'system',
      'BULK_PRICE_CALCULATION',
      {
        total_items: bulkResult.results?.length || 0,
        successful_calculations: bulkResult.results?.filter(r => r.success).length || 0,
        failed_calculations: bulkResult.results?.filter(r => !r.success).length || 0,
        target_margin: bulkData.target_margin
      },
      'menu_items',
      'bulk_price_update'
    )

    return createSuccessResponse(
      {
        total_processed: bulkResult.results?.length || 0,
        successful_calculations: bulkResult.results?.filter(r => r.success).length || 0,
        failed_calculations: bulkResult.results?.filter(r => !r.success).length || 0,
        results: bulkResult.results,
        summary: bulkResult.summary
      },
      'Bulk price calculation completed',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleBulkCalculate:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Analyze current menu margins and provide optimization suggestions
 */
async function handleAnalyzeMargins(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    const analysisData = (body || {}) as MarginAnalysisRequest

    // Authenticate request
    const authResult = await authenticatePriceRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Analyze margins
    const analysisResult = await analyzeMenuMargins(
      analysisData,
      {
        user_id: authResult.user_id || 'system',
        include_suggestions: analysisData.include_suggestions !== false
      }
    )

    if (!analysisResult.success) {
      return createErrorResponse(
        'Margin analysis failed',
        500,
        { error: analysisResult.error },
        request
      )
    }

    return createSuccessResponse(
      analysisResult.analysis,
      'Menu margin analysis completed',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleAnalyzeMargins:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get market pricing data and benchmarks
 */
async function handleGetMarketData(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const location = url.searchParams.get('location') || 'kendari'

    // Authenticate request
    const authResult = await authenticatePriceRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get market data (mock data for now, can be enhanced with real market APIs)
    const marketData = await getMarketBenchmarks(category, location)

    return createSuccessResponse(
      marketData,
      'Market data retrieved successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetMarketData:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Update ingredient costs and recalculate affected menu items
 */
async function handleUpdateCosts(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const updateData = body as CostUpdateRequest

    // Validate required fields
    const validation = validateFields(updateData, {
      ingredient_updates: { required: true }
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
    const authResult = await authenticatePriceRequest(request, ['owner'])
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Update costs and recalculate
    const updateResult = await updateIngredientCosts(
      updateData,
      {
        user_id: authResult.user_id || 'system',
        recalculate_menu_items: updateData.recalculate_affected_items !== false
      }
    )

    if (!updateResult.success) {
      return createErrorResponse(
        'Cost update failed',
        500,
        { error: updateResult.error },
        request
      )
    }

    // Log cost update
    await logAudit(
      authResult.user_id || 'system' || 'system',
      'INGREDIENT_COST_UPDATE',
      {
        updated_ingredients: updateData.ingredient_updates.length,
        affected_menu_items: updateResult.affected_menu_items?.length || 0,
        total_cost_change: updateResult.total_cost_impact
      },
      'ingredients',
      'cost_update'
    )

    return createSuccessResponse(
      updateResult.summary,
      'Ingredient costs updated successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleUpdateCosts:', error)
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
 * Validate that all ingredients exist and have valid data
 */
async function validateIngredients(recipeIngredients: Array<{
  ingredient_id: string
  quantity: number
  unit: string
}>): Promise<{
  success: boolean
  missing_ingredients?: string[]
  invalid_units?: string[]
}> {
  try {
    const ingredientIds = recipeIngredients.map(ri => ri.ingredient_id)
    
    const { data: ingredients, error } = await supabaseAdmin
      .from('ingredients')
      .select('id, name, unit, cost_per_unit, is_active')
      .in('id', ingredientIds)

    if (error) {
      console.error('Error validating ingredients:', error)
      return { success: false }
    }

    const foundIds = ingredients?.map(i => i.id) || []
    const missingIngredients = ingredientIds.filter(id => !foundIds.includes(id))
    
    // Check for unit mismatches
    const invalidUnits: string[] = []
    recipeIngredients.forEach(ri => {
      const ingredient = ingredients?.find(i => i.id === ri.ingredient_id)
      if (ingredient && ingredient.unit !== ri.unit) {
        invalidUnits.push(`${ri.ingredient_id}: expected ${ingredient.unit}, got ${ri.unit}`)
      }
    })

    if (missingIngredients.length > 0 || invalidUnits.length > 0) {
      return {
        success: false,
        missing_ingredients: missingIngredients,
        invalid_units: invalidUnits
      }
    }

    return { success: true }

  } catch (error) {
    console.error('Error in validateIngredients:', error)
    return { success: false }
  }
}

/**
 * Get market pricing benchmarks (placeholder for future integration)
 */
async function getMarketBenchmarks(category?: string | null, location?: string): Promise<any> {
  // Placeholder market data - in production, this would integrate with:
  // - Industry pricing databases
  // - Competitor analysis APIs
  // - Local market research data
  
  const benchmarks = {
    location: location || 'kendari',
    category: category || 'general',
    data: {
      average_prices: {
        coffee: { min: 15000, max: 35000, avg: 25000 },
        tea: { min: 10000, max: 25000, avg: 17500 },
        pastry: { min: 12000, max: 30000, avg: 20000 },
        main_course: { min: 25000, max: 75000, avg: 45000 }
      },
      market_trends: {
        price_inflation: 3.2, // percentage
        demand_growth: 8.5,
        competition_level: 'medium'
      },
      recommendations: [
        'Prices for coffee drinks are competitive in Kendari market',
        'Consider premium positioning for specialty items',
        'Local purchasing power supports moderate pricing strategy'
      ]
    },
    last_updated: new Date().toISOString()
  }

  return benchmarks
}

/**
 * Log price calculation for audit trail
 */
async function logPriceCalculation(
  request: PriceCalculationRequest,
  result: PriceCalculationResult,
  userId: string
): Promise<void> {
  try {
    await logAudit(
      userId,
      'PRICE_CALCULATION',
      {
        menu_item_id: request.menu_item_id,
        category: request.menu_category,
        ingredient_count: request.recipe_ingredients.length,
        total_cost: result.total_cost,
        suggested_price: result.suggested_price,
        target_margin: result.target_margin,
        actual_margin: result.profitability.profit_margin,
        confidence_score: result.confidence_score
      },
      'menu_items',
      request.menu_item_id || 'new_item'
    )
  } catch (error) {
    console.error('Error logging price calculation:', error)
  }
}

/**
 * Authenticate price calculation request
 */
async function authenticatePriceRequest(
  request: Request,
  allowedRoles: string[] = ['owner', 'kasir']
): Promise<{
  success: boolean
  error?: string
  user_id?: string
}> {
  try {
    // Try device authentication first
    const deviceId = request.headers.get('X-Device-ID')
    const deviceRole = request.headers.get('X-Device-Role')

    if (deviceId && deviceRole && allowedRoles.includes(deviceRole)) {
      return { success: true, user_id: deviceId }
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
    console.error('Error authenticating price request:', error)
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
    
    if (url.pathname.includes('/calculate')) {
      return handleCalculatePrice(request)
    } else if (url.pathname.includes('/bulk-calculate')) {
      return handleBulkCalculate(request)
    } else if (url.pathname.includes('/analyze-margins')) {
      return handleAnalyzeMargins(request)
    } else if (url.pathname.includes('/update-costs')) {
      return handleUpdateCosts(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/market-data')) {
      return handleGetMarketData(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler