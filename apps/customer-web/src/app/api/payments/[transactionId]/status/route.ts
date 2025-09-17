import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    console.log('=== PAYMENT STATUS API START ===')
    const transactionId = params.transactionId
    console.log('Checking status for transaction:', transactionId)

    // Get payment transaction with order details
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        orders(
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          payment_verified_at,
          payment_verified_by
        )
      `)
      .eq('id', transactionId)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: { message: 'Transaction not found' } },
        { status: 404 }
      )
    }

    // Determine overall status
    let overallStatus = 'pending'
    let message = 'Menunggu pembayaran'
    let next_action = null

    if (transaction.status === 'success' && transaction.orders?.payment_status === 'verified') {
      overallStatus = 'completed'
      message = 'Pembayaran berhasil diverifikasi'
    } else if (transaction.status === 'pending' && transaction.proof_image_url) {
      overallStatus = 'pending_verification'
      message = 'Menunggu verifikasi dari kasir'
    } else if (transaction.status === 'processing') {
      overallStatus = 'processing'
      message = 'Pembayaran sedang diproses'
    } else if (transaction.status === 'failed') {
      overallStatus = 'failed'
      message = 'Pembayaran gagal'
      next_action = 'Silakan coba lagi atau hubungi kasir'
    } else if (transaction.status === 'expired') {
      overallStatus = 'expired'
      message = 'Pembayaran kadaluarsa'
      next_action = 'Silakan buat pembayaran baru'
    } else if (transaction.payment_method === 'transfer' && !transaction.proof_image_url) {
      overallStatus = 'waiting_proof'
      message = 'Menunggu upload bukti pembayaran'
      next_action = 'Upload bukti transfer'
    } else if (transaction.payment_method === 'qris') {
      overallStatus = 'waiting_payment'
      message = 'Menunggu pembayaran QRIS'
      next_action = 'Scan QR code dengan aplikasi e-wallet'
    } else if (transaction.payment_method === 'cash') {
      overallStatus = 'waiting_payment'
      message = 'Menunggu pembayaran tunai'
      next_action = 'Bayar ke kasir'
    }

    const responseData = {
      transaction_id: transactionId,
      status: overallStatus,
      message: message,
      next_action: next_action,
      payment_method: transaction.payment_method,
      amount: transaction.amount,
      created_at: transaction.created_at,
      processed_at: transaction.processed_at,
      verified_at: transaction.verified_at,
      verified_by: transaction.verified_by,
      proof_url: transaction.proof_image_url,
      order: {
        id: transaction.orders?.id,
        order_number: transaction.orders?.order_number,
        status: transaction.orders?.status,
        payment_status: transaction.orders?.payment_status,
        total_amount: transaction.orders?.total_amount
      }
    }

    console.log('Payment status response:', responseData)

    return NextResponse.json({
      data: responseData
    })

  } catch (error: any) {
    console.error('Error in payment status check:', error)
    return NextResponse.json(
      { error: {
        message: 'Internal server error: ' + (error.message || 'Unknown error'),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }},
      { status: 500 }
    )
  }
}