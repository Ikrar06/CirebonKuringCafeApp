import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch sales report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    console.log('Generating sales report:', { startDate, endDate })

    // Get orders within date range
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .in('status', ['confirmed', 'preparing', 'ready', 'delivered', 'completed'])
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Calculate summary metrics
    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0
    const totalOrders = orders?.length || 0
    const totalDiscount = orders?.reduce((sum, order) => sum + parseFloat(order.discount_amount || 0), 0) || 0
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Group by payment method
    const paymentMethodStats = orders?.reduce((acc: any, order) => {
      const method = order.payment_method || 'unknown'
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 }
      }
      acc[method].count += 1
      acc[method].total += parseFloat(order.total_amount || 0)
      return acc
    }, {})

    // Group by order type
    const orderTypeStats = orders?.reduce((acc: any, order) => {
      const type = order.order_type || 'dine_in'
      if (!acc[type]) {
        acc[type] = { count: 0, total: 0 }
      }
      acc[type].count += 1
      acc[type].total += parseFloat(order.total_amount || 0)
      return acc
    }, {})

    // Daily revenue trend
    const dailyRevenue = orders?.reduce((acc: any, order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          revenue: 0,
          orders: 0,
          discount: 0
        }
      }
      acc[date].revenue += parseFloat(order.total_amount || 0)
      acc[date].orders += 1
      acc[date].discount += parseFloat(order.discount_amount || 0)
      return acc
    }, {})

    const dailyTrend = Object.values(dailyRevenue).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

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
    const ordersChange = (prevOrders?.length || 0) > 0 ? ((totalOrders - (prevOrders?.length || 0)) / (prevOrders?.length || 0)) * 100 : 0

    // Format table data
    const tableData = orders?.slice(0, 50).map(order => ({
      'Order Number': order.order_number,
      'Date': new Date(order.created_at).toLocaleDateString('id-ID'),
      'Customer': order.customer_name || '-',
      'Type': order.order_type || 'dine_in',
      'Payment': order.payment_method || '-',
      'Subtotal': parseFloat(order.subtotal || 0),
      'Discount': parseFloat(order.discount_amount || 0),
      'Total Amount': parseFloat(order.total_amount || 0),
      'Status': order.status
    }))

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
            label: 'Total Orders',
            value: totalOrders,
            change: Math.round(ordersChange),
            bgColor: 'bg-green-100',
            color: 'text-green-600'
          },
          {
            label: 'Average Order',
            value: averageOrderValue,
            format: 'currency',
            bgColor: 'bg-purple-100',
            color: 'text-purple-600'
          },
          {
            label: 'Total Discount',
            value: totalDiscount,
            format: 'currency',
            bgColor: 'bg-orange-100',
            color: 'text-orange-600'
          }
        ],
        table: tableData,
        columns: ['Order Number', 'Date', 'Customer', 'Type', 'Payment', 'Subtotal', 'Discount', 'Total Amount', 'Status'],
        chart: {
          daily: dailyTrend,
          paymentMethods: paymentMethodStats,
          orderTypes: orderTypeStats
        },
        stats: {
          totalRevenue,
          totalOrders,
          totalDiscount,
          averageOrderValue,
          paymentMethods: paymentMethodStats,
          orderTypes: orderTypeStats
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
