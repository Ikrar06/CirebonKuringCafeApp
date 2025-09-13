/**
 * Payment Processing Edge Function - Main Handler
 * 
 * Handles payment creation, verification, and processing
 * Supports QRIS, Bank Transfer, Cash, and Card payments
 * 
 * @endpoints 
 * POST /payment-processing - Create payment record (customer upload proof)
 * PUT /payment-processing/:paymentId - Verify payment (kasir)
 * GET /payment-processing/:orderId - Get payment details
 * DELETE /payment-processing/:paymentId - Cancel payment
 */

import { withCors } from '../_shared/cors'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  parseJsonBody,
  extractAuthToken,
  createHandler
} from '../_shared/response'
import { 
  supabaseAdmin, 
  getAuthenticatedClient,
  validateDeviceAuth,
  getEmployeeByUserId,
  logAudit 
} from '../_shared/supabase-client'
import { 
  validateFields,
  isValidRupiahAmount,
  sanitizeString
} from '../../../packages/utils/src/validators/index'

// Payment interfaces
interface CreatePaymentRequest {
  order_id: string
  payment_method: 'qris' | 'bank_transfer' | 'cash' | 'debit_card' | 'credit_card'
  amount: number
  bank_name?: string // For bank transfer
  account_number?: string // For bank transfer
  reference_number?: string // Transaction reference
  notes?: string
}

interface VerifyPaymentRequest {
  payment_id: string
  action: 'approve' | 'reject'
  verification_notes?: string
  cash_received?: number // For cash payments
  change_amount?: number // For cash payments
}

interface PaymentResponse {
  payment_id: string
  order_id: string
  order_number: string
  payment_method: string
  amount: number
  status: string
  proof_url?: string
  verification_notes?: string
  verified_by?: string
  verified_at?: string
  created_at: string
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Create payment record (customer uploads payment proof)
 */
async function handleCreatePayment(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    // Validate required fields
    const validation = validateFields(body, {
      order_id: { required: true, type: 'string' },
      payment_method: { required: true, type: 'string' },
      amount: { required: true, type: 'number', min: 1000 }
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

    const paymentData = body as CreatePaymentRequest

    // Validate payment method
    const validMethods = ['qris', 'bank_transfer', 'cash', 'debit_card', 'credit_card']
    if (!validMethods.includes(paymentData.payment_method)) {
      return createErrorResponse(
        'Invalid payment method',
        400,
        { valid_methods: validMethods },
        request
      )
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, total_amount, status, table_id, customer_name')
      .eq('id', paymentData.order_id)
      .single()

    if (orderError || !order) {
      return createNotFoundResponse('Order', request)
    }

    // Validate order status
    if (order.status !== 'pending') {
      return createErrorResponse(
        `Order ${order.order_number} is not pending payment. Current status: ${order.status}`,
        400,
        undefined,
        request
      )
    }

    // Validate payment amount
    if (Math.abs(paymentData.amount - order.total_amount) > 0.01) {
      return createErrorResponse(
        `Payment amount mismatch. Expected: Rp ${order.total_amount.toLocaleString('id-ID')}, Received: Rp ${paymentData.amount.toLocaleString('id-ID')}`,
        400,
        { expected: order.total_amount, received: paymentData.amount },
        request
      )
    }

    // Check if payment already exists for this order
    const { data: existingPayment } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, status')
      .eq('order_id', paymentData.order_id)
      .in('status', ['pending', 'verified'])
      .single()

    if (existingPayment) {
      return createErrorResponse(
        'Payment already exists for this order',
        400,
        { existing_payment_id: existingPayment.id },
        request
      )
    }

    // Create payment record
    const paymentResult = await createPaymentRecord(paymentData, order)
    if (!paymentResult.success) {
      return createErrorResponse(
        paymentResult.error || 'Failed to create payment',
        500,
        undefined,
        request
      )
    }

    // Send notification to kasir for verification
    await sendPaymentNotification(paymentResult.payment, 'payment_received')

    // Log audit
    await logAudit(
      'customer', // TODO: Get actual customer session ID
      'CREATE_PAYMENT',
      {
        payment_id: paymentResult.payment.id,
        order_id: order.id,
        payment_method: paymentData.payment_method,
        amount: paymentData.amount
      },
      'payment_transactions',
      paymentResult.payment.id
    )

    const response: PaymentResponse = {
      payment_id: paymentResult.payment.id,
      order_id: order.id,
      order_number: order.order_number,
      payment_method: paymentData.payment_method,
      amount: paymentData.amount,
      status: paymentResult.payment.status,
      proof_url: paymentResult.payment.proof_url,
      created_at: paymentResult.payment.created_at
    }

    // Different response based on payment method
    if (['qris', 'bank_transfer'].includes(paymentData.payment_method)) {
      return createSuccessResponse(
        response,
        'Payment record created. Please upload payment proof for verification.',
        {
          next_steps: [
            'Upload payment proof (receipt/screenshot)',
            'Wait for kasir verification',
            'Order will be processed after verification'
          ],
          upload_url: `/payment-processing/${paymentResult.payment.id}/upload-proof`
        },
        request
      )
    } else {
      // Cash/Card payments need kasir interaction
      return createSuccessResponse(
        response,
        'Payment record created. Please proceed to kasir for payment.',
        {
          next_steps: [
            'Go to kasir counter',
            'Complete payment with kasir',
            'Kasir will verify payment in system'
          ]
        },
        request
      )
    }

  } catch (error) {
    console.error('Error in handleCreatePayment:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Verify payment (kasir action)
 */
async function handleVerifyPayment(request: Request): Promise<Response> {
  try {
    // Extract payment ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const paymentId = pathParts[pathParts.length - 1]

    if (!paymentId) {
      return createErrorResponse('Payment ID required', 400, undefined, request)
    }

    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const verificationData = body as VerifyPaymentRequest

    // Validate action
    if (!['approve', 'reject'].includes(verificationData.action)) {
      return createErrorResponse(
        'Invalid action. Must be "approve" or "reject"',
        400,
        undefined,
        request
      )
    }

    // Authenticate kasir
    const authResult = await authenticateKasir(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payment_transactions')
      .select(`
        id, order_id, payment_method, amount, status, proof_url,
        orders(id, order_number, status, total_amount, customer_name)
      `)
      .eq('id', paymentId)
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

    // Process verification
    const verificationResult = await processPaymentVerification(
      payment,
      verificationData,
      authResult.employee
    )

    if (!verificationResult.success) {
      return createErrorResponse(
        verificationResult.error || 'Verification failed',
        500,
        undefined,
        request
      )
    }

    // Log audit
    await logAudit(
      authResult.employee.user_id,
      'VERIFY_PAYMENT',
      {
        payment_id: paymentId,
        action: verificationData.action,
        order_id: payment.order_id,
        amount: payment.amount
      },
      'payment_transactions',
      paymentId
    )

    const response: PaymentResponse = {
      payment_id: payment.id,
      order_id: payment.order_id,
      order_number: payment.orders.order_number,
      payment_method: payment.payment_method,
      amount: payment.amount,
      status: verificationResult.newStatus || 'verified',
      proof_url: payment.proof_url,
      verification_notes: verificationData.verification_notes,
      verified_by: authResult.employee.full_name,
      verified_at: new Date().toISOString(),
      created_at: payment.created_at
    }

    if (verificationData.action === 'approve') {
      return createSuccessResponse(
        response,
        'Payment approved successfully. Order is being processed.',
        {
          order_status: 'confirmed',
          next_steps: [
            'Stock has been deducted',
            'Order sent to kitchen',
            'Customer will be notified when ready'
          ]
        },
        request
      )
    } else {
      return createSuccessResponse(
        response,
        'Payment rejected. Customer needs to make payment again.',
        {
          order_status: 'pending',
          next_steps: [
            'Customer will be notified',
            'New payment attempt required'
          ]
        },
        request
      )
    }

  } catch (error) {
    console.error('Error in handleVerifyPayment:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get payment details
 */
async function handleGetPayment(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const identifier = pathParts[pathParts.length - 1]

    if (!identifier) {
      return createErrorResponse('Order ID or Payment ID required', 400, undefined, request)
    }

    // Try to find by order ID first, then by payment ID
    let payment = null
    
    // Check if it's an order ID (UUID format)
    const { data: paymentByOrder } = await supabaseAdmin
      .from('payment_transactions')
      .select(`
        id, order_id, payment_method, amount, status, proof_url,
        created_at, verified_at, verification_notes,
        orders(order_number, customer_name, total_amount),
        verified_by_employee:employees(full_name)
      `)
      .eq('order_id', identifier)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (paymentByOrder) {
      payment = paymentByOrder
    } else {
      // Try by payment ID
      const { data: paymentById } = await supabaseAdmin
        .from('payment_transactions')
        .select(`
          id, order_id, payment_method, amount, status, proof_url,
          created_at, verified_at, verification_notes,
          orders(order_number, customer_name, total_amount),
          verified_by_employee:employees(full_name)
        `)
        .eq('id', identifier)
        .single()

      payment = paymentById
    }

    if (!payment) {
      return createNotFoundResponse('Payment', request)
    }

    const response: PaymentResponse = {
      payment_id: (payment as any).id,
      order_id: (payment as any).order_id,
      order_number: (payment as any).orders?.order_number || '',
      payment_method: (payment as any).payment_method,
      amount: (payment as any).amount,
      status: (payment as any).status,
      proof_url: (payment as any).proof_url || (payment as any).proof_image_url,
      verification_notes: (payment as any).verification_notes,
      verified_by: (payment as any).verified_by_employee?.full_name,
      verified_at: (payment as any).verified_at,
      created_at: (payment as any).created_at
    }

    return createSuccessResponse(
      response,
      'Payment details retrieved successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetPayment:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Cancel payment (before verification)
 */
async function handleCancelPayment(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const paymentId = pathParts[pathParts.length - 1]

    if (!paymentId) {
      return createErrorResponse('Payment ID required', 400, undefined, request)
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, status, order_id, payment_method, amount')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return createNotFoundResponse('Payment', request)
    }

    // Can only cancel pending payments
    if (payment.status !== 'pending') {
      return createErrorResponse(
        `Cannot cancel payment with status: ${payment.status}`,
        400,
        undefined,
        request
      )
    }

    // Update payment status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'cancelled',
        verification_notes: 'Cancelled by customer',
        verified_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (updateError) {
      return createErrorResponse(
        'Failed to cancel payment',
        500,
        undefined,
        request
      )
    }

    // Log audit
    await logAudit(
      'customer', // TODO: Get actual customer session ID
      'CANCEL_PAYMENT',
      {
        payment_id: paymentId,
        order_id: payment.order_id,
        payment_method: payment.payment_method,
        amount: payment.amount
      },
      'payment_transactions',
      paymentId
    )

    return createSuccessResponse(
      { payment_id: paymentId, status: 'cancelled' },
      'Payment cancelled successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleCancelPayment:', error)
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
 * Create payment record in database
 */
async function createPaymentRecord(
  paymentData: CreatePaymentRequest,
  order: any
): Promise<{
  success: boolean
  error?: string
  payment?: any
}> {
  try {
    // Determine initial status based on payment method
    let initialStatus = 'pending'
    
    // For cash/card, might need immediate verification at kasir
    if (['cash', 'debit_card', 'credit_card'].includes(paymentData.payment_method)) {
      initialStatus = 'pending' // Still needs kasir confirmation
    }

    const { data: payment, error } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        order_id: paymentData.order_id,
        payment_method: paymentData.payment_method,
        amount: paymentData.amount,
        status: initialStatus,
        bank_name: paymentData.bank_name,
        account_number: paymentData.account_number,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes ? sanitizeString(paymentData.notes) : null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      payment
    }

  } catch (error) {
    console.error('Error creating payment record:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error'
    }
  }
}

/**
 * Authenticate kasir for payment verification
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
        // For device login, get employee from headers or additional auth
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
      const employee = await getEmployeeByUserId(authResult.user.id)
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
 * Process payment verification (approve/reject)
 */
async function processPaymentVerification(
  payment: any,
  verificationData: VerifyPaymentRequest,
  employee: any
): Promise<{
  success: boolean
  error?: string
  newStatus?: string
}> {
  try {
    const newStatus = verificationData.action === 'approve' ? 'verified' : 'rejected'
    
    // Update payment record
    const { error: updateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: newStatus,
        verified_by: employee.id,
        verified_at: new Date().toISOString(),
        verification_notes: verificationData.verification_notes ? 
          sanitizeString(verificationData.verification_notes) : null,
        cash_received: verificationData.cash_received,
        change_amount: verificationData.change_amount
      })
      .eq('id', payment.id)

    if (updateError) {
      throw updateError
    }

    if (verificationData.action === 'approve') {
      // Update order status to confirmed
      const { error: orderError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', payment.order_id)

      if (orderError) {
        console.error('Error updating order status:', orderError)
      }

      // Trigger stock deduction (will be implemented in file 3)
      await triggerStockDeduction(payment.order_id)

      // Send notifications
      await sendPaymentNotification(payment, 'payment_verified')
      await sendOrderToKitchen(payment.orders)
    } else {
      // Send rejection notification
      await sendPaymentNotification(payment, 'payment_rejected')
    }

    return {
      success: true,
      newStatus
    }

  } catch (error) {
    console.error('Error processing payment verification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification processing failed'
    }
  }
}

/**
 * Send payment notifications
 */
async function sendPaymentNotification(payment: any, type: string): Promise<void> {
  try {
    let title = ''
    let message = ''
    let targetRole = ''

    switch (type) {
      case 'payment_received':
        title = 'Payment Perlu Verifikasi'
        message = `Payment ${payment.payment_method} untuk order ${payment.orders?.order_number || 'N/A'} - Rp ${payment.amount.toLocaleString('id-ID')}`
        targetRole = 'kasir'
        break
      case 'payment_verified':
        title = 'Payment Diverifikasi'
        message = `Order ${payment.orders?.order_number || 'N/A'} telah dibayar - Lanjut ke dapur`
        targetRole = 'dapur'
        break
      case 'payment_rejected':
        title = 'Payment Ditolak'
        message = `Payment untuk order ${payment.orders?.order_number || 'N/A'} ditolak - Perlu pembayaran ulang`
        targetRole = 'kasir'
        break
    }

    await supabaseAdmin
      .from('notifications')
      .insert({
        type,
        title,
        message,
        data: {
          payment_id: payment.id,
          order_id: payment.order_id,
          order_number: payment.orders?.order_number,
          amount: payment.amount,
          payment_method: payment.payment_method
        },
        channel: 'in_app',
        target_role: targetRole
      })

  } catch (error) {
    console.error('Error sending payment notification:', error)
  }
}

/**
 * Trigger stock deduction (placeholder for file 3)
 */
async function triggerStockDeduction(orderId: string): Promise<void> {
  try {
    // This will call the stock deduction function
    // For now, just log that it should happen
    console.log(`TODO: Trigger stock deduction for order: ${orderId}`)
    
    // In file 3, this will make an internal function call to:
    // await deductStockForOrder(orderId)
  } catch (error) {
    console.error('Error triggering stock deduction:', error)
  }
}

/**
 * Send order to kitchen
 */
async function sendOrderToKitchen(order: any): Promise<void> {
  try {
    await supabaseAdmin
      .from('notifications')
      .insert({
        type: 'order_ready_for_kitchen',
        title: 'Order Siap Diproses',
        message: `Order ${order?.order_number} dari ${order?.customer_name} - Mulai memasak`,
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
          customer_name: order?.customer_name
        },
        channel: 'in_app',
        target_role: 'dapur'
      })
  } catch (error) {
    console.error('Error sending order to kitchen:', error)
  }
}

// ===========================================
// MAIN HANDLER WITH ROUTING
// ===========================================

const handler = withCors(createHandler({
  POST: handleCreatePayment,
  PUT: handleVerifyPayment,
  GET: handleGetPayment,
  DELETE: handleCancelPayment
}))

export default handler