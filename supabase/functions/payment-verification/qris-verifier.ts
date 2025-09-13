/**
 * QRIS Payment Verifier - Manual Verification
 * 
 * Simple helper functions for manual QRIS verification by kasir/owner:
 * - Basic validation helpers
 * - Image storage utilities
 * - Duplicate checking
 */

import { supabaseAdmin } from '../_shared/supabase-client'

interface QRISPaymentProof {
  orderId: string
  customerName: string
  amount: number
  proofImageUrl: string
  transactionReference?: string
  uploadedAt: Date
}

interface ManualVerificationResult {
  success: boolean
  paymentId: string
  message: string
  error?: string
}

/**
 * Store QRIS payment proof for manual verification
 */
export async function storeQRISProof(
  orderId: string,
  proofImageUrl: string,
  transactionReference?: string
): Promise<{
  success: boolean
  paymentId?: string
  error?: string
}> {
  try {
    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, total_amount, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return {
        success: false,
        error: 'Order not found'
      }
    }

    if (order.status !== 'pending') {
      return {
        success: false,
        error: 'Order is not in pending status'
      }
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: orderId,
        payment_method: 'qris',
        amount: order.total_amount,
        status: 'pending_verification',
        transaction_reference: transactionReference,
        proof_image_url: proofImageUrl,
        uploaded_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (paymentError) {
      return {
        success: false,
        error: 'Failed to create payment record'
      }
    }

    return {
      success: true,
      paymentId: payment.id
    }

  } catch (error) {
    console.error('Error storing QRIS proof:', error)
    return {
      success: false,
      error: 'Failed to store payment proof'
    }
  }
}

/**
 * Get pending QRIS verifications for kasir dashboard
 */
export async function getPendingQRISVerifications(): Promise<{
  payments: Array<{
    id: string
    orderId: string
    orderNumber: string
    customerName: string
    amount: number
    proofImageUrl: string
    transactionReference?: string
    uploadedAt: Date
    tableName: string
  }>
}> {
  try {
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        amount,
        transaction_reference,
        proof_image_url,
        uploaded_at,
        orders!inner (
          id,
          order_number,
          customer_name,
          tables (
            table_number
          )
        )
      `)
      .eq('payment_method', 'qris')
      .eq('status', 'pending_verification')
      .order('uploaded_at', { ascending: true })

    if (error) {
      console.error('Error fetching pending verifications:', error)
      return { payments: [] }
    }

    return {
      payments: payments.map(payment => ({
        id: payment.id,
        orderId: (payment.orders as any).id,
        orderNumber: (payment.orders as any).order_number,
        customerName: (payment.orders as any).customer_name,
        amount: payment.amount,
        proofImageUrl: payment.proof_image_url,
        transactionReference: payment.transaction_reference,
        uploadedAt: new Date(payment.uploaded_at),
        tableName: `Meja ${(payment.orders as any).tables.table_number}`
      }))
    }

  } catch (error) {
    console.error('Error getting pending QRIS verifications:', error)
    return { payments: [] }
  }
}

/**
 * Approve QRIS payment (kasir action)
 */
export async function approveQRISPayment(
  paymentId: string,
  kasirId: string,
  notes?: string
): Promise<ManualVerificationResult> {
  try {
    // Update payment status
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'verified',
        verified_by: kasirId,
        verified_at: new Date().toISOString(),
        verification_notes: notes
      })
      .eq('id', paymentId)
      .select('order_id')
      .single()

    if (paymentError) {
      return {
        success: false,
        paymentId,
        message: 'Failed to update payment status',
        error: paymentError.message
      }
    }

    // Update order status to confirmed
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', payment.order_id)

    return {
      success: true,
      paymentId,
      message: 'QRIS payment approved successfully'
    }

  } catch (error) {
    console.error('Error approving QRIS payment:', error)
    return {
      success: false,
      paymentId,
      message: 'Failed to approve payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Reject QRIS payment (kasir action)
 */
export async function rejectQRISPayment(
  paymentId: string,
  kasirId: string,
  reason: string
): Promise<ManualVerificationResult> {
  try {
    // Update payment status
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'rejected',
        verified_by: kasirId,
        verified_at: new Date().toISOString(),
        verification_notes: reason
      })
      .eq('id', paymentId)
      .select('order_id')
      .single()

    if (paymentError) {
      return {
        success: false,
        paymentId,
        message: 'Failed to update payment status',
        error: paymentError.message
      }
    }

    // Keep order in pending status for re-payment
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.order_id)

    return {
      success: true,
      paymentId,
      message: 'QRIS payment rejected'
    }

  } catch (error) {
    console.error('Error rejecting QRIS payment:', error)
    return {
      success: false,
      paymentId,
      message: 'Failed to reject payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check for duplicate QRIS transaction reference
 */
export async function checkDuplicateQRISTransaction(transactionReference: string): Promise<{
  isDuplicate: boolean
  existingPayment?: {
    id: string
    orderNumber: string
    status: string
    amount: number
  }
}> {
  try {
    if (!transactionReference) {
      return { isDuplicate: false }
    }

    const { data: existingPayment, error } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        status,
        amount,
        orders (
          order_number
        )
      `)
      .eq('transaction_reference', transactionReference)
      .eq('payment_method', 'qris')
      .neq('status', 'rejected')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking duplicate transaction:', error)
      return { isDuplicate: false }
    }

    if (existingPayment) {
      return {
        isDuplicate: true,
        existingPayment: {
          id: existingPayment.id,
          orderNumber: (existingPayment.orders as any).order_number,
          status: existingPayment.status,
          amount: existingPayment.amount
        }
      }
    }

    return { isDuplicate: false }

  } catch (error) {
    console.error('Error checking duplicate QRIS transaction:', error)
    return { isDuplicate: false }
  }
}