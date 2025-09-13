/**
 * Validation Utilities Index
 * 
 * Central export for all validation functions used across the cafe management system
 * Includes Indonesian-specific validators, business logic validators, and common validators
 */

// Re-export Indonesian-specific validators
export * from './indonesian'
import { isValidIndonesianPhone, formatIndonesianPhone } from './indonesian'

// ===========================================
// GENERAL VALIDATION UTILITIES
// ===========================================

/**
 * Check if value is not null, undefined, or empty string
 * @param value - Value to check
 * @returns True if value is present
 */
export function isPresent(value: any): boolean {
  return value !== null && value !== undefined && value !== ''
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.toLowerCase())
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @param options - Validation options
 * @returns Validation result with details
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number
    requireUppercase?: boolean
    requireLowercase?: boolean
    requireNumbers?: boolean
    requireSymbols?: boolean
  } = {}
): {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
} {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSymbols = false,
  } = options

  const errors: string[] = []

  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password is required'],
      strength: 'weak',
    }
  }

  // Length check
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`)
  }

  // Character requirements
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one symbol')
  }

  // Strength calculation
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  
  if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && 
      /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strength = 'strong'
  } else if (password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)) {
    strength = 'medium'
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  }
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @param requireHttps - Require HTTPS protocol
 * @returns True if valid URL
 */
export function isValidUrl(url: string, requireHttps: boolean = false): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    const urlObj = new URL(url)
    
    if (requireHttps && urlObj.protocol !== 'https:') {
      return false
    }
    
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

/**
 * Validate numeric value within range
 * @param value - Value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if valid number within range
 */
export function isValidNumber(value: any, min?: number, max?: number): boolean {
  const num = Number(value)
  
  if (isNaN(num) || !isFinite(num)) {
    return false
  }
  
  if (min !== undefined && num < min) {
    return false
  }
  
  if (max !== undefined && num > max) {
    return false
  }
  
  return true
}

/**
 * Validate positive integer
 * @param value - Value to validate
 * @returns True if positive integer
 */
export function isPositiveInteger(value: any): boolean {
  const num = Number(value)
  return Number.isInteger(num) && num > 0
}

/**
 * Validate date string (ISO format or Indonesian format)
 * @param dateString - Date string to validate
 * @param allowFuture - Allow future dates
 * @returns True if valid date
 */
export function isValidDate(dateString: string, allowFuture: boolean = true): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false
  }

  // Try parsing ISO format (YYYY-MM-DD)
  let date = new Date(dateString)
  
  // Try parsing Indonesian format (DD/MM/YYYY or DD-MM-YYYY)
  if (isNaN(date.getTime())) {
    const indonesianFormats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      /^(\d{2})-(\d{2})-(\d{4})$/,
    ]
    
    for (const format of indonesianFormats) {
      const match = dateString.match(format)
      if (match) {
        const [, day, month, year] = match
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        break
      }
    }
  }

  if (isNaN(date.getTime())) {
    return false
  }

  // Check if future dates are allowed
  if (!allowFuture && date > new Date()) {
    return false
  }

  return true
}

/**
 * Validate time string (HH:mm format)
 * @param timeString - Time string to validate
 * @returns True if valid time format
 */
export function isValidTime(timeString: string): boolean {
  if (!timeString || typeof timeString !== 'string') {
    return false
  }

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(timeString)
}

// ===========================================
// BUSINESS-SPECIFIC VALIDATORS
// ===========================================

/**
 * Validate menu item price
 * @param price - Price to validate (in Rupiah)
 * @returns True if valid menu price
 */
export function isValidMenuPrice(price: number): boolean {
  return isValidNumber(price, 1000, 1000000) // Rp 1,000 - Rp 1,000,000
}

/**
 * Validate ingredient quantity
 * @param quantity - Quantity to validate
 * @returns True if valid quantity
 */
export function isValidQuantity(quantity: number): boolean {
  return isValidNumber(quantity, 0.01, 10000) // 0.01 - 10,000 units
}

/**
 * Validate table number
 * @param tableNumber - Table number to validate
 * @returns True if valid table number
 */
export function isValidTableNumber(tableNumber: string | number): boolean {
  const num = Number(tableNumber)
  return Number.isInteger(num) && num >= 1 && num <= 999
}

/**
 * Validate employee code format
 * @param employeeCode - Employee code to validate
 * @returns True if valid employee code
 */
export function isValidEmployeeCode(employeeCode: string): boolean {
  if (!employeeCode || typeof employeeCode !== 'string') {
    return false
  }

  // Allow various formats: EMP001, EMP-2024-001, E001, etc.
  const patterns = [
    /^EMP\d{3,6}$/i,
    /^EMP-\d{4}-\d{3,4}$/i,
    /^[A-Z]\d{3,6}$/i,
    /^\d{6,10}$/,
  ]

  return patterns.some(pattern => pattern.test(employeeCode))
}

/**
 * Validate GPS coordinates
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns True if valid coordinates
 */
export function isValidGpsCoordinates(latitude: number, longitude: number): boolean {
  return (
    isValidNumber(latitude, -90, 90) &&
    isValidNumber(longitude, -180, 180)
  )
}

/**
 * Calculate distance between two GPS points (Haversine formula)
 * @param lat1 - First point latitude
 * @param lon1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lon2 - Second point longitude
 * @returns Distance in meters
 */
export function calculateGpsDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Validate if GPS coordinates are within allowed radius of cafe
 * @param userLat - User latitude
 * @param userLon - User longitude
 * @param cafeLat - Cafe latitude
 * @param cafeLon - Cafe longitude
 * @param allowedRadius - Allowed radius in meters (default: 100)
 * @returns Validation result with distance
 */
export function validateGpsRadius(
  userLat: number,
  userLon: number,
  cafeLat: number,
  cafeLon: number,
  allowedRadius: number = 100
): {
  valid: boolean
  distance: number
  withinRadius: boolean
} {
  if (!isValidGpsCoordinates(userLat, userLon) || !isValidGpsCoordinates(cafeLat, cafeLon)) {
    return {
      valid: false,
      distance: 0,
      withinRadius: false,
    }
  }

  const distance = calculateGpsDistance(userLat, userLon, cafeLat, cafeLon)
  const withinRadius = distance <= allowedRadius

  return {
    valid: true,
    distance: Math.round(distance),
    withinRadius,
  }
}

/**
 * Validate Indonesian Rupiah amount
 * @param amount - Amount to validate
 * @param allowZero - Allow zero amount
 * @returns True if valid Rupiah amount
 */
export function isValidRupiahAmount(amount: number, allowZero: boolean = false): boolean {
  if (!allowZero && amount <= 0) {
    return false
  }
  
  if (allowZero && amount < 0) {
    return false
  }

  // Check if amount is a valid number and not too large
  return isValidNumber(amount, allowZero ? 0 : 0.01, 999999999999) // Max ~1 trillion
}

/**
 * Validate order quantity for menu items
 * @param quantity - Quantity to validate
 * @returns True if valid order quantity
 */
export function isValidOrderQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 100
}

/**
 * Validate promo code format
 * @param promoCode - Promo code to validate
 * @returns True if valid promo code format
 */
export function isValidPromoCode(promoCode: string): boolean {
  if (!promoCode || typeof promoCode !== 'string') {
    return false
  }

  // Promo codes: 3-20 characters, alphanumeric + hyphens
  const promoRegex = /^[A-Z0-9-]{3,20}$/
  return promoRegex.test(promoCode.toUpperCase())
}

/**
 * Validate percentage value (0-100)
 * @param percentage - Percentage to validate
 * @returns True if valid percentage
 */
export function isValidPercentage(percentage: number): boolean {
  return isValidNumber(percentage, 0, 100)
}

/**
 * Validate discount amount for menu pricing
 * @param discount - Discount amount
 * @param originalPrice - Original price
 * @param isPercentage - Whether discount is percentage or fixed amount
 * @returns True if valid discount
 */
export function isValidDiscount(
  discount: number,
  originalPrice: number,
  isPercentage: boolean = false
): boolean {
  if (isPercentage) {
    return isValidPercentage(discount)
  }
  
  return isValidRupiahAmount(discount) && discount < originalPrice
}

// ===========================================
// BATCH VALIDATION UTILITIES
// ===========================================

/**
 * Validate multiple fields at once
 * @param data - Data object to validate
 * @param rules - Validation rules
 * @returns Validation result with field-specific errors
 */
export function validateFields(
  data: Record<string, any>,
  rules: Record<string, {
    required?: boolean
    type?: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'date' | 'time' | 'url'
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (value: any) => boolean | string
  }>
): {
  valid: boolean
  errors: Record<string, string[]>
  errorCount: number
} {
  const errors: Record<string, string[]> = {}

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]
    const fieldErrors: string[] = []

    // Required check
    if (rule.required && !isPresent(value)) {
      fieldErrors.push(`${field} is required`)
      continue
    }

    // Skip other validations if field is not present and not required
    if (!isPresent(value)) {
      continue
    }

    // Type validations
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          fieldErrors.push(`${field} must be a string`)
        }
        break
      case 'number':
        if (!isValidNumber(value, rule.min, rule.max)) {
          fieldErrors.push(`${field} must be a valid number${rule.min !== undefined ? ` (min: ${rule.min})` : ''}${rule.max !== undefined ? ` (max: ${rule.max})` : ''}`)
        }
        break
      case 'email':
        if (!isValidEmail(value)) {
          fieldErrors.push(`${field} must be a valid email address`)
        }
        break
      case 'phone':
        if (!isValidIndonesianPhone(value)) {
          fieldErrors.push(`${field} must be a valid Indonesian phone number`)
        }
        break
      case 'date':
        if (!isValidDate(value)) {
          fieldErrors.push(`${field} must be a valid date`)
        }
        break
      case 'time':
        if (!isValidTime(value)) {
          fieldErrors.push(`${field} must be a valid time (HH:mm)`)
        }
        break
      case 'url':
        if (!isValidUrl(value)) {
          fieldErrors.push(`${field} must be a valid URL`)
        }
        break
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      fieldErrors.push(`${field} format is invalid`)
    }

    // String length validation
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.min !== undefined && value.length < rule.min) {
        fieldErrors.push(`${field} must be at least ${rule.min} characters`)
      }
      if (rule.max !== undefined && value.length > rule.max) {
        fieldErrors.push(`${field} must be at most ${rule.max} characters`)
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value)
      if (typeof customResult === 'string') {
        fieldErrors.push(customResult)
      } else if (customResult === false) {
        fieldErrors.push(`${field} is invalid`)
      }
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    errorCount: Object.values(errors).flat().length,
  }
}

// ===========================================
// SANITIZATION UTILITIES
// ===========================================

/**
 * Sanitize string input (trim, remove extra spaces)
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input.trim().replace(/\s+/g, ' ')
}

/**
 * Sanitize phone number to standard format
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number or null if invalid
 */
export function sanitizePhoneNumber(phone: string): string | null {
  return formatIndonesianPhone(phone)
}

/**
 * Sanitize and validate menu item name
 * @param name - Menu item name
 * @returns Sanitized name or null if invalid
 */
export function sanitizeMenuName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return null
  }

  const sanitized = sanitizeString(name)
  
  if (sanitized.length < 2 || sanitized.length > 100) {
    return null
  }

  return sanitized
}

/**
 * Sanitize monetary amount to valid Rupiah
 * @param amount - Amount to sanitize
 * @returns Sanitized amount or 0 if invalid
 */
export function sanitizeAmount(amount: any): number {
  const num = Number(amount)
  
  if (isNaN(num) || !isFinite(num)) {
    return 0
  }
  
  // Round to nearest Rupiah (no cents)
  return Math.max(0, Math.round(num))
}