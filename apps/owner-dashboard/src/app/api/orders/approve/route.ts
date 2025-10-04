import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('Approve API called...')
    const body = await request.json()
    console.log('Request body:', body)

    const { orderId, status } = body

    if (!orderId || !status) {
      console.log('Missing orderId or status:', { orderId, status })
      return NextResponse.json(
        { error: 'Order ID and status are required' },
        { status: 400 }
      )
    }

    // Validate status - use actual enum values from database
    const validStatuses = ['pending_payment', 'payment_verification', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      console.log('Invalid status:', status)
      return NextResponse.json(
        { error: `Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('Updating order:', orderId, 'to status:', status)

    // Update order status and payment status
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    }

    // If approving (status = confirmed), also update payment_status and set verified timestamp
    if (status === 'confirmed') {
      updateData.payment_status = 'verified'
      updateData.payment_verified_at = new Date().toISOString()
      updateData.confirmed_at = new Date().toISOString()
    }
    // If preparing, set preparing timestamp
    else if (status === 'preparing') {
      updateData.preparing_at = new Date().toISOString()
    }
    // If ready, set ready timestamp
    else if (status === 'ready') {
      updateData.ready_at = new Date().toISOString()
    }
    // If delivered, set delivered timestamp
    else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }
    // If completed, set completed timestamp
    else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
    // If rejecting (status = pending_payment), reset payment_status
    else if (status === 'pending_payment') {
      updateData.payment_status = 'pending'
      updateData.payment_verified_at = null
      updateData.confirmed_at = null
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    console.log('Supabase update result:', { data, error })

    if (error) {
      console.error('Error updating order status:', error)
      return NextResponse.json(
        { error: 'Failed to update order status', details: error.message },
        { status: 500 }
      )
    }

    // Also update payment_transactions table if exists
    try {
      console.log('Updating payment_transactions...')
      const paymentResult = await supabase
        .from('payment_transactions')
        .update({
          status: status === 'confirmed' ? 'success' : status === 'cancelled' ? 'failed' : 'pending',
          processed_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
      console.log('Payment transaction update result:', paymentResult)
    } catch (paymentError) {
      console.warn('Could not update payment_transactions:', paymentError)
      // Not critical, continue
    }

    // Update table status if order is completed
    if (status === 'completed' && data.table_id) {
      try {
        console.log('Checking if table should be marked as available...')

        // Check if there are any other active orders for this table
        const { data: otherOrders, error: checkError } = await supabase
          .from('orders')
          .select('id')
          .eq('table_id', data.table_id)
          .not('id', 'eq', orderId)
          .not('status', 'in', '(completed,cancelled)')

        if (checkError) {
          console.error('Error checking other orders:', checkError)
        } else if (!otherOrders || otherOrders.length === 0) {
          // No other active orders, mark table as available
          console.log('No other active orders, marking table as available')

          const { error: tableError } = await supabase
            .from('tables')
            .update({
              status: 'available',
              current_session_id: null,
              occupied_since: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.table_id)

          if (tableError) {
            console.error('Error updating table status:', tableError)
          } else {
            console.log('Table marked as available successfully')
          }
        } else {
          console.log(`Table still has ${otherOrders.length} active orders, keeping as occupied`)
        }
      } catch (tableUpdateError) {
        console.warn('Could not update table status:', tableUpdateError)
        // Not critical, continue
      }
    }

    console.log('API success, returning response...')
    return NextResponse.json({
      success: true,
      message: `Order ${status === 'confirmed' ? 'approved' : 'updated'} successfully`,
      order: data
    })

  } catch (error: any) {
    console.error('Error in approve order API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
