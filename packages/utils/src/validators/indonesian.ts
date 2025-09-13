/**
 * Indonesian-specific Validation Utilities
 * 
 * Provides validation for Indonesian phone numbers, NIK, and other ID formats
 * Used across the cafe management system for data validation
 */

/**
 * Validate Indonesian phone number
 * Supports formats: +62xxx, 62xxx, 08xxx, 8xxx
 * @param phone - Phone number to validate
 * @param strict - If true, requires international format (+62)
 * @returns True if valid Indonesian phone number
 */
export function isValidIndonesianPhone(phone: string, strict: boolean = false): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }

  // Remove all spaces, hyphens, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')

  // Indonesian phone number patterns
  const patterns = [
    /^\+62[8-9]\d{7,11}$/,    // +62 international format
    /^62[8-9]\d{7,11}$/,      // 62 without plus
    /^0[8-9]\d{7,11}$/,       // 08 domestic format
    /^[8-9]\d{7,11}$/         // 8 without leading 0
  ]

  if (strict) {
    // Only accept international format
    return patterns[0].test(cleaned)
  }

  // Accept any valid format
  return patterns.some(pattern => pattern.test(cleaned))
}

/**
 * Format Indonesian phone number to standard international format
 * @param phone - Phone number to format
 * @returns Formatted phone number (+62xxx) or null if invalid
 */
export function formatIndonesianPhone(phone: string): string | null {
  if (!isValidIndonesianPhone(phone)) {
    return null
  }

  // Remove all spaces, hyphens, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')

  // Convert to international format
  if (cleaned.startsWith('+62')) {
    return cleaned
  } else if (cleaned.startsWith('62')) {
    return `+${cleaned}`
  } else if (cleaned.startsWith('08')) {
    return `+62${cleaned.substring(1)}`
  } else if (cleaned.startsWith('8')) {
    return `+62${cleaned}`
  }

  return null
}

/**
 * Validate Indonesian NIK (Nomor Induk Kependudukan)
 * NIK is 16 digits: DDMMYY-PPPP-SSSS
 * @param nik - NIK to validate
 * @returns True if valid NIK format
 */
export function isValidNIK(nik: string): boolean {
  if (!nik || typeof nik !== 'string') {
    return false
  }

  // Remove all non-digits
  const cleaned = nik.replace(/\D/g, '')

  // Must be exactly 16 digits
  if (cleaned.length !== 16) {
    return false
  }

  // Extract components
  const day = parseInt(cleaned.substring(0, 2))
  const month = parseInt(cleaned.substring(2, 4))
  const year = parseInt(cleaned.substring(4, 6))
  const areaCode = cleaned.substring(6, 10)
  const sequence = cleaned.substring(10, 16)

  // Validate date components
  // For females, day is +40
  const actualDay = day > 40 ? day - 40 : day
  
  if (actualDay < 1 || actualDay > 31) {
    return false
  }

  if (month < 1 || month > 12) {
    return false
  }

  // Basic year validation (assuming 1900-2099)
  const currentYear = new Date().getFullYear() % 100
  if (year > currentYear + 10) {
    return false
  }

  // Area code should not be all zeros
  if (areaCode === '0000') {
    return false
  }

  // Sequence should not be all zeros
  if (sequence === '000000') {
    return false
  }

  return true
}

/**
 * Format NIK with standard separators
 * @param nik - NIK to format
 * @returns Formatted NIK (DDMMYY-PPPP-SSSS) or null if invalid
 */
export function formatNIK(nik: string): string | null {
  if (!isValidNIK(nik)) {
    return null
  }

  const cleaned = nik.replace(/\D/g, '')
  return `${cleaned.substring(0, 6)}-${cleaned.substring(6, 10)}-${cleaned.substring(10, 16)}`
}

/**
 * Extract information from NIK
 * @param nik - Valid NIK
 * @returns Object with extracted information or null if invalid
 */
export function parseNIK(nik: string): {
  birthDate: Date
  gender: 'male' | 'female'
  areaCode: string
  sequence: string
} | null {
  if (!isValidNIK(nik)) {
    return null
  }

  const cleaned = nik.replace(/\D/g, '')
  
  const day = parseInt(cleaned.substring(0, 2))
  const month = parseInt(cleaned.substring(2, 4))
  const year = parseInt(cleaned.substring(4, 6))
  const areaCode = cleaned.substring(6, 10)
  const sequence = cleaned.substring(10, 16)

  // Determine gender and actual birth day
  const gender: 'male' | 'female' = day > 40 ? 'female' : 'male'
  const actualDay = day > 40 ? day - 40 : day

  // Determine full year (assume 1900s if > current year + 10, otherwise 2000s)
  const currentYear = new Date().getFullYear() % 100
  const fullYear = year > currentYear + 10 ? 1900 + year : 2000 + year

  const birthDate = new Date(fullYear, month - 1, actualDay)

  return {
    birthDate,
    gender,
    areaCode,
    sequence
  }
}

/**
 * Validate Indonesian postal code
 * @param postalCode - Postal code to validate (5 digits)
 * @returns True if valid postal code
 */
export function isValidIndonesianPostalCode(postalCode: string): boolean {
  if (!postalCode || typeof postalCode !== 'string') {
    return false
  }

  const cleaned = postalCode.replace(/\D/g, '')
  return /^\d{5}$/.test(cleaned)
}

/**
 * Validate Indonesian bank account number
 * @param accountNumber - Account number to validate
 * @param bankCode - Optional bank code for specific validation
 * @returns True if valid format
 */
export function isValidBankAccount(accountNumber: string, bankCode?: string): boolean {
  if (!accountNumber || typeof accountNumber !== 'string') {
    return false
  }

  const cleaned = accountNumber.replace(/\D/g, '')

  // General validation: 8-20 digits
  if (cleaned.length < 8 || cleaned.length > 20) {
    return false
  }

  // Bank-specific validation
  if (bankCode) {
    switch (bankCode.toLowerCase()) {
      case 'bca':
        return /^\d{10}$/.test(cleaned) // BCA: 10 digits
      case 'bni':
        return /^\d{10}$/.test(cleaned) // BNI: 10 digits
      case 'bri':
        return /^\d{15}$/.test(cleaned) // BRI: 15 digits
      case 'mandiri':
        return /^\d{13}$/.test(cleaned) // Mandiri: 13 digits
      case 'cimb':
        return /^\d{13}$/.test(cleaned) // CIMB: 13 digits
      default:
        return cleaned.length >= 8 && cleaned.length <= 20
    }
  }

  return true
}

/**
 * Validate Indonesian employee ID format
 * Common format: EMP-YYYY-XXXX or similar
 * @param employeeId - Employee ID to validate
 * @param pattern - Custom regex pattern (optional)
 * @returns True if valid employee ID
 */
export function isValidEmployeeId(employeeId: string, pattern?: RegExp): boolean {
  if (!employeeId || typeof employeeId !== 'string') {
    return false
  }

  if (pattern) {
    return pattern.test(employeeId)
  }

  // Default patterns for employee ID
  const commonPatterns = [
    /^EMP-\d{4}-\d{4}$/,      // EMP-2024-0001
    /^[A-Z]{2,4}\d{4,6}$/,    // EMP001234
    /^\d{6,10}$/,             // 202400001
    /^[A-Z]\d{3,6}$/          // E001234
  ]

  return commonPatterns.some(pattern => pattern.test(employeeId.toUpperCase()))
}

/**
 * Generate employee ID with format EMP-YYYY-XXXX
 * @param year - Year (default: current year)
 * @param sequence - Sequence number
 * @returns Formatted employee ID
 */
export function generateEmployeeId(sequence: number, year?: number): string {
  const currentYear = year || new Date().getFullYear()
  const paddedSequence = sequence.toString().padStart(4, '0')
  return `EMP-${currentYear}-${paddedSequence}`
}

/**
 * Validate Indonesian business license number (SIUP/NIB)
 * @param licenseNumber - License number to validate
 * @returns True if valid format
 */
export function isValidBusinessLicense(licenseNumber: string): boolean {
  if (!licenseNumber || typeof licenseNumber !== 'string') {
    return false
  }

  const cleaned = licenseNumber.replace(/[\s\-\/]/g, '')
  
  // NIB (Nomor Induk Berusaha): 13 digits
  if (/^\d{13}$/.test(cleaned)) {
    return true
  }

  // SIUP: Various formats, generally alphanumeric
  if (/^[A-Z0-9]{8,20}$/i.test(cleaned)) {
    return true
  }

  return false
}

/**
 * Validate Indonesian tax ID (NPWP)
 * Format: XX.XXX.XXX.X-XXX.XXX
 * @param npwp - NPWP to validate
 * @returns True if valid NPWP
 */
export function isValidNPWP(npwp: string): boolean {
  if (!npwp || typeof npwp !== 'string') {
    return false
  }

  // Remove all non-digits
  const cleaned = npwp.replace(/\D/g, '')

  // Must be exactly 15 digits
  if (cleaned.length !== 15) {
    return false
  }

  // Basic format validation
  return /^\d{2}\d{3}\d{3}\d{1}\d{3}\d{3}$/.test(cleaned)
}

/**
 * Format NPWP with standard separators
 * @param npwp - NPWP to format
 * @returns Formatted NPWP (XX.XXX.XXX.X-XXX.XXX) or null if invalid
 */
export function formatNPWP(npwp: string): string | null {
  if (!isValidNPWP(npwp)) {
    return null
  }

  const cleaned = npwp.replace(/\D/g, '')
  return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}.${cleaned.substring(8, 9)}-${cleaned.substring(9, 12)}.${cleaned.substring(12, 15)}`
}

/**
 * Validate QR Code string for Indonesian payment systems
 * @param qrString - QR code string to validate
 * @returns True if valid QR code format
 */
export function isValidIndonesianQR(qrString: string): boolean {
  if (!qrString || typeof qrString !== 'string') {
    return false
  }

  // QRIS format validation (starts with merchant info)
  if (qrString.startsWith('00020')) {
    return qrString.length >= 50 && qrString.length <= 200
  }

  // Generic QR validation (base64 or alphanumeric)
  if (/^[A-Za-z0-9+/=]+$/.test(qrString) && qrString.length >= 10) {
    return true
  }

  return false
}
