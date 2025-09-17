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
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params


    if (!orderId) {
      return NextResponse.json(
        { error: { message: 'Order ID is required' } },
        { status: 400 }
      )
    }

    // Get order with basic details including payment_verified_at
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        payment_verified_at,
        confirmed_at,
        preparing_at,
        ready_at,
        delivered_at,
        completed_at,
        cancelled_at,
        customer_name,
        table_id,
        tables(table_number)
      `)
      .eq('id', orderId)
      .single()

    console.log('Database query result:', { order, orderError })

    if (orderError || !order) {
      console.log('Order not found error:', orderError)
      return NextResponse.json(
        { error: { message: 'Order not found', details: orderError?.message } },
        { status: 404 }
      )
    }

    // Calculate estimated completion (default to 30 minutes from order creation)
    let estimatedCompletion: string | null = null
    if (order.created_at) {
      const createdAt = new Date(order.created_at)
      estimatedCompletion = new Date(createdAt.getTime() + 30 * 60 * 1000).toISOString()
    }

    // Generate comprehensive progress steps based on order status and timestamps
    // Correct chronological flow: created_at → payment_verified_at → confirmed_at → preparing_at → ready_at → delivered_at → completed_at
    const progressSteps = []

    // Step 1: Order Created (when customer creates order)
    progressSteps.push({
      step: 'Pesanan Diterima',
      completed: true,
      timestamp: order.created_at
    })

    // Step 2: Payment Verification
    if (order.status === 'pending_payment') {
      progressSteps.push({
        step: 'Menunggu Pembayaran',
        completed: false
      })
    } else if (order.status === 'payment_verification') {
      progressSteps.push({
        step: 'Menunggu Verifikasi Pembayaran',
        completed: false
      })
    } else {
      // Payment verified by staff
      progressSteps.push({
        step: 'Pembayaran Diverifikasi',
        completed: true,
        timestamp: order.payment_verified_at
      })
    }

    // Step 3: Kitchen Confirmation
    if (['confirmed', 'preparing', 'ready', 'delivered', 'completed'].includes(order.status)) {
      progressSteps.push({
        step: 'Pesanan Dikonfirmasi Dapur',
        completed: true,
        timestamp: order.confirmed_at
      })
    } else if (order.status === 'payment_verification') {
      progressSteps.push({
        step: 'Menunggu Konfirmasi Dapur',
        completed: false
      })
    }

    // Step 4: Kitchen Preparation
    if (['preparing', 'ready', 'delivered', 'completed'].includes(order.status)) {
      progressSteps.push({
        step: 'Sedang Diproses di Dapur',
        completed: true,
        timestamp: order.preparing_at
      })
    } else if (order.status === 'confirmed') {
      progressSteps.push({
        step: 'Menunggu Diproses di Dapur',
        completed: false
      })
    }

    // Step 5: Ready for Serving
    if (['ready', 'delivered', 'completed'].includes(order.status)) {
      progressSteps.push({
        step: 'Siap Disajikan',
        completed: true,
        timestamp: order.ready_at
      })
    } else if (order.status === 'preparing') {
      progressSteps.push({
        step: 'Akan Segera Siap',
        completed: false
      })
    }

    // Step 6: Delivery/Service
    if (['delivered', 'completed'].includes(order.status)) {
      progressSteps.push({
        step: 'Diantar ke Meja',
        completed: true,
        timestamp: order.delivered_at
      })
    } else if (['ready'].includes(order.status)) {
      progressSteps.push({
        step: 'Menunggu Diantar',
        completed: false
      })
    }

    // Step 7: Completed
    if (order.status === 'completed') {
      progressSteps.push({
        step: 'Pesanan Selesai',
        completed: true,
        timestamp: order.completed_at
      })
    } else if (['delivered'].includes(order.status)) {
      progressSteps.push({
        step: 'Menunggu Konfirmasi Selesai',
        completed: false
      })
    }

    // Handle cancelled orders
    if (order.status === 'cancelled') {
      progressSteps.push({
        step: 'Pesanan Dibatalkan',
        completed: true,
        timestamp: order.cancelled_at
      })
    }

    const response = {
      id: order.id,
      status: order.status,
      estimated_completion: estimatedCompletion,
      progress_steps: progressSteps
    }

    return NextResponse.json({
      data: response
    })

  } catch (error: any) {
    console.error('Error fetching order status:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error: ' + (error.message || 'Unknown error') } },
      { status: 500 }
    )
  }
}