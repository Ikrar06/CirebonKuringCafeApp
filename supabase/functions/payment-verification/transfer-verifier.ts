/**
 * Bank Transfer Payment Verifier - Manual Verification
 * 
 * Simple helper functions for manual bank transfer verification by kasir/owner:
 * - Store transfer proof images
 * - Get pending verifications for kasir
 * - Manual approve/reject functions
 * - Basic duplicate checking
 */

import { supabaseAdmin } from '../_shared/supabase-client'

interface TransferPaymentProof {
  orderId: string
  customerName: string
  amount: number
  proofImageUrl: string
  bankName: string
  accountNumber?: string
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
 * Store bank transfer payment proof for manual verification
 */
export async function storeTransferProof(
  orderId: string,
  proofImageUrl: string,
  bankName: string,
  accountNumber?: string,
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
        payment_method: 'bank_transfer',
        amount: order.total_amount,
        status: 'pending_verification',
        bank_name: bankName,
        account_number: accountNumber,
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
    console.error('Error storing transfer proof:', error)
    return {
      success: false,
      error: 'Failed to store payment proof'
    }
  }
}

/**
 * Get pending bank transfer verifications for kasir dashboard
 */
export async function getPendingTransferVerifications(): Promise<{
  payments: Array<{
    id: string
    orderId: string
    orderNumber: string
    customerName: string
    amount: number
    proofImageUrl: string
    bankName: string
    accountNumber?: string
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
        bank_name,
        account_number,
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
      .eq('payment_method', 'bank_transfer')
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
        bankName: payment.bank_name,
        accountNumber: payment.account_number,
        transactionReference: payment.transaction_reference,
        uploadedAt: new Date(payment.uploaded_at),
        tableName: `Meja ${(payment.orders as any).tables.table_number}`
      }))
    }

  } catch (error) {
    console.error('Error getting pending transfer verifications:', error)
    return { payments: [] }
  }
}

/**
 * Approve bank transfer payment (kasir action)
 */
export async function approveTransferPayment(
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
      message: 'Bank transfer payment approved successfully'
    }

  } catch (error) {
    console.error('Error approving transfer payment:', error)
    return {
      success: false,
      paymentId,
      message: 'Failed to approve payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Reject bank transfer payment (kasir action)
 */
export async function rejectTransferPayment(
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
      message: 'Bank transfer payment rejected'
    }

  } catch (error) {
    console.error('Error rejecting transfer payment:', error)
    return {
      success: false,
      paymentId,
      message: 'Failed to reject payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check for duplicate bank transfer transaction reference
 */
export async function checkDuplicateTransferTransaction(transactionReference: string): Promise<{
  isDuplicate: boolean
  existingPayment?: {
    id: string
    orderNumber: string
    status: string
    amount: number
    bankName: string
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
        bank_name,
        orders (
          order_number
        )
      `)
      .eq('transaction_reference', transactionReference)
      .eq('payment_method', 'bank_transfer')
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
          amount: existingPayment.amount,
          bankName: existingPayment.bank_name
        }
      }
    }

    return { isDuplicate: false }

  } catch (error) {
    console.error('Error checking duplicate transfer transaction:', error)
    return { isDuplicate: false }
  }
}

/**
 * Get supported banks list (for customer UI)
 */
export async function getSupportedBanks(): Promise<{
  banks: Array<{
    code: string
    name: string
    accountNumber?: string
    accountName?: string
  }>
}> {
  try {
    const { data: banks, error } = await supabaseAdmin
      .from('payment_configurations')
      .select('bank_code, bank_name, account_number, account_name')
      .eq('payment_method', 'bank_transfer')
      .eq('is_active', true)
      .order('bank_name')

    if (error) {
      console.error('Error fetching supported banks:', error)
      return { banks: [] }
    }

    return {
      banks: banks.map(bank => ({
        code: bank.bank_code,
        name: bank.bank_name,
        accountNumber: bank.account_number,
        accountName: bank.account_name
      }))
    }

  } catch (error) {
    console.error('Error getting supported banks:', error)
    return { banks: [] }
  }
}

/**
 * Get all pending verifications (both QRIS and Transfer) for kasir dashboard
 */
export async function getAllPendingVerifications(): Promise<{
  payments: Array<{
    id: string
    orderId: string
    orderNumber: string
    customerName: string
    amount: number
    paymentMethod: 'qris' | 'bank_transfer'
    proofImageUrl: string
    bankName?: string
    accountNumber?: string
    transactionReference?: string
    uploadedAt: Date
    tableName: string
    timeAgo: string
  }>
}> {
  try {
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        payment_method,
        amount,
        bank_name,
        account_number,
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
      .eq('status', 'pending_verification')
      .in('payment_method', ['qris', 'bank_transfer'])
      .order('uploaded_at', { ascending: true })

    if (error) {
      console.error('Error fetching all pending verifications:', error)
      return { payments: [] }
    }

    return {
      payments: payments.map(payment => {
        const uploadedAt = new Date(payment.uploaded_at)
        const now = new Date()
        const diffMinutes = Math.floor((now.getTime() - uploadedAt.getTime()) / (1000 * 60))
        
        let timeAgo: string
        if (diffMinutes < 1) {
          timeAgo = 'Baru saja'
        } else if (diffMinutes < 60) {
          timeAgo = `${diffMinutes} menit lalu`
        } else if (diffMinutes < 1440) {
          const hours = Math.floor(diffMinutes / 60)
          timeAgo = `${hours} jam lalu`
        } else {
          const days = Math.floor(diffMinutes / 1440)
          timeAgo = `${days} hari lalu`
        }

        return {
          id: payment.id,
          orderId: (payment.orders as any).id,
          orderNumber: (payment.orders as any).order_number,
          customerName: (payment.orders as any).customer_name,
          amount: payment.amount,
          paymentMethod: payment.payment_method as 'qris' | 'bank_transfer',
          proofImageUrl: payment.proof_image_url,
          bankName: payment.bank_name,
          accountNumber: payment.account_number,
          transactionReference: payment.transaction_reference,
          uploadedAt,
          tableName: `Meja ${(payment.orders as any).tables.table_number}`,
          timeAgo
        }
      })
    }

  } catch (error) {
    console.error('Error getting all pending verifications:', error)
    return { payments: [] }
  }
}