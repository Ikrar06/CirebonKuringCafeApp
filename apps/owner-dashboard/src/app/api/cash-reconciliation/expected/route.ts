import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Calculate expected cash amount from orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    console.log('Calculating expected cash for date:', date)

    // Get all completed orders for the date with cash payment
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, payment_method, status')
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`)
      .eq('payment_method', 'cash')
      .in('status', ['confirmed', 'preparing', 'ready', 'delivered', 'completed'])

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Found ${orders?.length || 0} cash orders for ${date}`)

    // Calculate total cash sales
    const cashSales = orders?.reduce((sum, order) => {
      return sum + parseFloat(order.total_amount || 0)
    }, 0) || 0

    // Get starting cash (modal) - you can make this configurable
    const startingCash = 500000 // Default Rp 500,000

    // Calculate expected amount
    const expectedAmount = startingCash + cashSales

    return NextResponse.json({
      data: {
        date,
        starting_cash: startingCash,
        cash_sales: cashSales,
        expected_amount: expectedAmount,
        total_orders: orders?.length || 0
      }
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
