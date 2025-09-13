/**
 * Order Processing Validator
 * 
 * Comprehensive validation functions for order processing
 * Handles business rules, menu availability, stock levels, and operational constraints
 */

import { supabaseAdmin } from '../_shared/supabase-client'
import { 
  isValidTableNumber,
  isValidOrderQuantity,
  isValidRupiahAmount,
  isValidTime,
  sanitizeString,
  validateFields
} from '../../../packages/utils/src/validators/index'

// Validation interfaces
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings?: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  details?: any
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

export interface OrderItem {
  menu_item_id: string
  quantity: number
  unit_price: number
  customizations?: Array<{
    customization_option_id: string
    value: string
    additional_price: number
  }>
  notes?: string
}

export interface MenuItemDetails {
  id: string
  name: string
  price: number
  status: string
  category: string
  preparation_time: number
  ingredients: Array<{
    ingredient_id: string
    ingredient_name: string
    quantity_needed: number
    unit: string
    current_stock: number
    min_stock: number
  }>
  customization_groups: Array<{
    id: string
    name: string
    type: string
    required: boolean
    options: Array<{
      id: string
      name: string
      additional_price: number
      is_available: boolean
    }>
  }>
}

// ===========================================
// CORE VALIDATION FUNCTIONS
// ===========================================

/**
 * Validate complete order data with business rules
 */
export async function validateOrderCreation(orderData: {
  table_number: number
  customer_name: string
  items: OrderItem[]
  order_type: 'dine_in' | 'takeaway'
  special_instructions?: string
}): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  try {
    // 1. Basic field validation
    const basicValidation = validateBasicOrderFields(orderData)
    errors.push(...basicValidation.errors)

    // 2. Business hours validation
    const businessHoursValidation = await validateBusinessHours()
    if (!businessHoursValidation.valid) {
      errors.push(...businessHoursValidation.errors)
    }

    // 3. Table validation
    const tableValidation = await validateTableForOrder(orderData.table_number, orderData.order_type)
    if (!tableValidation.valid) {
      errors.push(...tableValidation.errors)
    }

    // 4. Menu items validation
    const menuValidation = await validateMenuItems(orderData.items)
    if (!menuValidation.valid) {
      errors.push(...menuValidation.errors)
    }
    warnings.push(...(menuValidation.warnings || []))

    // 5. Stock availability validation
    const stockValidation = await validateStockAvailability(orderData.items)
    if (!stockValidation.valid) {
      errors.push(...stockValidation.errors)
    }
    warnings.push(...(stockValidation.warnings || []))

    // 6. Order limits validation
    const limitsValidation = validateOrderLimits(orderData.items)
    if (!limitsValidation.valid) {
      errors.push(...limitsValidation.errors)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }

  } catch (error) {
    console.error('Error in validateOrderCreation:', error)
    return {
      valid: false,
      errors: [{
        field: 'system',
        message: 'Validation system error',
        code: 'SYSTEM_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }]
    }
  }
}

/**
 * Validate basic order fields
 */
export function validateBasicOrderFields(orderData: {
  table_number: number
  customer_name: string
  items: OrderItem[]
  order_type: 'dine_in' | 'takeaway'
  special_instructions?: string
}): ValidationResult {
  const errors: ValidationError[] = []

  // Table number validation
  if (!isValidTableNumber(orderData.table_number)) {
    errors.push({
      field: 'table_number',
      message: 'Invalid table number. Must be between 1-999.',
      code: 'INVALID_TABLE_NUMBER'
    })
  }

  // Customer name validation
  const sanitizedName = sanitizeString(orderData.customer_name)
  if (!sanitizedName || sanitizedName.length < 2) {
    errors.push({
      field: 'customer_name',
      message: 'Customer name must be at least 2 characters long.',
      code: 'INVALID_CUSTOMER_NAME'
    })
  } else if (sanitizedName.length > 50) {
    errors.push({
      field: 'customer_name',
      message: 'Customer name cannot exceed 50 characters.',
      code: 'CUSTOMER_NAME_TOO_LONG'
    })
  }

  // Order type validation
  if (!['dine_in', 'takeaway'].includes(orderData.order_type)) {
    errors.push({
      field: 'order_type',
      message: 'Order type must be either "dine_in" or "takeaway".',
      code: 'INVALID_ORDER_TYPE'
    })
  }

  // Items validation
  if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push({
      field: 'items',
      message: 'Order must contain at least one item.',
      code: 'EMPTY_ORDER'
    })
  }

  // Special instructions validation
  if (orderData.special_instructions) {
    const sanitizedInstructions = sanitizeString(orderData.special_instructions)
    if (sanitizedInstructions.length > 200) {
      errors.push({
        field: 'special_instructions',
        message: 'Special instructions cannot exceed 200 characters.',
        code: 'INSTRUCTIONS_TOO_LONG'
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate business hours
 */
export async function validateBusinessHours(): Promise<ValidationResult> {
  try {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:mm format
    const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday

    // Get business hours from settings
    const { data: settings, error } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', ['business_hours_open', 'business_hours_close', 'business_days'])

    if (error) {
      throw error
    }

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, any>)

    const openTime = settingsMap.business_hours_open || '07:00'
    const closeTime = settingsMap.business_hours_close || '22:00'
    const businessDays = settingsMap.business_days || [1, 2, 3, 4, 5, 6, 0] // Mon-Sun

    // Check if today is a business day
    if (!businessDays.includes(currentDay)) {
      return {
        valid: false,
        errors: [{
          field: 'business_hours',
          message: 'Cafe is closed today.',
          code: 'CLOSED_TODAY'
        }]
      }
    }

    // Check if current time is within business hours
    if (currentTime < openTime || currentTime > closeTime) {
      return {
        valid: false,
        errors: [{
          field: 'business_hours',
          message: `Cafe is closed. Business hours: ${openTime} - ${closeTime}`,
          code: 'OUTSIDE_BUSINESS_HOURS',
          details: { open_time: openTime, close_time: closeTime }
        }]
      }
    }

    return { valid: true, errors: [] }

  } catch (error) {
    console.error('Error validating business hours:', error)
    return {
      valid: false,
      errors: [{
        field: 'business_hours',
        message: 'Unable to verify business hours',
        code: 'BUSINESS_HOURS_ERROR'
      }]
    }
  }
}

/**
 * Validate table availability and constraints
 */
export async function validateTableForOrder(
  tableNumber: number, 
  orderType: 'dine_in' | 'takeaway'
): Promise<ValidationResult> {
  try {
    // For takeaway orders, table validation is less strict
    if (orderType === 'takeaway') {
      return { valid: true, errors: [] }
    }

    // Get table details
    const { data: table, error } = await supabaseAdmin
      .from('tables')
      .select('id, table_number, status, capacity, qr_code')
      .eq('table_number', tableNumber)
      .single()

    if (error || !table) {
      return {
        valid: false,
        errors: [{
          field: 'table_number',
          message: `Table ${tableNumber} does not exist.`,
          code: 'TABLE_NOT_FOUND'
        }]
      }
    }

    // Check table status
    if (table.status === 'occupied') {
      // Check if there's an active order for this table
      const { data: activeOrder } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('table_id', table.id)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (activeOrder) {
        return {
          valid: false,
          errors: [{
            field: 'table_number',
            message: `Table ${tableNumber} is currently occupied with an active order.`,
            code: 'TABLE_OCCUPIED',
            details: { active_order_id: activeOrder.id }
          }]
        }
      }
    }

    if (table.status === 'reserved') {
      return {
        valid: false,
        errors: [{
          field: 'table_number',
          message: `Table ${tableNumber} is reserved.`,
          code: 'TABLE_RESERVED'
        }]
      }
    }

    if (table.status === 'cleaning') {
      return {
        valid: false,
        errors: [{
          field: 'table_number',
          message: `Table ${tableNumber} is being cleaned. Please wait.`,
          code: 'TABLE_CLEANING'
        }]
      }
    }

    return { valid: true, errors: [] }

  } catch (error) {
    console.error('Error validating table:', error)
    return {
      valid: false,
      errors: [{
        field: 'table_number',
        message: 'Unable to verify table availability',
        code: 'TABLE_VALIDATION_ERROR'
      }]
    }
  }
}

/**
 * Validate menu items and their details
 */
export async function validateMenuItems(items: OrderItem[]): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const fieldPrefix = `items[${i}]`

      // Basic item validation
      if (!item.menu_item_id || typeof item.menu_item_id !== 'string') {
        errors.push({
          field: `${fieldPrefix}.menu_item_id`,
          message: 'Menu item ID is required.',
          code: 'MISSING_MENU_ITEM_ID'
        })
        continue
      }

      if (!isValidOrderQuantity(item.quantity)) {
        errors.push({
          field: `${fieldPrefix}.quantity`,
          message: 'Quantity must be between 1-100.',
          code: 'INVALID_QUANTITY'
        })
      }

      if (!isValidRupiahAmount(item.unit_price)) {
        errors.push({
          field: `${fieldPrefix}.unit_price`,
          message: 'Invalid unit price.',
          code: 'INVALID_UNIT_PRICE'
        })
      }

      // Get menu item details
      const menuItemValidation = await validateSingleMenuItem(item, fieldPrefix)
      errors.push(...menuItemValidation.errors)
      if (menuItemValidation.warnings) {
        warnings.push(...menuItemValidation.warnings)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }

  } catch (error) {
    console.error('Error validating menu items:', error)
    return {
      valid: false,
      errors: [{
        field: 'items',
        message: 'Menu items validation failed',
        code: 'MENU_VALIDATION_ERROR'
      }]
    }
  }
}

/**
 * Validate single menu item
 */
export async function validateSingleMenuItem(
  item: OrderItem, 
  fieldPrefix: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  try {
    // Get menu item with full details
    const { data: menuItem, error } = await supabaseAdmin
      .from('menu_items')
      .select(`
        id, name, price, status, category, preparation_time,
        menu_customization_groups(
          id, name, type, required, max_selections,
          menu_customization_options(
            id, name, additional_price, is_available
          )
        )
      `)
      .eq('id', item.menu_item_id)
      .single()

    if (error || !menuItem) {
      errors.push({
        field: `${fieldPrefix}.menu_item_id`,
        message: `Menu item not found: ${item.menu_item_id}`,
        code: 'MENU_ITEM_NOT_FOUND'
      })
      return { valid: false, errors }
    }

    // Check menu item availability
    if (menuItem.status !== 'active') {
      errors.push({
        field: `${fieldPrefix}.menu_item_id`,
        message: `Menu item "${menuItem.name}" is not available (${menuItem.status}).`,
        code: 'MENU_ITEM_UNAVAILABLE',
        details: { status: menuItem.status }
      })
    }

    // Validate price
    let expectedPrice = menuItem.price
    let customizationPrice = 0

    // Validate customizations
    if (item.customizations && item.customizations.length > 0) {
      const customizationValidation = validateCustomizations(
        item.customizations, 
        menuItem.menu_customization_groups,
        fieldPrefix
      )
      errors.push(...customizationValidation.errors)
      customizationPrice = customizationValidation.totalPrice || 0
    }

    // Check required customizations
    const requiredGroups = menuItem.menu_customization_groups.filter(group => group.required)
    for (const group of requiredGroups) {
      const hasCustomizationForGroup = item.customizations?.some(custom => 
        group.menu_customization_options.some(option => option.id === custom.customization_option_id)
      )

      if (!hasCustomizationForGroup) {
        errors.push({
          field: `${fieldPrefix}.customizations`,
          message: `Required customization "${group.name}" is missing.`,
          code: 'MISSING_REQUIRED_CUSTOMIZATION',
          details: { group_name: group.name }
        })
      }
    }

    expectedPrice += customizationPrice

    // Validate total price
    if (Math.abs(item.unit_price - expectedPrice) > 0.01) {
      errors.push({
        field: `${fieldPrefix}.unit_price`,
        message: `Price mismatch for "${menuItem.name}". Expected: Rp ${expectedPrice.toLocaleString('id-ID')}, Received: Rp ${item.unit_price.toLocaleString('id-ID')}`,
        code: 'PRICE_MISMATCH',
        details: { expected: expectedPrice, received: item.unit_price }
      })
    }

    // Check preparation time warning
    if (menuItem.preparation_time > 30) {
      warnings.push({
        field: `${fieldPrefix}`,
        message: `"${menuItem.name}" has extended preparation time (${menuItem.preparation_time} minutes).`,
        code: 'EXTENDED_PREP_TIME'
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }

  } catch (error) {
    console.error('Error validating single menu item:', error)
    return {
      valid: false,
      errors: [{
        field: fieldPrefix,
        message: 'Menu item validation failed',
        code: 'MENU_ITEM_VALIDATION_ERROR'
      }]
    }
  }
}

/**
 * Validate customizations for a menu item
 */
export function validateCustomizations(
  customizations: Array<{
    customization_option_id: string
    value: string
    additional_price: number
  }>,
  customizationGroups: any[],
  fieldPrefix: string
): ValidationResult & { totalPrice?: number } {
  const errors: ValidationError[] = []
  let totalPrice = 0

  for (let i = 0; i < customizations.length; i++) {
    const custom = customizations[i]
    const customFieldPrefix = `${fieldPrefix}.customizations[${i}]`

    // Find the option in the groups
    let foundOption = null
    let foundGroup = null

    for (const group of customizationGroups) {
      const option = group.menu_customization_options.find(
        opt => opt.id === custom.customization_option_id
      )
      if (option) {
        foundOption = option
        foundGroup = group
        break
      }
    }

    if (!foundOption) {
      errors.push({
        field: `${customFieldPrefix}.customization_option_id`,
        message: `Invalid customization option: ${custom.customization_option_id}`,
        code: 'INVALID_CUSTOMIZATION_OPTION'
      })
      continue
    }

    // Check if option is available
    if (!(foundOption as any).is_available) {
      errors.push({
        field: `${customFieldPrefix}.customization_option_id`,
        message: `Customization option "${(foundOption as any).name}" is not available.`,
        code: 'CUSTOMIZATION_OPTION_UNAVAILABLE'
      })
    }

    // Validate additional price
    if (Math.abs(custom.additional_price - (foundOption as any).additional_price) > 0.01) {
      errors.push({
        field: `${customFieldPrefix}.additional_price`,
        message: `Price mismatch for customization "${(foundOption as any).name}". Expected: Rp ${(foundOption as any).additional_price.toLocaleString('id-ID')}, Received: Rp ${custom.additional_price.toLocaleString('id-ID')}`,
        code: 'CUSTOMIZATION_PRICE_MISMATCH'
      })
    }

    // Validate value based on group type
    if ((foundGroup as any)?.type === 'single_select' && !custom.value) {
      errors.push({
        field: `${customFieldPrefix}.value`,
        message: `Value required for "${(foundOption as any).name}".`,
        code: 'CUSTOMIZATION_VALUE_REQUIRED'
      })
    }

    totalPrice += (foundOption as any).additional_price
  }

  return {
    valid: errors.length === 0,
    errors,
    totalPrice
  }
}

/**
 * Validate stock availability for order items
 */
export async function validateStockAvailability(items: OrderItem[]): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const fieldPrefix = `items[${i}]`

      // Get recipe and ingredients for this menu item
      const { data: recipes, error } = await supabaseAdmin
        .from('recipes')
        .select(`
          ingredient_id, quantity_needed,
          ingredients(
            id, name, current_stock, min_stock, unit
          )
        `)
        .eq('menu_item_id', item.menu_item_id)

      if (error) {
        console.error('Error fetching recipe:', error)
        continue
      }

      if (!recipes || recipes.length === 0) {
        warnings.push({
          field: fieldPrefix,
          message: `No recipe found for menu item. Stock validation skipped.`,
          code: 'NO_RECIPE_FOUND'
        })
        continue
      }

      // Check each ingredient
      for (const recipe of recipes) {
        const ingredient = recipe.ingredients
        const totalNeeded = recipe.quantity_needed * item.quantity

        if (!ingredient) {
          warnings.push({
            field: fieldPrefix,
            message: `Ingredient data missing for recipe.`,
            code: 'INGREDIENT_DATA_MISSING'
          })
          continue
        }

        // Check if enough stock available
        if (ingredient.current_stock < totalNeeded) {
          errors.push({
            field: fieldPrefix,
            message: `Insufficient stock for ingredient "${ingredient.name}". Available: ${ingredient.current_stock} ${ingredient.unit}, Needed: ${totalNeeded} ${ingredient.unit}`,
            code: 'INSUFFICIENT_STOCK',
            details: {
              ingredient_name: ingredient.name,
              available: ingredient.current_stock,
              needed: totalNeeded,
              unit: ingredient.unit
            }
          })
        }

        // Warning for low stock
        if (ingredient.current_stock - totalNeeded <= ingredient.min_stock) {
          warnings.push({
            field: fieldPrefix,
            message: `Low stock warning for ingredient "${ingredient.name}" after this order.`,
            code: 'LOW_STOCK_WARNING'
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }

  } catch (error) {
    console.error('Error validating stock availability:', error)
    return {
      valid: false,
      errors: [{
        field: 'items',
        message: 'Stock validation failed',
        code: 'STOCK_VALIDATION_ERROR'
      }]
    }
  }
}

/**
 * Validate order limits and constraints
 */
export function validateOrderLimits(items: OrderItem[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Check maximum items per order
  const maxItemsPerOrder = 20
  if (items.length > maxItemsPerOrder) {
    errors.push({
      field: 'items',
      message: `Order cannot contain more than ${maxItemsPerOrder} items.`,
      code: 'TOO_MANY_ITEMS',
      details: { max_allowed: maxItemsPerOrder, current: items.length }
    })
  }

  // Check maximum quantity per item
  const maxQuantityPerItem = 100
  items.forEach((item, index) => {
    if (item.quantity > maxQuantityPerItem) {
      errors.push({
        field: `items[${index}].quantity`,
        message: `Quantity cannot exceed ${maxQuantityPerItem} per item.`,
        code: 'QUANTITY_LIMIT_EXCEEDED',
        details: { max_allowed: maxQuantityPerItem, current: item.quantity }
      })
    }
  })

  // Check total order value
  const totalValue = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
  const maxOrderValue = 10000000 // Rp 10 juta
  
  if (totalValue > maxOrderValue) {
    errors.push({
      field: 'items',
      message: `Order value cannot exceed Rp ${maxOrderValue.toLocaleString('id-ID')}.`,
      code: 'ORDER_VALUE_LIMIT_EXCEEDED',
      details: { max_allowed: maxOrderValue, current: totalValue }
    })
  }

  // Warning for large orders
  if (totalValue > 1000000) { // Rp 1 juta
    warnings.push({
      field: 'items',
      message: `Large order detected (Rp ${totalValue.toLocaleString('id-ID')}). Please verify.`,
      code: 'LARGE_ORDER_WARNING'
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Get detailed menu item information for validation
 */
export async function getMenuItemDetails(menuItemId: string): Promise<MenuItemDetails | null> {
  try {
    const { data: menuItem, error } = await supabaseAdmin
      .from('menu_items')
      .select(`
        id, name, price, status, category, preparation_time,
        recipes(
          quantity_needed,
          ingredients(
            id, name, current_stock, min_stock, unit
          )
        ),
        menu_customization_groups(
          id, name, type, required, max_selections,
          menu_customization_options(
            id, name, additional_price, is_available
          )
        )
      `)
      .eq('id', menuItemId)
      .single()

    if (error || !menuItem) {
      return null
    }

    return {
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      status: menuItem.status,
      category: menuItem.category,
      preparation_time: menuItem.preparation_time,
      ingredients: menuItem.recipes?.map((recipe: any) => ({
        ingredient_id: recipe.ingredients.id,
        ingredient_name: recipe.ingredients.name,
        quantity_needed: recipe.quantity_needed,
        unit: recipe.ingredients.unit,
        current_stock: recipe.ingredients.current_stock,
        min_stock: recipe.ingredients.min_stock
      })) || [],
      customization_groups: menuItem.menu_customization_groups?.map((group: any) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        required: group.required,
        options: group.menu_customization_options?.map((option: any) => ({
          id: option.id,
          name: option.name,
          additional_price: option.additional_price,
          is_available: option.is_available
        })) || []
      })) || []
    }

  } catch (error) {
    console.error('Error getting menu item details:', error)
    return null
  }
}

/**
 * Validate if customer can place multiple orders (rate limiting)
 */
export async function validateCustomerOrderRate(
  customerIdentifier: string, // Could be IP, session ID, etc.
  tableNumber?: number
): Promise<ValidationResult> {
  try {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Count orders from this customer/table in the last hour
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('customer_session_id', customerIdentifier)
      .gte('created_at', oneHourAgo.toISOString())
    
    const count = orders ? orders.length : 0

    if (error) {
      throw error
    }

    const maxOrdersPerHour = 5
    if ((count || 0) >= maxOrdersPerHour) {
      return {
        valid: false,
        errors: [{
          field: 'customer',
          message: `Too many orders. Maximum ${maxOrdersPerHour} orders per hour allowed.`,
          code: 'ORDER_RATE_LIMIT_EXCEEDED',
          details: { max_allowed: maxOrdersPerHour, current: count }
        }]
      }
    }

    return { valid: true, errors: [] }

  } catch (error) {
    console.error('Error validating customer order rate:', error)
    // Don't block orders if rate limiting validation fails
    return { valid: true, errors: [] }
  }
}