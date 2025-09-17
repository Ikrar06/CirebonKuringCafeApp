import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// TEMPORARY API ENDPOINT - DELETE WHEN IMPLEMENTING ACTUAL ADMIN DASHBOARD
// This endpoint is only for testing the temp payment approval page

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching orders from database...');

    // First, let's get all orders to see what we have
    const { data: allOrders, error: allError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('All orders from database:', allOrders);
    console.log('Error if any:', allError);

    // Fetch orders with payment proofs
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        table_id,
        customer_name,
        customer_phone,
        status,
        total_amount,
        payment_method,
        payment_proof_url,
        session_id,
        created_at,
        order_items (
          id,
          menu_item_id,
          item_name,
          item_price,
          quantity,
          customizations,
          customization_price
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log('Fetched orders:', orders);
    console.log('Query error:', error);

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      debug: {
        totalOrders: allOrders?.length || 0,
        ordersWithProof: orders?.filter(o => o.payment_proof_url)?.length || 0
      }
    });

  } catch (error) {
    console.error('Error in pending orders API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}