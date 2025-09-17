import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('=== PAYMENT API START ===')
    const body = await request.json()
    console.log('Payment request body:', JSON.stringify(body, null, 2))

    const {
      order_id,
      method,
      amount,
      customer_phone
    } = body

    // Validate required fields
    if (!order_id || !method || !amount) {
      console.log('Validation failed - missing required fields')
      return NextResponse.json(
        { error: { message: 'Missing required fields: order_id, method, amount' } },
        { status: 400 }
      )
    }

    // Validate payment method enum
    const validPaymentMethods = ['cash', 'qris', 'transfer']
    if (!validPaymentMethods.includes(method)) {
      console.log('Invalid payment method:', method)
      return NextResponse.json(
        { error: { message: `Invalid payment method: ${method}. Valid methods: ${validPaymentMethods.join(', ')}` } },
        { status: 400 }
      )
    }

    // Validate order exists and is in correct state
    console.log('Validating order:', order_id)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status, payment_status')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      console.log('Order validation failed:', orderError)
      return NextResponse.json(
        { error: { message: 'Invalid order ID: ' + (orderError?.message || 'Order not found') } },
        { status: 400 }
      )
    }

    // Check if order can be paid
    if (order.payment_status === 'verified') {
      return NextResponse.json(
        { error: { message: 'Order sudah dibayar' } },
        { status: 400 }
      )
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: { message: 'Order sudah dibatalkan' } },
        { status: 400 }
      )
    }

    // Validate amount matches order total
    if (Math.abs(Number(amount) - Number(order.total_amount)) > 1) {
      return NextResponse.json(
        { error: { message: `Amount mismatch. Expected: ${order.total_amount}, Received: ${amount}` } },
        { status: 400 }
      )
    }

    // Create payment transaction record
    console.log('Creating payment transaction')
    const transactionData = {
      order_id: order_id,
      transaction_type: 'payment' as const,
      amount: Number(amount),
      payment_method: method,
      status: 'pending' as const,
      created_at: new Date().toISOString()
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert(transactionData)
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating payment transaction:', transactionError)
      return NextResponse.json(
        { error: { message: 'Failed to create payment transaction: ' + transactionError.message } },
        { status: 500 }
      )
    }

    console.log('Payment transaction created:', transaction.id)

    // Update order payment info
    const orderUpdateData = {
      payment_method: method,
      payment_status: method === 'cash' ? 'pending' : 'processing' as const,
      updated_at: new Date().toISOString()
    }

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update(orderUpdateData)
      .eq('id', order_id)

    if (orderUpdateError) {
      console.error('Error updating order payment info:', orderUpdateError)
    }

    // Generate payment response based on method
    let paymentResponse: any = {
      transaction_id: transaction.id,
      payment_id: transaction.id, // Add payment_id for frontend compatibility
      order_id: order_id,
      amount: amount,
      method: method,
      status: transaction.status
    }

    // For different payment methods, add specific data
    switch (method) {
      case 'cash':
        paymentResponse = {
          ...paymentResponse,
          message: 'Silakan bayar tunai kepada kasir',
          next_step: 'Tunjukkan pesanan ini kepada kasir untuk pembayaran tunai'
        }
        break

      case 'qris':
        // QRIS statis - customer perlu input nominal manual
        paymentResponse = {
          ...paymentResponse,
          qr_code: 'QRIS_STATIC_CODE', // QR code statis cafe
          merchant_name: 'Cirebon Kuring Cafe',
          amount_to_pay: amount,
          formatted_amount: `Rp ${amount.toLocaleString('id-ID')}`,
          message: 'Scan QR code dan masukkan nominal pembayaran',
          next_step: 'Scan QR code dengan aplikasi e-wallet, lalu masukkan nominal yang tertera',
          instructions: [
            'Buka aplikasi e-wallet (GoPay, OVO, Dana, ShopeePay)',
            'Pilih fitur "Bayar" atau "Scan QR"',
            'Scan QR code di bawah ini',
            `Masukkan nominal: Rp ${amount.toLocaleString('id-ID')}`,
            'Konfirmasi pembayaran'
          ]
        }
        break

      case 'transfer':
        // Multiple bank options for transfer
        paymentResponse = {
          ...paymentResponse,
          bank_options: [
            {
              bank_name: 'Bank Central Asia (BCA)',
              account_number: '1234567890',
              account_name: 'Cirebon Kuring Cafe'
            },
            {
              bank_name: 'Bank Mandiri',
              account_number: '0987654321',
              account_name: 'Cirebon Kuring Cafe'
            },
            {
              bank_name: 'Bank Negara Indonesia (BNI)',
              account_number: '5555666677',
              account_name: 'Cirebon Kuring Cafe'
            }
          ],
          amount_to_pay: amount,
          formatted_amount: `Rp ${amount.toLocaleString('id-ID')}`,
          message: 'Transfer ke salah satu rekening berikut',
          next_step: 'Transfer sesuai nominal dan upload bukti pembayaran',
          instructions: [
            'Pilih salah satu bank di bawah ini',
            'Transfer sesuai nominal yang tertera',
            'Simpan bukti transfer',
            'Upload bukti transfer melalui tombol di bawah',
            'Tunggu verifikasi dari kasir'
          ],
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        }
        break

      default:
        paymentResponse = {
          ...paymentResponse,
          message: 'Metode pembayaran tidak tersedia',
          next_step: 'Hubungi kasir untuk bantuan'
        }
    }

    console.log('Payment created successfully:', paymentResponse)
    console.log('Payment ID being returned:', paymentResponse.payment_id)
    console.log('Transaction ID being returned:', paymentResponse.transaction_id)

    return NextResponse.json({
      data: paymentResponse
    })

  } catch (error: any) {
    console.error('Error in payment creation:', error)
    console.error('Error stack:', error.stack)

    return NextResponse.json(
      { error: {
        message: 'Internal server error: ' + (error.message || 'Unknown error'),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }},
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transaction_id')

    if (!transactionId) {
      return NextResponse.json(
        { error: { message: 'Transaction ID is required' } },
        { status: 400 }
      )
    }

    // Get payment transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        orders(id, order_number, total_amount, status, payment_status)
      `)
      .eq('id', transactionId)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: { message: 'Transaction not found' } },
        { status: 404 }
      )
    }

    // Build payment response similar to POST endpoint
    let paymentResponse: any = {
      transaction_id: transaction.id,
      payment_id: transaction.id,
      order_id: transaction.order_id,
      amount: transaction.amount,
      method: transaction.payment_method,
      status: transaction.status,
      created_at: transaction.created_at,
      processed_at: transaction.processed_at
    }

    // Add method-specific data based on payment method
    switch (transaction.payment_method) {
      case 'cash':
        paymentResponse = {
          ...paymentResponse,
          message: 'Silakan bayar tunai kepada kasir',
          next_step: 'Tunjukkan pesanan ini kepada kasir untuk pembayaran tunai'
        }
        break

      case 'qris':
        // QRIS statis - customer perlu input nominal manual
        paymentResponse = {
          ...paymentResponse,
          qr_code: 'QRIS_STATIC_CODE', // QR code statis cafe
          merchant_name: 'Cirebon Kuring Cafe',
          amount_to_pay: transaction.amount,
          formatted_amount: `Rp ${transaction.amount.toLocaleString('id-ID')}`,
          message: 'Scan QR code dan masukkan nominal pembayaran',
          next_step: 'Scan QR code dengan aplikasi e-wallet, lalu masukkan nominal yang tertera',
          instructions: [
            'Buka aplikasi e-wallet (GoPay, OVO, Dana, ShopeePay)',
            'Pilih fitur "Bayar" atau "Scan QR"',
            'Scan QR code di bawah ini',
            `Masukkan nominal: Rp ${transaction.amount.toLocaleString('id-ID')}`,
            'Konfirmasi pembayaran'
          ]
        }
        break

      case 'transfer':
        // Multiple bank options for transfer
        paymentResponse = {
          ...paymentResponse,
          bank_options: [
            {
              bank_name: 'Bank Central Asia (BCA)',
              account_number: '1234567890',
              account_name: 'Cirebon Kuring Cafe'
            },
            {
              bank_name: 'Bank Mandiri',
              account_number: '0987654321',
              account_name: 'Cirebon Kuring Cafe'
            },
            {
              bank_name: 'Bank Negara Indonesia (BNI)',
              account_number: '5555666677',
              account_name: 'Cirebon Kuring Cafe'
            }
          ],
          amount_to_pay: transaction.amount,
          formatted_amount: `Rp ${transaction.amount.toLocaleString('id-ID')}`,
          message: 'Transfer ke salah satu rekening berikut',
          next_step: 'Transfer sesuai nominal dan upload bukti pembayaran',
          instructions: [
            'Pilih salah satu bank di bawah ini',
            'Transfer sesuai nominal yang tertera',
            'Simpan bukti transfer',
            'Upload bukti transfer melalui tombol di bawah',
            'Tunggu verifikasi dari kasir'
          ],
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        }
        break

      case 'card':
        paymentResponse = {
          ...paymentResponse,
          message: 'Bayar dengan kartu di kasir',
          next_step: 'Datang ke kasir untuk pembayaran kartu'
        }
        break

      default:
        paymentResponse = {
          ...paymentResponse,
          message: 'Metode pembayaran tidak tersedia',
          next_step: 'Hubungi kasir untuk bantuan'
        }
    }

    console.log('GET Payment response built:', paymentResponse)

    return NextResponse.json({
      data: paymentResponse
    })

  } catch (error) {
    console.error('Error fetching payment transaction:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}