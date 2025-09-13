/**
 * Stock Deduction Edge Function
 * 
 * Handles automatic stock deduction when payments are verified
 * Implements FIFO inventory management with batch tracking
 * 
 * Features:
 * - FIFO-based stock deduction
 * - Batch expiry tracking
 * - Stock movement logging
 * - Low stock alerts
 * - Inventory reconciliation
 * - Cost calculation (COGS)
 * 
 * @endpoints
 * POST /stock-deduction/process/:orderId - Process stock deduction for order
 * POST /stock-deduction/manual - Manual stock adjustment
 * GET  /stock-deduction/preview/:orderId - Preview deduction without executing
 * POST /stock-deduction/reconcile - Reconcile inventory discrepancies
 */

import { withCors } from '../_shared/cors'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  parseJsonBody,
  createHandler
} from '../_shared/response'
import { 
  supabaseAdmin, 
  getAuthenticatedClient,
  validateDeviceAuth,
  logAudit 
} from '../_shared/supabase-client'
import { 
  validateFields,
  isValidNumber,
  isPositiveInteger,
  sanitizeString
} from '../../../packages/utils/src/validators/index'

// Stock deduction interfaces
interface StockDeductionRequest {
  order_id: string
  force_deduction?: boolean // Override low stock warnings
  batch_preference?: 'fifo' | 'lifo' | 'specific_batch'
  specific_batch_ids?: string[] // For specific batch selection
}

interface ManualStockAdjustment {
  ingredient_id: string
  adjustment_type: 'deduction' | 'addition' | 'waste' | 'adjustment'
  quantity: number
  reason: string
  cost_per_unit?: number
  batch_id?: string
  expiry_date?: string
}

interface StockDeductionResult {
  order_id: string
  total_items_processed: number
  total_ingredients_affected: number
  total_cost_deducted: number
  deductions: IngredientDeduction[]
  warnings: StockWarning[]
  alerts: StockAlert[]
}

interface IngredientDeduction {
  ingredient_id: string
  ingredient_name: string
  total_quantity_needed: number
  total_quantity_deducted: number
  remaining_stock: number
  unit: string
  batch_deductions: BatchDeduction[]
  cost_calculation: {
    total_cost: number
    average_cost_per_unit: number
    batches_used: number
  }
}

interface BatchDeduction {
  batch_id: string
  quantity_deducted: number
  cost_per_unit: number
  total_cost: number
  remaining_in_batch: number
  expiry_date?: string
  supplier_info?: string
}

interface StockWarning {
  type: 'low_stock' | 'near_expiry' | 'insufficient_stock' | 'batch_empty'
  ingredient_id: string
  ingredient_name: string
  message: string
  current_stock: number
  minimum_stock: number
  severity: 'low' | 'medium' | 'high'
}

interface StockAlert {
  type: 'stock_depleted' | 'expiry_soon' | 'reorder_needed' | 'cost_spike'
  ingredient_id: string
  ingredient_name: string
  message: string
  action_required: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  data: Record<string, any>
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Process stock deduction for confirmed order
 */
async function handleProcessStockDeduction(request: Request): Promise<Response> {
  try {
    // Extract order ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.length - 1]

    if (!orderId) {
      return createErrorResponse('Order ID required', 400, undefined, request)
    }

    // Parse request body (optional parameters)
    const body = await parseJsonBody(request) || {}
    const deductionParams = body as StockDeductionRequest
    deductionParams.order_id = orderId

    // Authenticate (system, kasir, or owner)
    const authResult = await authenticateStockOperation(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get order details with items and recipes
    const orderData = await getOrderWithRecipes(orderId)
    if (!orderData.success) {
      return createNotFoundResponse('Order or recipe data', request)
    }

    // Validate order status (should be confirmed)
    if (orderData.order.status !== 'confirmed') {
      return createErrorResponse(
        `Cannot process stock deduction for order with status: ${orderData.order.status}`,
        400,
        undefined,
        request
      )
    }

    // Check if stock already deducted
    const { data: existingDeduction } = await supabaseAdmin
      .from('stock_movements')
      .select('id')
      .eq('order_id', orderId)
      .eq('movement_type', 'stock_out')
      .limit(1)

    if (existingDeduction && existingDeduction.length > 0) {
      return createErrorResponse(
        'Stock already deducted for this order',
        400,
        { existing_deduction_id: existingDeduction[0].id },
        request
      )
    }

    // Preview stock deduction to check availability
    const previewResult = await previewStockDeduction(orderData.order, deductionParams)
    if (!previewResult.can_proceed) {
      if (deductionParams.force_deduction) {
        console.warn('Forcing stock deduction despite warnings:', previewResult.warnings)
      } else {
        return createErrorResponse(
          'Insufficient stock for order',
          400,
          { 
            preview_result: previewResult,
            suggestion: 'Use force_deduction=true to override warnings'
          },
          request
        )
      }
    }

    // Execute stock deduction
    const deductionResult = await executeStockDeduction(orderData.order, deductionParams, authResult.user_id || 'system')
    if (!deductionResult.success) {
      return createErrorResponse(
        deductionResult.error || 'Stock deduction failed',
        500,
        undefined,
        request
      )
    }

    // Update order status to preparing (ready for kitchen)
    await updateOrderStatus(orderId, 'preparing')

    // Send notifications for alerts and warnings
    if (deductionResult.result) {
      await processStockAlerts(deductionResult.result.alerts, deductionResult.result.warnings)

      // Log audit
      await logAudit(
        authResult.user_id || 'system',
        'PROCESS_STOCK_DEDUCTION',
        {
          order_id: orderId,
          ingredients_affected: deductionResult.result.total_ingredients_affected,
          total_cost: deductionResult.result.total_cost_deducted,
          warnings_count: deductionResult.result.warnings.length,
          alerts_count: deductionResult.result.alerts.length
        },
        'stock_movements',
        orderId
      )
    }

    return createSuccessResponse(
      deductionResult.result,
      'Stock deduction completed successfully. Order ready for kitchen.',
      {
        order_status: 'preparing',
        next_steps: [
          'Order sent to kitchen for preparation',
          'Stock levels updated in real-time',
          'Alerts sent for low stock items'
        ]
      },
      request
    )

  } catch (error) {
    console.error('Error in handleProcessStockDeduction:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Manual stock adjustment (owner/stok role only)
 */
async function handleManualStockAdjustment(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const adjustments = Array.isArray(body) ? body : [body]
    
    // Validate each adjustment
    for (const adjustment of adjustments) {
      const validation = validateFields(adjustment, {
        ingredient_id: { required: true, type: 'string' },
        adjustment_type: { required: true, type: 'string' },
        quantity: { required: true, type: 'number', min: 0.01 },
        reason: { required: true, type: 'string' }
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
    }

    // Authenticate (owner or stok role)
    const authResult = await authenticateStockOperation(request, ['owner', 'stok'])
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Process each adjustment
    const results: any[] = []
    for (const adjustment of adjustments) {
      const result = await processManualAdjustment(adjustment as ManualStockAdjustment, authResult.user_id || 'system')
      results.push(result)
    }

    // Log audit
    await logAudit(
      authResult.user_id || 'system',
      'MANUAL_STOCK_ADJUSTMENT',
      {
        adjustments_count: adjustments.length,
        total_quantity_changed: adjustments.reduce((sum, adj) => sum + adj.quantity, 0),
        adjustment_types: [...new Set(adjustments.map(adj => adj.adjustment_type))]
      },
      'stock_movements',
      'manual_adjustment'
    )

    return createSuccessResponse(
      { adjustments: results },
      `${results.length} stock adjustments processed successfully`,
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleManualStockAdjustment:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Preview stock deduction without executing
 */
async function handlePreviewStockDeduction(request: Request): Promise<Response> {
  try {
    // Extract order ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const orderId = pathParts[pathParts.length - 1]

    if (!orderId) {
      return createErrorResponse('Order ID required', 400, undefined, request)
    }

    // Get order details
    const orderData = await getOrderWithRecipes(orderId)
    if (!orderData.success) {
      return createNotFoundResponse('Order or recipe data', request)
    }

    // Run preview
    const previewResult = await previewStockDeduction(orderData.order, { order_id: orderId })

    return createSuccessResponse(
      previewResult,
      'Stock deduction preview completed',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handlePreviewStockDeduction:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Reconcile inventory discrepancies
 */
async function handleInventoryReconciliation(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    // Authenticate (owner only)
    const authResult = await authenticateStockOperation(request, ['owner'])
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    const reconciliationData = body as {
      ingredient_reconciliations: Array<{
        ingredient_id: string
        physical_count: number
        reason: string
      }>
      reconciliation_notes?: string
    }

    // Process reconciliation
    const reconciliationResult = await processInventoryReconciliation(
      reconciliationData.ingredient_reconciliations,
      authResult.user_id || 'system',
      reconciliationData.reconciliation_notes
    )

    return createSuccessResponse(
      reconciliationResult,
      'Inventory reconciliation completed',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleInventoryReconciliation:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

// ===========================================
// CORE BUSINESS LOGIC
// ===========================================

/**
 * Get order with full recipe details
 */
async function getOrderWithRecipes(orderId: string): Promise<{
  success: boolean
  error?: string
  order?: any
}> {
  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, status, table_id, customer_name,
        order_items(
          id, menu_item_id, quantity, unit_price, total_price,
          menu_items(
            id, name, category,
            recipes(
              ingredient_id, quantity_needed,
              ingredients(
                id, name, unit, current_stock, min_stock, cost_per_unit
              )
            )
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return {
        success: false,
        error: 'Order not found or missing recipe data'
      }
    }

    return {
      success: true,
      order
    }

  } catch (error) {
    console.error('Error getting order with recipes:', error)
    return {
      success: false,
      error: 'Failed to retrieve order data'
    }
  }
}

/**
 * Preview stock deduction to check availability
 */
async function previewStockDeduction(
  order: any,
  params: StockDeductionRequest
): Promise<{
  can_proceed: boolean
  total_ingredients: number
  ingredient_analysis: Array<{
    ingredient_id: string
    ingredient_name: string
    required_quantity: number
    available_stock: number
    sufficient: boolean
    shortage_amount?: number
  }>
  warnings: StockWarning[]
  estimated_cost: number
}> {
  const ingredientAnalysis: any[] = []
  const warnings: StockWarning[] = []
  let totalCost = 0
  let canProceed = true

  try {
    // Aggregate ingredient requirements from all order items
    const ingredientRequirements = new Map<string, {
      ingredient: any
      total_needed: number
    }>()

    for (const orderItem of order.order_items) {
      if (!orderItem.menu_items.recipes) continue

      for (const recipe of orderItem.menu_items.recipes) {
        const ingredient = recipe.ingredients
        const needed = recipe.quantity_needed * orderItem.quantity

        if (ingredientRequirements.has(ingredient.id)) {
          ingredientRequirements.get(ingredient.id)!.total_needed += needed
        } else {
          ingredientRequirements.set(ingredient.id, {
            ingredient,
            total_needed: needed
          })
        }
      }
    }

    // Analyze each ingredient
    for (const [ingredientId, requirement] of ingredientRequirements) {
      const ingredient = requirement.ingredient
      const requiredQty = requirement.total_needed
      const availableStock = ingredient.current_stock
      const sufficient = availableStock >= requiredQty

      if (!sufficient) {
        canProceed = false
      }

      const analysis: any = {
        ingredient_id: ingredientId,
        ingredient_name: ingredient.name,
        required_quantity: requiredQty,
        available_stock: availableStock,
        sufficient
      }

      if (!sufficient) {
        analysis.shortage_amount = requiredQty - availableStock
        warnings.push({
          type: 'insufficient_stock',
          ingredient_id: ingredientId,
          ingredient_name: ingredient.name,
          message: `Insufficient stock. Need: ${requiredQty} ${ingredient.unit}, Available: ${availableStock} ${ingredient.unit}`,
          current_stock: availableStock,
          minimum_stock: requiredQty,
          severity: 'high'
        })
      }

      // Check for low stock warning
      if (sufficient && (availableStock - requiredQty) <= ingredient.min_stock) {
        warnings.push({
          type: 'low_stock',
          ingredient_id: ingredientId,
          ingredient_name: ingredient.name,
          message: `Will be low stock after deduction. Remaining: ${availableStock - requiredQty} ${ingredient.unit}`,
          current_stock: availableStock - requiredQty,
          minimum_stock: ingredient.min_stock,
          severity: 'medium'
        })
      }

      ingredientAnalysis.push(analysis)
      totalCost += requiredQty * ingredient.cost_per_unit
    }

    return {
      can_proceed: canProceed,
      total_ingredients: ingredientRequirements.size,
      ingredient_analysis: ingredientAnalysis,
      warnings,
      estimated_cost: totalCost
    }

  } catch (error) {
    console.error('Error in preview stock deduction:', error)
    return {
      can_proceed: false,
      total_ingredients: 0,
      ingredient_analysis: [],
      warnings: [{
        type: 'insufficient_stock',
        ingredient_id: 'system',
        ingredient_name: 'System',
        message: 'Error analyzing stock requirements',
        current_stock: 0,
        minimum_stock: 0,
        severity: 'high'
      }],
      estimated_cost: 0
    }
  }
}

/**
 * Execute stock deduction using FIFO method
 */
async function executeStockDeduction(
  order: any,
  params: StockDeductionRequest,
  userId: string
): Promise<{
  success: boolean
  error?: string
  result?: StockDeductionResult
}> {
  try {
    const deductions: IngredientDeduction[] = []
    const warnings: StockWarning[] = []
    const alerts: StockAlert[] = []
    let totalCostDeducted = 0

    // Aggregate ingredient requirements
    const ingredientRequirements = new Map<string, number>()
    
    for (const orderItem of order.order_items) {
      if (!orderItem.menu_items.recipes) continue

      for (const recipe of orderItem.menu_items.recipes) {
        const ingredientId = recipe.ingredient_id
        const needed = recipe.quantity_needed * orderItem.quantity

        ingredientRequirements.set(
          ingredientId,
          (ingredientRequirements.get(ingredientId) || 0) + needed
        )
      }
    }

    // Process each ingredient deduction
    for (const [ingredientId, totalNeeded] of ingredientRequirements) {
      const deductionResult = await deductIngredientFIFO(
        ingredientId,
        totalNeeded,
        order.id,
        userId,
        params.batch_preference || 'fifo'
      )

      if (!deductionResult.success) {
        return {
          success: false,
          error: `Failed to deduct ingredient ${ingredientId}: ${deductionResult.error}`
        }
      }

      deductions.push(deductionResult.deduction!)
      warnings.push(...deductionResult.warnings)
      alerts.push(...deductionResult.alerts)
      totalCostDeducted += deductionResult.deduction!.cost_calculation.total_cost
    }

    const result: StockDeductionResult = {
      order_id: order.id,
      total_items_processed: order.order_items.length,
      total_ingredients_affected: deductions.length,
      total_cost_deducted: totalCostDeducted,
      deductions,
      warnings,
      alerts
    }

    return {
      success: true,
      result
    }

  } catch (error) {
    console.error('Error executing stock deduction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Stock deduction execution failed'
    }
  }
}

/**
 * Deduct ingredient stock using FIFO method
 */
async function deductIngredientFIFO(
  ingredientId: string,
  quantityNeeded: number,
  orderId: string,
  userId: string,
  method: 'fifo' | 'lifo' | 'specific_batch' = 'fifo'
): Promise<{
  success: boolean
  error?: string
  deduction?: IngredientDeduction
  warnings: StockWarning[]
  alerts: StockAlert[]
}> {
  const warnings: StockWarning[] = []
  const alerts: StockAlert[] = []
  const batchDeductions: BatchDeduction[] = []

  try {
    // Get ingredient details
    const { data: ingredient, error: ingredientError } = await supabaseAdmin
      .from('ingredients')
      .select('id, name, unit, current_stock, min_stock, cost_per_unit')
      .eq('id', ingredientId)
      .single()

    if (ingredientError || !ingredient) {
      return {
        success: false,
        error: `Ingredient not found: ${ingredientId}`,
        warnings,
        alerts
      }
    }

    // Get available batches (FIFO order - oldest first)
    const orderBy = method === 'lifo' ? { ascending: false } : { ascending: true }
    
    const { data: batches, error: batchError } = await supabaseAdmin
      .from('stock_batches')
      .select('id, batch_number, remaining_quantity, cost_per_unit, expiry_date, supplier_name')
      .eq('ingredient_id', ingredientId)
      .gt('remaining_quantity', 0)
      .order('created_at', orderBy)

    if (batchError) {
      return {
        success: false,
        error: `Failed to retrieve batches: ${batchError.message}`,
        warnings,
        alerts
      }
    }

    let remainingNeeded = quantityNeeded
    let totalCost = 0

    // Process batches in FIFO order
    for (const batch of batches || []) {
      if (remainingNeeded <= 0) break

      const deductFromBatch = Math.min(remainingNeeded, batch.remaining_quantity)
      const batchCost = deductFromBatch * batch.cost_per_unit

      // Update batch quantity
      const newBatchQuantity = batch.remaining_quantity - deductFromBatch
      
      const { error: updateBatchError } = await supabaseAdmin
        .from('stock_batches')
        .update({
          remaining_quantity: newBatchQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id)

      if (updateBatchError) {
        console.error('Error updating batch:', updateBatchError)
        continue
      }

      // Record batch deduction
      batchDeductions.push({
        batch_id: batch.id,
        quantity_deducted: deductFromBatch,
        cost_per_unit: batch.cost_per_unit,
        total_cost: batchCost,
        remaining_in_batch: newBatchQuantity,
        expiry_date: batch.expiry_date,
        supplier_info: batch.supplier_name
      })

      // Create stock movement record
      await supabaseAdmin
        .from('stock_movements')
        .insert({
          ingredient_id: ingredientId,
          batch_id: batch.id,
          movement_type: 'stock_out',
          quantity: deductFromBatch,
          cost_per_unit: batch.cost_per_unit,
          total_cost: batchCost,
          order_id: orderId,
          notes: `Stock deduction for order ${orderId}`,
          performed_by: userId,
          created_at: new Date().toISOString()
        })

      totalCost += batchCost
      remainingNeeded -= deductFromBatch

      // Check for batch empty alert
      if (newBatchQuantity === 0) {
        alerts.push({
          type: 'stock_depleted',
          ingredient_id: ingredientId,
          ingredient_name: ingredient.name,
          message: `Batch ${batch.batch_number} is now empty`,
          action_required: 'Archive empty batch',
          priority: 'low',
          data: { batch_id: batch.id, batch_number: batch.batch_number }
        })
      }

      // Check for expiry warning
      if (batch.expiry_date) {
        const expiryDate = new Date(batch.expiry_date)
        const daysTillExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        
        if (daysTillExpiry <= 7 && newBatchQuantity > 0) {
          alerts.push({
            type: 'expiry_soon',
            ingredient_id: ingredientId,
            ingredient_name: ingredient.name,
            message: `Batch ${batch.batch_number} expires in ${Math.ceil(daysTillExpiry)} days`,
            action_required: 'Use batch soon or mark as waste',
            priority: daysTillExpiry <= 3 ? 'high' : 'medium',
            data: { 
              batch_id: batch.id, 
              expiry_date: batch.expiry_date,
              remaining_quantity: newBatchQuantity
            }
          })
        }
      }
    }

    // Update ingredient total stock
    const newIngredientStock = ingredient.current_stock - (quantityNeeded - remainingNeeded)
    
    const { error: updateIngredientError } = await supabaseAdmin
      .from('ingredients')
      .update({
        current_stock: newIngredientStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', ingredientId)

    if (updateIngredientError) {
      console.error('Error updating ingredient stock:', updateIngredientError)
    }

    // Check for insufficient stock
    if (remainingNeeded > 0) {
      warnings.push({
        type: 'insufficient_stock',
        ingredient_id: ingredientId,
        ingredient_name: ingredient.name,
        message: `Could not deduct full amount. Short by: ${remainingNeeded} ${ingredient.unit}`,
        current_stock: newIngredientStock,
        minimum_stock: ingredient.min_stock,
        severity: 'high'
      })
    }

    // Check for low stock warning
    if (newIngredientStock <= ingredient.min_stock) {
      const severity = newIngredientStock <= 0 ? 'high' : 'medium'
      
      warnings.push({
        type: 'low_stock',
        ingredient_id: ingredientId,
        ingredient_name: ingredient.name,
        message: `Stock is now ${severity === 'high' ? 'depleted' : 'below minimum'}. Current: ${newIngredientStock} ${ingredient.unit}`,
        current_stock: newIngredientStock,
        minimum_stock: ingredient.min_stock,
        severity
      })

      alerts.push({
        type: newIngredientStock <= 0 ? 'stock_depleted' : 'reorder_needed',
        ingredient_id: ingredientId,
        ingredient_name: ingredient.name,
        message: `${ingredient.name} ${newIngredientStock <= 0 ? 'is out of stock' : 'needs reordering'}`,
        action_required: newIngredientStock <= 0 ? 'Urgent restock needed' : 'Create purchase order',
        priority: newIngredientStock <= 0 ? 'urgent' : 'high',
        data: {
          current_stock: newIngredientStock,
          minimum_stock: ingredient.min_stock,
          suggested_order_quantity: ingredient.min_stock * 3
        }
      })
    }

    const deduction: IngredientDeduction = {
      ingredient_id: ingredientId,
      ingredient_name: ingredient.name,
      total_quantity_needed: quantityNeeded,
      total_quantity_deducted: quantityNeeded - remainingNeeded,
      remaining_stock: newIngredientStock,
      unit: ingredient.unit,
      batch_deductions: batchDeductions,
      cost_calculation: {
        total_cost: totalCost,
        average_cost_per_unit: totalCost / (quantityNeeded - remainingNeeded),
        batches_used: batchDeductions.length
      }
    }

    return {
      success: true,
      deduction,
      warnings,
      alerts
    }

  } catch (error) {
    console.error('Error in deductIngredientFIFO:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'FIFO deduction failed',
      warnings,
      alerts
    }
  }
}

/**
 * Process manual stock adjustment
 */
async function processManualAdjustment(
  adjustment: ManualStockAdjustment,
  userId: string
): Promise<{
  success: boolean
  error?: string
  adjustment_id?: string
  new_stock_level?: number
}> {
  try {
    // Get current ingredient stock
    const { data: ingredient, error: ingredientError } = await supabaseAdmin
      .from('ingredients')
      .select('current_stock, min_stock, cost_per_unit')
      .eq('id', adjustment.ingredient_id)
      .single()

    if (ingredientError || !ingredient) {
      return {
        success: false,
        error: 'Ingredient not found'
      }
    }

    // Calculate new stock level
    let stockChange = adjustment.quantity
    if (adjustment.adjustment_type === 'deduction' || adjustment.adjustment_type === 'waste') {
      stockChange = -stockChange
    }

    const newStockLevel = ingredient.current_stock + stockChange
    
    // Validate new stock level
    if (newStockLevel < 0) {
      return {
        success: false,
        error: 'Adjustment would result in negative stock'
      }
    }

    // Update ingredient stock
    const { error: updateError } = await supabaseAdmin
      .from('ingredients')
      .update({
        current_stock: newStockLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', adjustment.ingredient_id)

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update ingredient stock'
      }
    }

    // Create stock movement record
    const { data: movement, error: movementError } = await supabaseAdmin
      .from('stock_movements')
      .insert({
        ingredient_id: adjustment.ingredient_id,
        batch_id: adjustment.batch_id,
        movement_type: adjustment.adjustment_type,
        quantity: Math.abs(adjustment.quantity),
        cost_per_unit: adjustment.cost_per_unit || ingredient.cost_per_unit,
        total_cost: Math.abs(adjustment.quantity) * (adjustment.cost_per_unit || ingredient.cost_per_unit),
        notes: sanitizeString(adjustment.reason),
        performed_by: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (movementError) {
      console.error('Error creating stock movement:', movementError)
    }

    // Handle batch creation for additions
    if (adjustment.adjustment_type === 'addition' && adjustment.quantity > 0) {
      await createStockBatch(
        adjustment.ingredient_id,
        adjustment.quantity,
        adjustment.cost_per_unit || ingredient.cost_per_unit,
        adjustment.expiry_date,
        `Manual addition - ${adjustment.reason}`,
        userId
      )
    }

    return {
      success: true,
      adjustment_id: movement?.id,
      new_stock_level: newStockLevel
    }

  } catch (error) {
    console.error('Error processing manual adjustment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Manual adjustment failed'
    }
  }
}

/**
 * Create new stock batch for additions
 */
async function createStockBatch(
  ingredientId: string,
  quantity: number,
  costPerUnit: number,
  expiryDate?: string,
  notes?: string,
  userId?: string
): Promise<void> {
  try {
    // Generate batch number
    const batchNumber = await generateBatchNumber(ingredientId)

    await supabaseAdmin
      .from('stock_batches')
      .insert({
        ingredient_id: ingredientId,
        batch_number: batchNumber,
        initial_quantity: quantity,
        remaining_quantity: quantity,
        cost_per_unit: costPerUnit,
        expiry_date: expiryDate,
        supplier_name: 'Manual Addition',
        notes: notes,
        created_by: userId,
        created_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error creating stock batch:', error)
  }
}

/**
 * Generate unique batch number
 */
async function generateBatchNumber(ingredientId: string): Promise<string> {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    
    // Get today's batch count for this ingredient
    const { data: batches } = await supabaseAdmin
      .from('stock_batches')
      .select('id')
      .eq('ingredient_id', ingredientId)
      .gte('created_at', `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
    
    const count = batches ? batches.length : 0

    const sequence = String((count || 0) + 1).padStart(3, '0')
    const ingredientCode = ingredientId.slice(-4).toUpperCase()
    
    return `BATCH-${ingredientCode}-${today}-${sequence}`

  } catch (error) {
    console.error('Error generating batch number:', error)
    return `BATCH-${Date.now()}`
  }
}

/**
 * Process inventory reconciliation
 */
async function processInventoryReconciliation(
  reconciliations: Array<{
    ingredient_id: string
    physical_count: number
    reason: string
  }>,
  userId: string,
  notes?: string
): Promise<{
  total_reconciled: number
  adjustments: Array<{
    ingredient_id: string
    ingredient_name: string
    system_count: number
    physical_count: number
    difference: number
    adjustment_made: boolean
  }>
}> {
  const adjustments: Array<{
    ingredient_id: string
    ingredient_name: string
    system_count: number
    physical_count: number
    difference: number
    adjustment_made: boolean
  }> = []

  for (const reconciliation of reconciliations) {
    try {
      // Get current system stock
      const { data: ingredient, error } = await supabaseAdmin
        .from('ingredients')
        .select('id, name, current_stock')
        .eq('id', reconciliation.ingredient_id)
        .single()

      if (error || !ingredient) {
        adjustments.push({
          ingredient_id: reconciliation.ingredient_id,
          ingredient_name: 'Unknown',
          system_count: 0,
          physical_count: reconciliation.physical_count,
          difference: 0,
          adjustment_made: false
        })
        continue
      }

      const difference = reconciliation.physical_count - ingredient.current_stock
      let adjustmentMade = false

      if (Math.abs(difference) > 0.01) { // Tolerance for rounding
        // Create adjustment
        const adjustmentType = difference > 0 ? 'addition' : 'adjustment'
        const adjustmentQuantity = Math.abs(difference)

        const adjustmentResult = await processManualAdjustment({
          ingredient_id: reconciliation.ingredient_id,
          adjustment_type: adjustmentType,
          quantity: adjustmentQuantity,
          reason: `Inventory reconciliation: ${reconciliation.reason}. ${notes || ''}`
        }, userId)

        adjustmentMade = adjustmentResult.success
      }

      adjustments.push({
        ingredient_id: reconciliation.ingredient_id,
        ingredient_name: ingredient.name,
        system_count: ingredient.current_stock,
        physical_count: reconciliation.physical_count,
        difference,
        adjustment_made: adjustmentMade
      })

    } catch (error) {
      console.error('Error processing reconciliation:', error)
      adjustments.push({
        ingredient_id: reconciliation.ingredient_id,
        ingredient_name: 'Error',
        system_count: 0,
        physical_count: reconciliation.physical_count,
        difference: 0,
        adjustment_made: false
      })
    }
  }

  return {
    total_reconciled: reconciliations.length,
    adjustments
  }
}

/**
 * Update order status
 */
async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
  } catch (error) {
    console.error('Error updating order status:', error)
  }
}

/**
 * Process stock alerts and warnings
 */
async function processStockAlerts(alerts: StockAlert[], warnings: StockWarning[]): Promise<void> {
  try {
    // Send notifications for high priority alerts
    for (const alert of alerts) {
      if (alert.priority === 'urgent' || alert.priority === 'high') {
        await supabaseAdmin
          .from('notifications')
          .insert({
            type: 'stock_alert',
            title: `Stock Alert: ${alert.ingredient_name}`,
            message: alert.message,
            data: {
              alert_type: alert.type,
              ingredient_id: alert.ingredient_id,
              action_required: alert.action_required,
              priority: alert.priority,
              ...alert.data
            },
            channel: 'in_app',
            target_role: 'owner',
            priority: alert.priority
          })
      }
    }

    // Log warnings for monitoring
    for (const warning of warnings) {
      if (warning.severity === 'high') {
        await supabaseAdmin
          .from('notifications')
          .insert({
            type: 'stock_warning',
            title: `Stock Warning: ${warning.ingredient_name}`,
            message: warning.message,
            data: {
              warning_type: warning.type,
              ingredient_id: warning.ingredient_id,
              current_stock: warning.current_stock,
              minimum_stock: warning.minimum_stock,
              severity: warning.severity
            },
            channel: 'in_app',
            target_role: 'stok'
          })
      }
    }

  } catch (error) {
    console.error('Error processing stock alerts:', error)
  }
}

/**
 * Authenticate stock operation
 */
async function authenticateStockOperation(
  request: Request,
  allowedRoles: string[] = ['kasir', 'stok', 'owner']
): Promise<{
  success: boolean
  error?: string
  user_id?: string
  role?: string
}> {
  try {
    // Try device authentication first
    const deviceInfo = extractDeviceInfo(request)
    if (deviceInfo) {
      const deviceAccount = await validateDeviceAuth(deviceInfo.deviceId, deviceInfo.deviceRole)
      if (deviceAccount && allowedRoles.includes(deviceInfo.deviceRole)) {
        return { 
          success: true, 
          user_id: deviceAccount.device_id,
          role: deviceInfo.deviceRole
        }
      }
    }

    // Try user authentication
    const authResult = await getAuthenticatedClient(request)
    if (authResult) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('user_id, position')
        .eq('user_id', authResult.user.id)
        .eq('status', 'active')
        .single()

      if (employee && allowedRoles.includes(employee.position)) {
        return { 
          success: true, 
          user_id: authResult.user.id,
          role: employee.position
        }
      }
    }

    return {
      success: false,
      error: `Unauthorized. Required roles: ${allowedRoles.join(', ')}`
    }

  } catch (error) {
    console.error('Error authenticating stock operation:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * Extract device info from headers
 */
function extractDeviceInfo(request: Request): {
  deviceId: string
  deviceRole: 'kasir' | 'dapur' | 'pelayan' | 'stok'
} | null {
  const deviceId = request.headers.get('X-Device-ID')
  const deviceRole = request.headers.get('X-Device-Role') as 'kasir' | 'dapur' | 'pelayan' | 'stok'

  if (!deviceId || !deviceRole) {
    return null
  }

  return { deviceId, deviceRole }
}

/**
 * Get stock deduction statistics
 */
export async function getStockDeductionStats(): Promise<{
  total_deductions_today: number
  total_cost_deducted_today: number
  ingredients_affected_today: number
  low_stock_alerts: number
  urgent_reorders_needed: number
  average_deduction_time: number
}> {
  try {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    // Get today's stock movements
    const { data: todayMovements } = await supabaseAdmin
      .from('stock_movements')
      .select('total_cost, ingredient_id, created_at')
      .eq('movement_type', 'stock_out')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    // Get low stock alerts
    const { data: lowStockIngredients } = await supabaseAdmin
      .from('ingredients')
      .select('current_stock, min_stock')
      .lte('current_stock', 'min_stock')

    const totalDeductions = todayMovements?.length || 0
    const totalCostDeducted = todayMovements?.reduce((sum, mov) => sum + mov.total_cost, 0) || 0
    const uniqueIngredients = new Set(todayMovements?.map(mov => mov.ingredient_id)).size
    const lowStockCount = lowStockIngredients?.length || 0
    const urgentReorders = lowStockIngredients?.filter(ing => ing.current_stock <= 0).length || 0

    return {
      total_deductions_today: totalDeductions,
      total_cost_deducted_today: totalCostDeducted,
      ingredients_affected_today: uniqueIngredients,
      low_stock_alerts: lowStockCount,
      urgent_reorders_needed: urgentReorders,
      average_deduction_time: 0 // TODO: Calculate based on order confirmation to deduction time
    }

  } catch (error) {
    console.error('Error getting stock deduction stats:', error)
    return {
      total_deductions_today: 0,
      total_cost_deducted_today: 0,
      ingredients_affected_today: 0,
      low_stock_alerts: 0,
      urgent_reorders_needed: 0,
      average_deduction_time: 0
    }
  }
}

// ===========================================
// MAIN HANDLER WITH ROUTING
// ===========================================

const handler = withCors(createHandler({
  POST: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/process/')) {
      return handleProcessStockDeduction(request)
    } else if (url.pathname.includes('/manual')) {
      return handleManualStockAdjustment(request)
    } else if (url.pathname.includes('/reconcile')) {
      return handleInventoryReconciliation(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/preview/')) {
      return handlePreviewStockDeduction(request)
    } else if (url.pathname.includes('/stats')) {
      const stats = await getStockDeductionStats()
      return createSuccessResponse(stats, 'Stock deduction statistics retrieved', undefined, request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler