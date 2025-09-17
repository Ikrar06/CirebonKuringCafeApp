import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client with service role key
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const body = await request.json()
    const { payment_method } = body

    if (!orderId || !payment_method) {
      return NextResponse.json(
        { error: { message: 'Order ID and payment method are required' } },
        { status: 400 }
      )
    }

    console.log('Updating payment method for order:', orderId, 'to:', payment_method)

    // Update order with payment method
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        payment_method: payment_method,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('Error updating payment method:', error)
      return NextResponse.json(
        { error: { message: 'Failed to update payment method', details: error.message } },
        { status: 500 }
      )
    }

    console.log('Payment method updated successfully:', order)

    return NextResponse.json({
      success: true,
      message: 'Payment method updated successfully',
      data: order
    })

  } catch (error: any) {
    console.error('Error in update payment method API:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', details: error.message || 'Unknown error' } },
      { status: 500 }
    )
  }
}