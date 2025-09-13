/**
 * Pricing Calculation Utilities
 * 
 * Provides consistent pricing calculations across the cafe management system
 * Includes tax calculations (PPN 11%), discounts, totals, and profit margins
 */

// Constants for Indonesian tax system
export const PPN_RATE = 0.11 // PPN 11%
export const DEFAULT_PROFIT_MARGIN = 0.65 // 65% profit margin target

/**
 * Calculate PPN (Pajak Pertambahan Nilai) - Indonesian VAT
 * @param amount - Base amount before tax
 * @param rate - Tax rate (default: 11%)
 * @returns Tax amount
 */
export function calculatePPN(amount: number, rate: number = PPN_RATE): number {
  if (isNaN(amount) || amount < 0) {
    return 0
  }
  return Math.round(amount * rate)
}

/**
 * Calculate amount including tax
 * @param amount - Base amount before tax
 * @param rate - Tax rate (default: 11%)
 * @returns Amount including tax
 */
export function calculateAmountWithTax(amount: number, rate: number = PPN_RATE): number {
  if (isNaN(amount) || amount < 0) {
    return 0
  }
  return amount + calculatePPN(amount, rate)
}

/**
 * Calculate base amount from amount including tax
 * @param amountWithTax - Amount including tax
 * @param rate - Tax rate (default: 11%)
 * @returns Base amount before tax
 */
export function calculateBaseAmountFromTax(amountWithTax: number, rate: number = PPN_RATE): number {
  if (isNaN(amountWithTax) || amountWithTax < 0) {
    return 0
  }
  return Math.round(amountWithTax / (1 + rate))
}

/**
 * Calculate percentage discount amount
 * @param originalAmount - Original amount
 * @param discountPercentage - Discount percentage (0-100)
 * @returns Discount amount
 */
export function calculatePercentageDiscount(
  originalAmount: number,
  discountPercentage: number
): number {
  if (isNaN(originalAmount) || originalAmount < 0 || isNaN(discountPercentage)) {
    return 0
  }

  const percentage = Math.max(0, Math.min(100, discountPercentage))
  return Math.round(originalAmount * (percentage / 100))
}

/**
 * Calculate fixed discount amount with maximum limits
 * @param originalAmount - Original amount
 * @param fixedDiscount - Fixed discount amount
 * @param maxDiscount - Maximum discount allowed (optional)
 * @returns Actual discount amount
 */
export function calculateFixedDiscount(
  originalAmount: number,
  fixedDiscount: number,
  maxDiscount?: number
): number {
  if (isNaN(originalAmount) || originalAmount < 0 || isNaN(fixedDiscount) || fixedDiscount < 0) {
    return 0
  }

  let discount = Math.min(fixedDiscount, originalAmount) // Can't discount more than original amount
  
  if (maxDiscount && !isNaN(maxDiscount)) {
    discount = Math.min(discount, maxDiscount)
  }

  return discount
}

/**
 * Calculate final amount after discount and tax
 * @param baseAmount - Base amount before discount and tax
 * @param discountAmount - Discount amount
 * @param taxRate - Tax rate (applied after discount)
 * @returns Final amount
 */
export function calculateFinalAmount(
  baseAmount: number,
  discountAmount: number = 0,
  taxRate: number = PPN_RATE
): number {
  if (isNaN(baseAmount) || baseAmount < 0) {
    return 0
  }

  const afterDiscount = Math.max(0, baseAmount - discountAmount)
  return calculateAmountWithTax(afterDiscount, taxRate)
}

/**
 * Calculate profit margin percentage
 * @param sellingPrice - Selling price
 * @param costPrice - Cost price
 * @returns Profit margin percentage
 */
export function calculateProfitMargin(sellingPrice: number, costPrice: number): number {
  if (isNaN(sellingPrice) || isNaN(costPrice) || sellingPrice <= 0 || costPrice <= 0) {
    return 0
  }

  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 100 * 100) / 100
}

/**
 * Calculate selling price from cost price and desired profit margin
 * @param costPrice - Cost price
 * @param profitMarginPercentage - Desired profit margin (0-100)
 * @returns Suggested selling price
 */
export function calculateSellingPriceFromMargin(
  costPrice: number,
  profitMarginPercentage: number = DEFAULT_PROFIT_MARGIN * 100
): number {
  if (isNaN(costPrice) || costPrice <= 0 || isNaN(profitMarginPercentage)) {
    return costPrice
  }

  const margin = Math.max(0, Math.min(95, profitMarginPercentage)) / 100 // Cap at 95%
  return Math.round(costPrice / (1 - margin))
}

/**
 * Calculate order totals with multiple items, discounts, and tax
 * @param items - Array of items with price and quantity
 * @param discounts - Array of discounts to apply
 * @param taxRate - Tax rate to apply
 * @returns Order totals breakdown
 */
export function calculateOrderTotals(
  items: Array<{ price: number; quantity: number }>,
  discounts: Array<{ type: 'percentage' | 'fixed'; value: number; maxAmount?: number }> = [],
  taxRate: number = PPN_RATE
): {
  subtotal: number
  totalDiscount: number
  taxableAmount: number
  taxAmount: number
  total: number
  breakdown: {
    itemsTotal: number
    discountsApplied: Array<{ type: string; amount: number }>
  }
} {
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    if (isNaN(item.price) || isNaN(item.quantity) || item.price < 0 || item.quantity < 0) {
      return sum
    }
    return sum + (item.price * item.quantity)
  }, 0)

  // Calculate discounts
  let totalDiscount = 0
  const discountsApplied: Array<{ type: string; amount: number }> = []

  for (const discount of discounts) {
    let discountAmount = 0

    if (discount.type === 'percentage') {
      discountAmount = calculatePercentageDiscount(subtotal - totalDiscount, discount.value)
    } else if (discount.type === 'fixed') {
      discountAmount = calculateFixedDiscount(
        subtotal - totalDiscount,
        discount.value,
        discount.maxAmount
      )
    }

    if (discountAmount > 0) {
      totalDiscount += discountAmount
      discountsApplied.push({
        type: discount.type,
        amount: discountAmount
      })
    }
  }

  // Calculate tax on discounted amount
  const taxableAmount = Math.max(0, subtotal - totalDiscount)
  const taxAmount = calculatePPN(taxableAmount, taxRate)
  const total = taxableAmount + taxAmount

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    taxAmount,
    total,
    breakdown: {
      itemsTotal: subtotal,
      discountsApplied
    }
  }
}

/**
 * Calculate menu item cost from recipe ingredients
 * @param ingredients - Array of ingredients with cost and quantity
 * @returns Total cost
 */
export function calculateRecipeCost(
  ingredients: Array<{ costPerUnit: number; quantity: number }>
): number {
  return ingredients.reduce((total, ingredient) => {
    if (isNaN(ingredient.costPerUnit) || isNaN(ingredient.quantity)) {
      return total
    }
    return total + (ingredient.costPerUnit * ingredient.quantity)
  }, 0)
}

/**
 * Calculate suggested price based on cost, target margin, and market factors
 * @param costPrice - Base cost price
 * @param targetMargin - Target profit margin (0-1)
 * @param competitorPrice - Average competitor price (optional)
 * @param demandFactor - Demand factor (0.5-2.0, default: 1.0)
 * @returns Suggested price
 */
export function calculateSuggestedPrice(
  costPrice: number,
  targetMargin: number = DEFAULT_PROFIT_MARGIN,
  competitorPrice?: number,
  demandFactor: number = 1.0
): {
  suggestedPrice: number
  basePriceFromMargin: number
  competitorAdjustment: number
  demandAdjustment: number
  finalPrice: number
} {
  if (isNaN(costPrice) || costPrice <= 0) {
    return {
      suggestedPrice: 0,
      basePriceFromMargin: 0,
      competitorAdjustment: 0,
      demandAdjustment: 0,
      finalPrice: 0
    }
  }

  // Base price from cost and margin
  const basePriceFromMargin = calculateSellingPriceFromMargin(
    costPrice,
    targetMargin * 100
  )

  // Competitor adjustment
  let competitorAdjustment = 0
  if (competitorPrice && !isNaN(competitorPrice) && competitorPrice > 0) {
    const priceDiff = competitorPrice - basePriceFromMargin
    competitorAdjustment = Math.round(priceDiff * 0.3) // 30% weight to competitor pricing
  }

  // Demand adjustment
  const clampedDemandFactor = Math.max(0.5, Math.min(2.0, demandFactor))
  const demandAdjustment = Math.round(basePriceFromMargin * (clampedDemandFactor - 1) * 0.2) // 20% weight

  // Final calculated price
  const finalPrice = Math.max(
    costPrice * 1.1, // Minimum 10% markup
    basePriceFromMargin + competitorAdjustment + demandAdjustment
  )

  return {
    suggestedPrice: Math.round(finalPrice / 500) * 500, // Round to nearest 500
    basePriceFromMargin,
    competitorAdjustment,
    demandAdjustment,
    finalPrice
  }
}

/**
 * Calculate payroll components for Indonesian employees
 * @param baseSalary - Base monthly salary
 * @param overtimeHours - Overtime hours worked
 * @param overtimeRate - Overtime rate per hour
 * @param allowances - Additional allowances
 * @param deductions - Deductions (BPJS, etc.)
 * @returns Payroll calculation breakdown
 */
export function calculatePayroll(
  baseSalary: number,
  overtimeHours: number = 0,
  overtimeRate: number = 0,
  allowances: number = 0,
  deductions: number = 0
): {
  baseSalary: number
  overtimePay: number
  allowances: number
  grossPay: number
  deductions: number
  taxableIncome: number
  incomeTax: number
  netPay: number
} {
  if (isNaN(baseSalary) || baseSalary < 0) {
    baseSalary = 0
  }

  const overtimePay = Math.max(0, overtimeHours * overtimeRate)
  const validAllowances = Math.max(0, allowances)
  const validDeductions = Math.max(0, deductions)
  
  const grossPay = baseSalary + overtimePay + validAllowances
  const taxableIncome = Math.max(0, grossPay - validDeductions)
  
  // Simplified income tax calculation (PTKP: Rp 54,000,000/year)
  const monthlyPTKP = 4500000 // Rp 4.5M per month
  const taxableForTax = Math.max(0, taxableIncome - monthlyPTKP)
  
  let incomeTax = 0
  if (taxableForTax > 0) {
    // Progressive tax rates (simplified)
    if (taxableForTax <= 5000000) {
      incomeTax = taxableForTax * 0.05 // 5%
    } else {
      incomeTax = 250000 + (taxableForTax - 5000000) * 0.15 // 15% above 5M
    }
  }
  
  const netPay = Math.max(0, grossPay - validDeductions - incomeTax)

  return {
    baseSalary,
    overtimePay: Math.round(overtimePay),
    allowances: Math.round(validAllowances),
    grossPay: Math.round(grossPay),
    deductions: Math.round(validDeductions),
    taxableIncome: Math.round(taxableIncome),
    incomeTax: Math.round(incomeTax),
    netPay: Math.round(netPay)
  }
}

/**
 * Round price to appropriate Indonesian currency increments
 * @param price - Price to round
 * @param roundingMethod - Rounding method
 * @returns Rounded price
 */
export function roundPriceIndonesian(
  price: number,
  roundingMethod: 'nearest' | 'up' | 'down' = 'nearest'
): number {
  if (isNaN(price) || price < 0) {
    return 0
  }

  // Determine rounding increment based on price range
  let increment: number
  if (price < 1000) {
    increment = 100 // Round to nearest 100
  } else if (price < 10000) {
    increment = 500 // Round to nearest 500
  } else if (price < 100000) {
    increment = 1000 // Round to nearest 1000
  } else {
    increment = 5000 // Round to nearest 5000
  }

  switch (roundingMethod) {
    case 'up':
      return Math.ceil(price / increment) * increment
    case 'down':
      return Math.floor(price / increment) * increment
    default:
      return Math.round(price / increment) * increment
  }
}
