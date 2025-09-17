import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// TEMPORARY API ENDPOINT - DELETE WHEN IMPLEMENTING ACTUAL ADMIN DASHBOARD
// This endpoint is only for testing the temp payment approval page

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Approve API called...');
    const body = await request.json();
    console.log('Request body:', body);

    const { orderId, status } = body;

    if (!orderId || !status) {
      console.log('Missing orderId or status:', { orderId, status });
      return NextResponse.json(
        { error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status - use actual enum values from database
    const validStatuses = ['pending_payment', 'payment_verification', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      console.log('Invalid status:', status);
      return NextResponse.json(
        { error: `Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    console.log('Updating order:', orderId, 'to status:', status);

    // Update order status and payment status
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // If approving (status = confirmed), also update payment_status and set verified timestamp
    if (status === 'confirmed') {
      updateData.payment_status = 'verified';
      updateData.payment_verified_at = new Date().toISOString();
      updateData.confirmed_at = new Date().toISOString(); // Also set confirmed_at timestamp
    }
    // If rejecting (status = pending_payment), reset payment_status
    else if (status === 'pending_payment') {
      updateData.payment_status = 'pending';
      updateData.payment_verified_at = null;
      updateData.confirmed_at = null; // Clear confirmed_at when rejecting
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    console.log('Supabase update result:', { data, error });

    if (error) {
      console.error('Error updating order status:', error);
      return NextResponse.json(
        { error: 'Failed to update order status', details: error.message },
        { status: 500 }
      );
    }

    // Also update payment_transactions table if exists
    try {
      console.log('Updating payment_transactions...');
      const paymentResult = await supabase
        .from('payment_transactions')
        .update({
          status: status === 'confirmed' ? 'completed' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);
      console.log('Payment transaction update result:', paymentResult);
    } catch (paymentError) {
      console.warn('Could not update payment_transactions:', paymentError);
      // Not critical, continue
    }

    console.log('API success, returning response...');
    return NextResponse.json({
      success: true,
      message: `Order ${status === 'confirmed' ? 'approved' : 'updated'} successfully`,
      order: data
    });

  } catch (error) {
    console.error('Error in approve order API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}