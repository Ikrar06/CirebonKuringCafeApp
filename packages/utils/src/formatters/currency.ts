/**
 * Indonesian Rupiah Currency Formatting Utilities
 * 
 * Provides consistent currency formatting across the cafe management system
 * Follows Indonesian currency conventions with proper thousand separators
 */

// Constants
const CURRENCY_SYMBOL = 'Rp'
const THOUSAND_SEPARATOR = '.'
const DECIMAL_SEPARATOR = ','

/**
 * Format a number as Indonesian Rupiah currency
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "Rp 15.000", "Rp 1.250.500")
 */
export function formatCurrency(
  amount: number,
  options: {
    showSymbol?: boolean
    showDecimals?: boolean
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string {
  const {
    showSymbol = true,
    showDecimals = false,
    minimumFractionDigits = 0,
    maximumFractionDigits = showDecimals ? 2 : 0
  } = options

  // Handle edge cases
  if (isNaN(amount) || !isFinite(amount)) {
    return showSymbol ? `${CURRENCY_SYMBOL} 0` : '0'
  }

  // Format the number with Indonesian locale conventions
  const formatter = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping: true
  })

  let formatted = formatter.format(Math.abs(amount))
  
  // Replace default separators with Indonesian conventions
  formatted = formatted.replace(/,/g, THOUSAND_SEPARATOR)
  
  // Handle decimals if needed
  if (showDecimals && formatted.includes('.')) {
    const [integer, decimal] = formatted.split('.')
    formatted = `${integer}${DECIMAL_SEPARATOR}${decimal}`
  }

  // Add currency symbol
  const result = showSymbol ? `${CURRENCY_SYMBOL} ${formatted}` : formatted
  
  // Handle negative numbers
  return amount < 0 ? `-${result}` : result
}

/**
 * Format currency for compact display (K, M notation)
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the currency symbol
 * @returns Compact currency string (e.g., "Rp 15K", "Rp 1.2M")
 */
export function formatCurrencyCompact(amount: number, showSymbol: boolean = true): string {
  if (isNaN(amount) || !isFinite(amount)) {
    return showSymbol ? `${CURRENCY_SYMBOL} 0` : '0'
  }

  const absAmount = Math.abs(amount)
  let formatted: string
  
  if (absAmount >= 1_000_000_000) {
    formatted = (absAmount / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
  } else if (absAmount >= 1_000_000) {
    formatted = (absAmount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  } else if (absAmount >= 1_000) {
    formatted = (absAmount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  } else {
    formatted = absAmount.toString()
  }

  // Replace dot with Indonesian decimal separator for decimals
  formatted = formatted.replace('.', DECIMAL_SEPARATOR)
  
  const result = showSymbol ? `${CURRENCY_SYMBOL} ${formatted}` : formatted
  return amount < 0 ? `-${result}` : result
}

/**
 * Parse a currency string back to a number
 * @param currencyString - String to parse (e.g., "Rp 15.000", "15000", "15.000,50")
 * @returns Parsed number or null if invalid
 */
export function parseCurrency(currencyString: string): number | null {
  if (!currencyString || typeof currencyString !== 'string') {
    return null
  }

  // Remove currency symbol and whitespace
  let cleanStr = currencyString
    .replace(new RegExp(CURRENCY_SYMBOL, 'g'), '')
    .trim()

  // Handle empty string
  if (!cleanStr) {
    return null
  }

  // Replace Indonesian thousand separators with empty string
  cleanStr = cleanStr.replace(new RegExp(`\\${THOUSAND_SEPARATOR}`, 'g'), '')
  
  // Replace Indonesian decimal separator with dot
  cleanStr = cleanStr.replace(new RegExp(`\\${DECIMAL_SEPARATOR}`, 'g'), '.')

  // Try to parse as number
  const parsed = parseFloat(cleanStr)
  
  return isNaN(parsed) ? null : parsed
}

/**
 * Format currency for input fields (no symbol, proper separators)
 * @param amount - The amount to format
 * @param showDecimals - Whether to show decimal places
 * @returns Formatted string for input fields
 */
export function formatCurrencyInput(amount: number, showDecimals: boolean = false): string {
  return formatCurrency(amount, {
    showSymbol: false,
    showDecimals,
    minimumFractionDigits: 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  })
}

/**
 * Format currency difference (with + or - prefix)
 * @param amount - The amount to format
 * @param showSymbol - Whether to show currency symbol
 * @returns Formatted difference string (e.g., "+Rp 5.000", "-Rp 2.500")
 */
export function formatCurrencyDifference(amount: number, showSymbol: boolean = true): string {
  if (amount === 0) {
    return showSymbol ? `${CURRENCY_SYMBOL} 0` : '0'
  }

  const formatted = formatCurrency(Math.abs(amount), { showSymbol })
  const prefix = amount > 0 ? '+' : '-'
  
  return `${prefix}${formatted}`
}

/**
 * Format multiple currencies as a range
 * @param minAmount - Minimum amount
 * @param maxAmount - Maximum amount
 * @param showSymbol - Whether to show currency symbol
 * @returns Formatted range (e.g., "Rp 10.000 - Rp 25.000")
 */
export function formatCurrencyRange(
  minAmount: number,
  maxAmount: number,
  showSymbol: boolean = true
): string {
  const min = formatCurrency(minAmount, { showSymbol })
  const max = formatCurrency(maxAmount, { showSymbol: showSymbol })
  
  return `${min} - ${max}`
}

/**
 * Get currency symbol
 * @returns Indonesian Rupiah symbol
 */
export function getCurrencySymbol(): string {
  return CURRENCY_SYMBOL
}

/**
 * Validate if a string looks like a valid currency format
 * @param value - String to validate
 * @returns True if valid currency format
 */
export function isValidCurrencyFormat(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }

  // Remove whitespace
  const trimmed = value.trim()
  
  // Check if it can be parsed
  const parsed = parseCurrency(trimmed)
  
  return parsed !== null && parsed >= 0
}

/**
 * Round currency to nearest appropriate value
 * @param amount - Amount to round
 * @param roundTo - Rounding increment (default: 100 for nearest hundred)
 * @returns Rounded amount
 */
export function roundCurrency(amount: number, roundTo: number = 100): number {
  return Math.round(amount / roundTo) * roundTo
}

/**
 * Format price with discount information
 * @param originalPrice - Original price
 * @param discountedPrice - Discounted price
 * @param showSymbol - Whether to show currency symbol
 * @returns Object with formatted prices and discount info
 */
export function formatPriceWithDiscount(
  originalPrice: number,
  discountedPrice: number,
  showSymbol: boolean = true
) {
  const original = formatCurrency(originalPrice, { showSymbol })
  const discounted = formatCurrency(discountedPrice, { showSymbol })
  const savings = formatCurrency(originalPrice - discountedPrice, { showSymbol })
  const discountPercentage = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)

  return {
    original,
    discounted,
    savings,
    discountPercentage: `${discountPercentage}%`,
    hasDiscount: discountedPrice < originalPrice
  }
}
