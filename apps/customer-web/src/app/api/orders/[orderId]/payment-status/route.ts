import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client with service role key
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

    console.log('Checking payment status for order via API:', orderId)

    // Get order status to check if payment is verified
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, payment_status, status, order_number')
      .eq('id', orderId)
      .single()

    console.log('Payment status API result:', { order, error })

    if (error) {
      console.error('Error fetching order payment status:', error)
      return NextResponse.json(
        { error: { message: 'Order not found', details: error.message } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        id: order.id,
        payment_status: order.payment_status,
        status: order.status,
        order_number: order.order_number
      }
    })

  } catch (error: any) {
    console.error('Error in payment status API:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', details: error.message || 'Unknown error' } },
      { status: 500 }
    )
  }
}