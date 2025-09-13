/**
 * Payment Verification Edge Function
 * 
 * Advanced payment verification logic including:
 * - Receipt/proof image processing and validation
 * - Bank transfer verification helpers
 * - QRIS payment validation
 * - Anti-fraud checks and duplicate detection
 * - OCR-based amount extraction (future enhancement)
 * 
 * @endpoints
 * POST /payment-verification/upload-proof/:paymentId - Upload payment proof
 * POST /payment-verification/verify-receipt - Verify receipt details
 * GET  /payment-verification/validate/:paymentId - Validate payment data
 * POST /payment-verification/fraud-check - Run fraud detection
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
  isValidRupiahAmount,
  isValidIndonesianPhone,
  sanitizeString
} from '../../../packages/utils/src/validators/index'

// Verification interfaces
interface UploadProofRequest {
  image_data: string // Base64 encoded image
  file_name?: string
  file_size?: number
  receipt_notes?: string
}

interface VerifyReceiptRequest {
  payment_id: string
  receipt_data: {
    transaction_id?: string
    amount: number
    timestamp?: string
    bank_name?: string
    sender_name?: string
    recipient_name?: string
    reference_number?: string
  }
  verification_method: 'manual' | 'ocr' | 'api'
}

interface FraudCheckRequest {
  payment_id: string
  additional_checks?: {
    check_duplicate_receipts: boolean
    check_amount_manipulation: boolean
    check_timestamp_validity: boolean
    check_bank_details: boolean
  }
}

interface PaymentValidationResult {
  valid: boolean
  confidence_score: number // 0-100
  issues: ValidationIssue[]
  recommendations: string[]
  fraud_indicators: FraudIndicator[]
}

interface ValidationIssue {
  type: 'warning' | 'error' | 'info'
  field: string
  message: string
  code: string
  severity: 'low' | 'medium' | 'high'
}

interface FraudIndicator {
  type: string
  description: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  details: Record<string, any>
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Upload payment proof (customer action)
 */
async function handleUploadProof(request: Request): Promise<Response> {
  try {
    // Extract payment ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const paymentId = pathParts[pathParts.indexOf('upload-proof') - 1]

    if (!paymentId) {
      return createErrorResponse('Payment ID required', 400, undefined, request)
    }

    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const uploadData = body as UploadProofRequest

    // Validate required fields
    if (!uploadData.image_data) {
      return createErrorResponse('Image data required', 400, undefined, request)
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payment_transactions')
      .select(`
        id, order_id, payment_method, amount, status, proof_url,
        orders(id, order_number, customer_name, total_amount)
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return createNotFoundResponse('Payment', request)
    }

    // Validate payment status
    if (payment.status !== 'pending') {
      return createErrorResponse(
        `Cannot upload proof for payment with status: ${payment.status}`,
        400,
        undefined,
        request
      )
    }

    // Validate payment method (only for QRIS/transfer)
    if (!['qris', 'bank_transfer'].includes(payment.payment_method)) {
      return createErrorResponse(
        `Proof upload not required for payment method: ${payment.payment_method}`,
        400,
        undefined,
        request
      )
    }

    // Process and upload image
    const uploadResult = await processAndUploadProof(paymentId, uploadData)
    if (!uploadResult.success) {
      return createErrorResponse(
        uploadResult.error || 'Failed to upload proof',
        500,
        undefined,
        request
      )
    }

    // Update payment record with proof URL
    const { error: updateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        proof_url: uploadResult.publicUrl,
        proof_uploaded_at: new Date().toISOString(),
        notes: uploadData.receipt_notes ? sanitizeString(uploadData.receipt_notes) : null
      })
      .eq('id', paymentId)

    if (updateError) {
      return createErrorResponse(
        'Failed to update payment record',
        500,
        undefined,
        request
      )
    }

    // Run automatic validation
    const validationResult = await runAutomaticValidation(paymentId, uploadResult?.filePath || '')

    // Send notification to kasir
    await sendProofUploadNotification(payment, uploadResult?.publicUrl || '', validationResult)

    // Log audit
    await logAudit(
      'customer', // TODO: Get actual customer session ID
      'UPLOAD_PAYMENT_PROOF',
      {
        payment_id: paymentId,
        order_id: payment.order_id,
        file_size: uploadData.file_size,
        validation_score: validationResult.confidence_score
      },
      'payment_transactions',
      paymentId
    )

    return createSuccessResponse(
      {
        payment_id: paymentId,
        proof_url: uploadResult.publicUrl,
        validation_result: validationResult,
        status: 'proof_uploaded'
      },
      'Payment proof uploaded successfully. Waiting for kasir verification.',
      {
        next_steps: [
          'Kasir will review your payment proof',
          'Verification typically takes 2-5 minutes',
          'You will be notified when verified'
        ],
        estimated_verification_time: '2-5 minutes'
      },
      request
    )

  } catch (error) {
    console.error('Error in handleUploadProof:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Verify receipt details (kasir action with manual input)
 */
async function handleVerifyReceipt(request: Request): Promise<Response> {
  try {
    // Authenticate kasir
    const authResult = await authenticateKasir(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const verificationData = body as VerifyReceiptRequest

    // Validate required fields
    const validation = validateFields(verificationData, {
      payment_id: { required: true, type: 'string' },
      'receipt_data.amount': { required: true, type: 'number', min: 1000 },
      verification_method: { required: true, type: 'string' }
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

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payment_transactions')
      .select(`
        id, order_id, payment_method, amount, status, proof_url,
        orders(order_number, total_amount, customer_name)
      `)
      .eq('id', verificationData.payment_id)
      .single()

    if (paymentError || !payment) {
      return createNotFoundResponse('Payment', request)
    }

    // Validate payment status
    if (payment.status !== 'pending') {
      return createErrorResponse(
        `Payment already ${payment.status}`,
        400,
        undefined,
        request
      )
    }

    // Verify receipt data against payment
    const receiptValidation = await validateReceiptData(payment, verificationData.receipt_data)
    if (!receiptValidation.valid) {
      return createErrorResponse(
        'Receipt validation failed',
        400,
        { validation_issues: receiptValidation.issues },
        request
      )
    }

    // Store receipt verification data
    const { error: insertError } = await supabaseAdmin
      .from('payment_verifications')
      .insert({
        payment_id: verificationData.payment_id,
        verified_by: authResult.employee.id,
        verification_method: verificationData.verification_method,
        receipt_transaction_id: verificationData.receipt_data.transaction_id,
        receipt_amount: verificationData.receipt_data.amount,
        receipt_timestamp: verificationData.receipt_data.timestamp,
        receipt_bank_name: verificationData.receipt_data.bank_name,
        receipt_sender_name: verificationData.receipt_data.sender_name,
        receipt_recipient_name: verificationData.receipt_data.recipient_name,
        receipt_reference_number: verificationData.receipt_data.reference_number,
        confidence_score: receiptValidation.confidence_score,
        validation_issues: receiptValidation.issues,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error storing verification data:', insertError)
    }

    // Log audit
    await logAudit(
      authResult.employee.user_id,
      'VERIFY_RECEIPT',
      {
        payment_id: verificationData.payment_id,
        verification_method: verificationData.verification_method,
        confidence_score: receiptValidation.confidence_score,
        amount_verified: verificationData.receipt_data.amount
      },
      'payment_verifications',
      verificationData.payment_id
    )

    return createSuccessResponse(
      {
        payment_id: verificationData.payment_id,
        verification_result: receiptValidation,
        receipt_data: verificationData.receipt_data,
        verified_by: authResult.employee.full_name,
        verified_at: new Date().toISOString()
      },
      'Receipt verification completed successfully',
      {
        confidence_score: receiptValidation.confidence_score,
        recommendations: receiptValidation.recommendations
      },
      request
    )

  } catch (error) {
    console.error('Error in handleVerifyReceipt:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Validate payment data comprehensively
 */
async function handleValidatePayment(request: Request): Promise<Response> {
  try {
    // Extract payment ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const paymentId = pathParts[pathParts.length - 1]

    if (!paymentId) {
      return createErrorResponse('Payment ID required', 400, undefined, request)
    }

    // Get comprehensive payment data
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payment_transactions')
      .select(`
        id, order_id, payment_method, amount, status, proof_url, created_at,
        bank_name, account_number, reference_number, notes,
        orders(
          id, order_number, total_amount, customer_name, table_id, created_at,
          order_items(quantity, unit_price, total_price)
        ),
        payment_verifications(
          verification_method, confidence_score, validation_issues,
          receipt_amount, receipt_transaction_id, receipt_timestamp
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return createNotFoundResponse('Payment', request)
    }

    // Run comprehensive validation
    const validationResult = await runComprehensiveValidation(payment)

    return createSuccessResponse(
      {
        payment_id: paymentId,
        validation_result: validationResult,
        payment_summary: {
          order_number: payment.orders.order_number,
          amount: payment.amount,
          method: payment.payment_method,
          status: payment.status
        }
      },
      'Payment validation completed',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleValidatePayment:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Run fraud detection checks
 */
async function handleFraudCheck(request: Request): Promise<Response> {
  try {
    // Authenticate kasir or owner
    const authResult = await authenticateKasir(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const fraudCheckData = body as FraudCheckRequest

    // Validate required fields
    if (!fraudCheckData.payment_id) {
      return createErrorResponse('Payment ID required', 400, undefined, request)
    }

    // Get payment data
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payment_transactions')
      .select(`
        id, order_id, payment_method, amount, status, proof_url, created_at,
        orders(customer_name, table_id, total_amount)
      `)
      .eq('id', fraudCheckData.payment_id)
      .single()

    if (paymentError || !payment) {
      return createNotFoundResponse('Payment', request)
    }

    // Run fraud detection
    const fraudResult = await runFraudDetection(payment, fraudCheckData.additional_checks)

    // Log fraud check
    await logAudit(
      authResult.employee.user_id,
      'FRAUD_CHECK',
      {
        payment_id: fraudCheckData.payment_id,
        fraud_score: fraudResult.fraud_score,
        indicators_found: fraudResult.indicators.length
      },
      'payment_transactions',
      fraudCheckData.payment_id
    )

    return createSuccessResponse(
      {
        payment_id: fraudCheckData.payment_id,
        fraud_result: fraudResult,
        checked_by: authResult.employee.full_name,
        checked_at: new Date().toISOString()
      },
      'Fraud detection completed',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleFraudCheck:', error)
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
 * Process and upload payment proof image
 */
async function processAndUploadProof(
  paymentId: string,
  uploadData: UploadProofRequest
): Promise<{
  success: boolean
  error?: string
  publicUrl?: string
  filePath?: string
}> {
  try {
    // Validate image data format
    if (!uploadData.image_data.startsWith('data:image/')) {
      return {
        success: false,
        error: 'Invalid image format. Must be a valid image file.'
      }
    }

    // Extract file type and base64 data
    const matches = uploadData.image_data.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/)
    if (!matches || matches.length !== 3) {
      return {
        success: false,
        error: 'Invalid base64 image format.'
      }
    }

    const fileType = matches[1]
    const base64Data = matches[2]

    // Validate file type
    const allowedTypes = ['jpeg', 'jpg', 'png', 'webp', 'pdf']
    if (!allowedTypes.includes(fileType.toLowerCase())) {
      return {
        success: false,
        error: `File type ${fileType} not allowed. Allowed types: ${allowedTypes.join(', ')}`
      }
    }

    // Decode base64 data
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (imageBuffer.length > maxSize) {
      return {
        success: false,
        error: `File size too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      }
    }

    // Generate file path
    const timestamp = Date.now()
    const fileName = uploadData.file_name || `proof_${timestamp}.${fileType}`
    const filePath = `payment-proofs/${paymentId}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadResult, error: uploadError } = await (supabaseAdmin as any).storage
      .from('payment-proofs')
      .upload(filePath, imageBuffer, {
        contentType: `image/${fileType}`,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: publicUrlData } = (supabaseAdmin as any).storage
      .from('payment-proofs')
      .getPublicUrl(filePath)

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      filePath
    }

  } catch (error) {
    console.error('Error processing and uploading proof:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload processing failed'
    }
  }
}

/**
 * Run automatic validation on uploaded proof
 */
async function runAutomaticValidation(
  paymentId: string,
  filePath: string
): Promise<PaymentValidationResult> {
  try {
    // Basic validation checks
    const issues: ValidationIssue[] = []
    const recommendations: string[] = []
    const fraudIndicators: FraudIndicator[] = []
    let confidenceScore = 70 // Base score

    // File existence check
    const { data: fileData, error: fileError } = await (supabaseAdmin as any).storage
      .from('payment-proofs')
      .download(filePath)

    if (fileError || !fileData) {
      issues.push({
        type: 'error',
        field: 'proof_file',
        message: 'Unable to access uploaded proof file',
        code: 'FILE_ACCESS_ERROR',
        severity: 'high'
      })
      confidenceScore -= 30
    } else {
      // File size validation
      if (fileData.size < 10000) { // Less than 10KB
        issues.push({
          type: 'warning',
          field: 'proof_file',
          message: 'Proof file seems very small, may be low quality',
          code: 'SMALL_FILE_SIZE',
          severity: 'medium'
        })
        confidenceScore -= 10
      }

      if (fileData.size > 1.5 * 1024 * 1024) { // More than 1.5MB
        recommendations.push('Consider compressing images to reduce file size')
      }
    }

    // TODO: Add OCR-based amount extraction
    // TODO: Add image quality assessment
    // TODO: Add duplicate image detection

    // Time-based validation
    const uploadTime = new Date()
    const currentHour = uploadTime.getHours()
    
    if (currentHour < 6 || currentHour > 23) {
      issues.push({
        type: 'warning',
        field: 'upload_time',
        message: 'Payment proof uploaded during unusual hours',
        code: 'UNUSUAL_UPLOAD_TIME',
        severity: 'low'
      })
      confidenceScore -= 5
    }

    // Basic fraud indicators
    await checkBasicFraudIndicators(paymentId, fraudIndicators)

    return {
      valid: issues.filter(issue => issue.type === 'error').length === 0,
      confidence_score: Math.max(0, Math.min(100, confidenceScore)),
      issues,
      recommendations,
      fraud_indicators: fraudIndicators
    }

  } catch (error) {
    console.error('Error in automatic validation:', error)
    return {
      valid: false,
      confidence_score: 0,
      issues: [{
        type: 'error',
        field: 'validation_system',
        message: 'Automatic validation failed',
        code: 'VALIDATION_ERROR',
        severity: 'high'
      }],
      recommendations: ['Manual verification required'],
      fraud_indicators: []
    }
  }
}

/**
 * Validate receipt data against payment
 */
async function validateReceiptData(
  payment: any,
  receiptData: any
): Promise<PaymentValidationResult> {
  const issues: ValidationIssue[] = []
  const recommendations: string[] = []
  const fraudIndicators: FraudIndicator[] = []
  let confidenceScore = 90 // High base score for manual verification

  // Amount validation
  const amountDifference = Math.abs(payment.amount - receiptData.amount)
  const amountTolerance = 1000 // Rp 1,000 tolerance

  if (amountDifference > amountTolerance) {
    issues.push({
      type: 'error',
      field: 'amount',
      message: `Amount mismatch. Expected: Rp ${payment.amount.toLocaleString('id-ID')}, Receipt: Rp ${receiptData.amount.toLocaleString('id-ID')}`,
      code: 'AMOUNT_MISMATCH',
      severity: 'high'
    })
    confidenceScore -= 40
  } else if (amountDifference > 0) {
    issues.push({
      type: 'warning',
      field: 'amount',
      message: `Minor amount difference: Rp ${amountDifference.toLocaleString('id-ID')}`,
      code: 'MINOR_AMOUNT_DIFFERENCE',
      severity: 'low'
    })
    confidenceScore -= 5
  }

  // Bank name validation (if available)
  if (payment.bank_name && receiptData.bank_name) {
    if (payment.bank_name.toLowerCase() !== receiptData.bank_name.toLowerCase()) {
      issues.push({
        type: 'warning',
        field: 'bank_name',
        message: `Bank name mismatch. Expected: ${payment.bank_name}, Receipt: ${receiptData.bank_name}`,
        code: 'BANK_NAME_MISMATCH',
        severity: 'medium'
      })
      confidenceScore -= 10
    }
  }

  // Timestamp validation
  if (receiptData.timestamp) {
    const receiptTime = new Date(receiptData.timestamp)
    const paymentTime = new Date(payment.created_at)
    const timeDifference = Math.abs(receiptTime.getTime() - paymentTime.getTime())
    const maxTimeDifference = 30 * 60 * 1000 // 30 minutes

    if (timeDifference > maxTimeDifference) {
      issues.push({
        type: 'warning',
        field: 'timestamp',
        message: 'Receipt timestamp differs significantly from payment creation time',
        code: 'TIMESTAMP_MISMATCH',
        severity: 'medium'
      })
      confidenceScore -= 15
    }
  }

  // Reference number validation
  if (payment.reference_number && receiptData.reference_number) {
    if (payment.reference_number !== receiptData.reference_number) {
      issues.push({
        type: 'error',
        field: 'reference_number',
        message: 'Reference number does not match',
        code: 'REFERENCE_MISMATCH',
        severity: 'high'
      })
      confidenceScore -= 25
    }
  }

  // Add recommendations based on validation
  if (confidenceScore >= 80) {
    recommendations.push('Receipt data looks consistent and valid')
  } else if (confidenceScore >= 60) {
    recommendations.push('Receipt has some inconsistencies but may be valid')
    recommendations.push('Consider additional verification steps')
  } else {
    recommendations.push('Receipt has significant issues')
    recommendations.push('Manual review strongly recommended')
    recommendations.push('Consider rejecting payment if issues cannot be resolved')
  }

  return {
    valid: issues.filter(issue => issue.type === 'error').length === 0,
    confidence_score: Math.max(0, Math.min(100, confidenceScore)),
    issues,
    recommendations,
    fraud_indicators: fraudIndicators
  }
}

/**
 * Run comprehensive validation
 */
async function runComprehensiveValidation(payment: any): Promise<PaymentValidationResult> {
  const issues: ValidationIssue[] = []
  const recommendations: string[] = []
  const fraudIndicators: FraudIndicator[] = []
  let confidenceScore = 85 // Base score

  // Check order consistency
  const orderTotal = payment.orders.order_items.reduce(
    (sum: number, item: any) => sum + item.total_price, 0
  )

  if (Math.abs(orderTotal - payment.orders.total_amount) > 0.01) {
    issues.push({
      type: 'error',
      field: 'order_total',
      message: 'Order items total does not match order total',
      code: 'ORDER_TOTAL_MISMATCH',
      severity: 'high'
    })
    confidenceScore -= 20
  }

  // Check payment method appropriateness
  if (payment.payment_method === 'cash' && payment.amount > 1000000) {
    issues.push({
      type: 'warning',
      field: 'payment_method',
      message: 'Large cash payment may require additional verification',
      code: 'LARGE_CASH_PAYMENT',
      severity: 'medium'
    })
    confidenceScore -= 10
  }

  // Time-based checks
  const paymentAge = Date.now() - new Date(payment.created_at).getTime()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours

  if (paymentAge > maxAge) {
    issues.push({
      type: 'warning',
      field: 'payment_age',
      message: 'Payment is quite old and may need special handling',
      code: 'OLD_PAYMENT',
      severity: 'low'
    })
    confidenceScore -= 5
  }

  // Fraud detection
  await checkBasicFraudIndicators(payment.id, fraudIndicators)

  return {
    valid: issues.filter(issue => issue.type === 'error').length === 0,
    confidence_score: Math.max(0, Math.min(100, confidenceScore)),
    issues,
    recommendations,
    fraud_indicators: fraudIndicators
  }
}

/**
 * Check basic fraud indicators
 */
async function checkBasicFraudIndicators(
  paymentId: string,
  fraudIndicators: FraudIndicator[]
): Promise<void> {
  try {
    // Check for duplicate amounts in recent payments
    const { data: recentPayments } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, amount, created_at')
      .neq('id', paymentId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(50)

    if (recentPayments) {
      // Get the actual payment to compare amounts
      const { data: currentPayment } = await supabaseAdmin
        .from('payment_transactions')
        .select('amount')
        .eq('id', paymentId)
        .single()

      const duplicateAmounts = recentPayments.filter(p => p.amount === (currentPayment?.amount || 0))
      if (duplicateAmounts.length > 2) {
        fraudIndicators.push({
          type: 'duplicate_amounts',
          description: 'Multiple payments with same amount in recent period',
          risk_level: 'medium',
          details: { count: duplicateAmounts.length, recent_payments: duplicateAmounts.slice(0, 3) }
        })
      }
    }

    // TODO: Add more fraud detection logic
    // - Check for rapid successive payments
    // - Validate payment patterns
    // - Check against blacklisted accounts

  } catch (error) {
    console.error('Error checking fraud indicators:', error)
  }
}

/**
 * Run fraud detection
 */
async function runFraudDetection(
  payment: any,
  additionalChecks?: any
): Promise<{
  fraud_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  indicators: FraudIndicator[]
  recommendations: string[]
}> {
  const indicators: FraudIndicator[] = []
  const recommendations: string[] = []
  let fraudScore = 0

  // Check for basic fraud indicators
  await checkBasicFraudIndicators(payment.id, indicators)
  fraudScore += indicators.length * 15

  // Additional checks if requested
  if (additionalChecks?.check_duplicate_receipts && payment.proof_url) {
    // TODO: Implement duplicate receipt checking
    recommendations.push('Check for duplicate receipt usage')
  }

  if (additionalChecks?.check_amount_manipulation) {
    // Check for round numbers (potential manipulation)
    if (payment.amount % 1000 === 0 && payment.amount > 10000) {
      indicators.push({
        type: 'round_amount',
        description: 'Payment amount is a round number',
        risk_level: 'low',
        details: { amount: payment.amount }
      })
      fraudScore += 5
    }
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical'
  
  if (fraudScore >= 80) {
    riskLevel = 'critical'
    recommendations.push('CRITICAL: Manual review required immediately')
    recommendations.push('Consider blocking payment until investigation')
  } else if (fraudScore >= 50) {
    riskLevel = 'high'
    recommendations.push('HIGH RISK: Thorough manual verification required')
    recommendations.push('Additional documentation may be needed')
  } else if (fraudScore >= 25) {
    riskLevel = 'medium'
    recommendations.push('MEDIUM RISK: Enhanced verification recommended')
    recommendations.push('Review payment details carefully')
  } else {
    riskLevel = 'low'
    recommendations.push('Low risk payment - standard verification process')
  }

  return {
    fraud_score: Math.min(100, fraudScore),
    risk_level: riskLevel,
    indicators,
    recommendations
  }
}

/**
 * Authenticate kasir for verification actions
 */
async function authenticateKasir(request: Request): Promise<{
  success: boolean
  error?: string
  employee?: any
}> {
  try {
    // Try device authentication first (for tablet)
    const deviceInfo = extractDeviceInfo(request)
    if (deviceInfo && deviceInfo.deviceRole === 'kasir') {
      const deviceAccount = await validateDeviceAuth(deviceInfo.deviceId, 'kasir')
      if (deviceAccount) {
        // For device login, get employee from headers
        const employeeId = request.headers.get('X-Employee-ID')
        if (employeeId) {
          const { data: employee } = await supabaseAdmin
            .from('employees')
            .select('id, user_id, full_name, position')
            .eq('id', employeeId)
            .eq('status', 'active')
            .single()

          if (employee) {
            return { success: true, employee }
          }
        }
        
        // Fallback to device account
        return { 
          success: true, 
          employee: { 
            id: deviceAccount.device_id,
            user_id: deviceAccount.device_id, 
            full_name: `Device ${deviceAccount.device_name}`,
            position: 'kasir'
          } 
        }
      }
    }

    // Try user authentication
    const authResult = await getAuthenticatedClient(request)
    if (authResult) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('id, user_id, full_name, position')
        .eq('user_id', authResult.user.id)
        .eq('status', 'active')
        .single()

      if (employee && ['kasir', 'owner'].includes(employee.position)) {
        return { success: true, employee }
      }
    }

    return {
      success: false,
      error: 'Unauthorized. Kasir access required.'
    }

  } catch (error) {
    console.error('Error authenticating kasir:', error)
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
 * Send notification when proof is uploaded
 */
async function sendProofUploadNotification(
  payment: any,
  proofUrl: string,
  validationResult: PaymentValidationResult
): Promise<void> {
  try {
    const urgencyLevel = validationResult.confidence_score < 60 ? 'high' : 'normal'
    const title = validationResult.confidence_score < 60 ? 
      'Bukti Pembayaran Perlu Review' : 'Bukti Pembayaran Diterima'
    
    await supabaseAdmin
      .from('notifications')
      .insert({
        type: 'payment_proof_uploaded',
        title,
        message: `Order ${payment.orders?.order_number} - Bukti pembayaran ${payment.payment_method} uploaded. Score: ${validationResult.confidence_score}%`,
        data: {
          payment_id: payment.id,
          order_id: payment.order_id,
          order_number: payment.orders?.order_number,
          payment_method: payment.payment_method,
          amount: payment.amount,
          proof_url: proofUrl,
          confidence_score: validationResult.confidence_score,
          validation_issues: validationResult.issues.length
        },
        channel: 'in_app',
        target_role: 'kasir',
        priority: urgencyLevel
      })

    // Also notify owner if confidence score is very low
    if (validationResult.confidence_score < 40) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          type: 'payment_verification_alert',
          title: 'Alert: Bukti Pembayaran Bermasalah',
          message: `Order ${payment.orders?.order_number} - Bukti pembayaran memiliki confidence score rendah (${validationResult.confidence_score}%)`,
          data: {
            payment_id: payment.id,
            order_number: payment.orders?.order_number,
            confidence_score: validationResult.confidence_score,
            issues_count: validationResult.issues.length
          },
          channel: 'in_app',
          target_role: 'owner',
          priority: 'high'
        })
    }

  } catch (error) {
    console.error('Error sending proof upload notification:', error)
  }
}

/**
 * Advanced OCR-based amount extraction (placeholder)
 * TODO: Integrate with OCR service like Google Vision API
 */
async function extractAmountFromReceipt(imagePath: string): Promise<{
  success: boolean
  extracted_amount?: number
  confidence?: number
  raw_text?: string
}> {
  try {
    // Placeholder for OCR implementation
    // In real implementation, this would:
    // 1. Call Google Vision API or similar OCR service
    // 2. Extract text from receipt image
    // 3. Parse amount using regex patterns
    // 4. Return confidence score based on text quality
    
    console.log('TODO: Implement OCR amount extraction for:', imagePath)
    
    return {
      success: false,
      extracted_amount: undefined,
      confidence: 0,
      raw_text: undefined
    }

  } catch (error) {
    console.error('Error in OCR amount extraction:', error)
    return {
      success: false,
      confidence: 0
    }
  }
}

/**
 * Check for duplicate receipt usage
 * Uses image hash comparison to detect duplicate receipts
 */
async function checkDuplicateReceipts(paymentId: string, imagePath: string): Promise<{
  has_duplicates: boolean
  duplicate_payments?: string[]
  confidence?: number
}> {
  try {
    // Placeholder for image hash comparison
    // In real implementation, this would:
    // 1. Calculate perceptual hash of the image
    // 2. Compare with hashes of other receipt images
    // 3. Flag potential duplicates based on similarity threshold
    
    console.log('TODO: Implement duplicate receipt detection for:', paymentId, imagePath)
    
    return {
      has_duplicates: false,
      duplicate_payments: [],
      confidence: 0
    }

  } catch (error) {
    console.error('Error checking duplicate receipts:', error)
    return {
      has_duplicates: false,
      confidence: 0
    }
  }
}

/**
 * Get payment verification statistics
 */
export async function getVerificationStats(): Promise<{
  total_verifications_today: number
  average_confidence_score: number
  fraud_alerts_today: number
  pending_verifications: number
  verification_success_rate: number
}> {
  try {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    // Get verification stats
    const { data: todayVerifications } = await supabaseAdmin
      .from('payment_verifications')
      .select('confidence_score, validation_issues')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    // Get pending payments
    const { data: pendingPayments } = await supabaseAdmin
      .from('payment_transactions')
      .select('id')
      .eq('status', 'pending')

    const pendingCount = pendingPayments?.length || 0

    const totalVerifications = todayVerifications?.length || 0
    const averageConfidence = totalVerifications > 0 ? 
      todayVerifications.reduce((sum, v) => sum + v.confidence_score, 0) / totalVerifications : 0
    
    const fraudAlerts = todayVerifications?.filter(v => 
      v.validation_issues && v.validation_issues.some((issue: any) => issue.severity === 'high')
    ).length || 0

    return {
      total_verifications_today: totalVerifications,
      average_confidence_score: Math.round(averageConfidence * 100) / 100,
      fraud_alerts_today: fraudAlerts,
      pending_verifications: pendingCount,
      verification_success_rate: totalVerifications > 0 ? 
        ((totalVerifications - fraudAlerts) / totalVerifications) * 100 : 100
    }

  } catch (error) {
    console.error('Error getting verification stats:', error)
    return {
      total_verifications_today: 0,
      average_confidence_score: 0,
      fraud_alerts_today: 0,
      pending_verifications: 0,
      verification_success_rate: 0
    }
  }
}

// ===========================================
// MAIN HANDLER WITH ROUTING
// ===========================================

const handler = withCors(createHandler({
  POST: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/upload-proof/')) {
      return handleUploadProof(request)
    } else if (url.pathname.includes('/verify-receipt')) {
      return handleVerifyReceipt(request)
    } else if (url.pathname.includes('/fraud-check')) {
      return handleFraudCheck(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/validate/')) {
      return handleValidatePayment(request)
    } else if (url.pathname.includes('/stats')) {
      const stats = await getVerificationStats()
      return createSuccessResponse(stats, 'Verification statistics retrieved', undefined, request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler