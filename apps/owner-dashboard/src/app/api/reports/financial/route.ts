import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch financial report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    console.log('Generating financial report:', { startDate, endDate })

    // Get orders (revenue)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .in('status', ['confirmed', 'preparing', 'ready', 'delivered', 'completed'])

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Get cash reconciliation records
    const { data: reconciliations, error: reconciliationsError } = await supabase
      .from('cash_reconciliation')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (reconciliationsError) {
      console.error('Error fetching reconciliations:', reconciliationsError)
    }

    // Get purchase orders (expenses)
    const { data: purchaseOrders, error: purchaseOrdersError } = await supabase
      .from('purchase_orders')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)

    if (purchaseOrdersError) {
      console.error('Error fetching purchase orders:', purchaseOrdersError)
    }

    // Calculate revenue metrics
    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0
    const cashRevenue = orders?.filter(o => o.payment_method === 'cash').reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0
    const digitalRevenue = orders?.filter(o => o.payment_method !== 'cash').reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0
    const totalDiscount = orders?.reduce((sum, order) => sum + parseFloat(order.discount_amount || 0), 0) || 0

    // Calculate expenses
    const totalPurchases = purchaseOrders?.reduce((sum, po) => sum + parseFloat(po.total_amount || 0), 0) || 0

    // Calculate profit (simplified - revenue minus purchases)
    const grossProfit = totalRevenue - totalPurchases

    // Cash flow from reconciliations
    const totalCashHandled = reconciliations?.reduce((sum, rec) => sum + parseFloat(rec.actual_cash || 0), 0) || 0
    const totalVariance = reconciliations?.reduce((sum, rec) => sum + parseFloat(rec.variance || 0), 0) || 0

    // Daily financial data
    const dailyFinancials = orders?.reduce((acc: any, order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          revenue: 0,
          cash: 0,
          digital: 0,
          orders: 0
        }
      }
      const amount = parseFloat(order.total_amount || 0)
      acc[date].revenue += amount
      acc[date].orders += 1
      if (order.payment_method === 'cash') {
        acc[date].cash += amount
      } else {
        acc[date].digital += amount
      }
      return acc
    }, {})

    const dailyTrend = Object.values(dailyFinancials || {}).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Payment method breakdown
    const paymentBreakdown = orders?.reduce((acc: any, order) => {
      const method = order.payment_method || 'unknown'
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 }
      }
      acc[method].count += 1
      acc[method].total += parseFloat(order.total_amount || 0)
      return acc
    }, {})

    // Format table data - daily summary
    const dailyRecords = Object.values(dailyFinancials || {}).map((day: any) => ({
      'Date': new Date(day.date).toLocaleDateString('id-ID'),
      'Orders': day.orders,
      'Revenue': day.revenue,
      'Cash': day.cash,
      'Digital': day.digital,
      'Net Revenue': day.revenue
    }))

    // Get previous period for comparison
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    const prevStartDate = new Date(new Date(startDate).getTime() - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const prevEndDate = new Date(new Date(endDate).getTime() - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: prevOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', `${prevStartDate}T00:00:00`)
      .lte('created_at', `${prevEndDate}T23:59:59`)
      .in('status', ['confirmed', 'preparing', 'ready', 'delivered', 'completed'])

    const prevRevenue = prevOrders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

    return NextResponse.json({
      data: {
        summary: [
          {
            label: 'Total Revenue',
            value: totalRevenue,
            format: 'currency',
            change: Math.round(revenueChange),
            bgColor: 'bg-blue-100',
            color: 'text-blue-600'
          },
          {
            label: 'Gross Profit',
            value: grossProfit,
            format: 'currency',
            bgColor: 'bg-green-100',
            color: 'text-green-600'
          },
          {
            label: 'Total Expenses',
            value: totalPurchases,
            format: 'currency',
            bgColor: 'bg-orange-100',
            color: 'text-orange-600'
          },
          {
            label: 'Cash Variance',
            value: totalVariance,
            format: 'currency',
            bgColor: 'bg-purple-100',
            color: 'text-purple-600'
          }
        ],
        table: dailyRecords.slice(0, 50),
        columns: ['Date', 'Orders', 'Revenue', 'Cash', 'Digital', 'Net Revenue'],
        chart: {
          daily: dailyTrend,
          paymentMethods: paymentBreakdown
        },
        stats: {
          totalRevenue,
          cashRevenue,
          digitalRevenue,
          totalPurchases,
          grossProfit,
          totalDiscount,
          totalCashHandled,
          totalVariance,
          paymentBreakdown
        }
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
