import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch promo analytics and usage data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    console.log('Fetching promo analytics:', id)

    // Get promo details
    const { data: promo, error: promoError } = await supabase
      .from('promos')
      .select('*')
      .eq('id', id)
      .single()

    if (promoError || !promo) {
      return NextResponse.json({ error: 'Promo not found' }, { status: 404 })
    }

    // Get usage data with order details
    const { data: usageData, error: usageError } = await supabase
      .from('promo_usage')
      .select(`
        *,
        orders (
          total_amount,
          subtotal
        )
      `)
      .eq('promo_id', id)
      .order('used_at', { ascending: false })

    if (usageError) {
      console.error('Error fetching usage data:', usageError)
      return NextResponse.json({ error: usageError.message }, { status: 500 })
    }

    // Transform usage data to include order_amount and final_amount
    const transformedUsageData = usageData?.map((usage: any) => ({
      ...usage,
      order_amount: usage.orders?.subtotal || usage.orders?.total_amount || 0,
      final_amount: (usage.orders?.total_amount || 0)
    })) || []

    // Calculate analytics
    const totalUses = usageData?.length || 0
    const totalDiscount = usageData?.reduce((sum, usage) => sum + parseFloat(usage.discount_amount || 0), 0) || 0
    const avgDiscount = totalUses > 0 ? totalDiscount / totalUses : 0

    // Get usage by date (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const usageByDate = transformedUsageData?.reduce((acc: any, usage) => {
      const date = new Date(usage.used_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          uses: 0,
          discount: 0
        }
      }
      acc[date].uses += 1
      acc[date].discount += parseFloat(usage.discount_amount || 0)
      return acc
    }, {}) || {}

    const usageTimeline = Object.values(usageByDate).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Unique customers
    const uniqueCustomers = new Set(
      transformedUsageData?.map(u => u.customer_phone || u.customer_email).filter(Boolean)
    ).size

    return NextResponse.json({
      data: {
        promo,
        analytics: {
          total_uses: totalUses,
          total_discount: totalDiscount,
          average_discount: avgDiscount,
          unique_customers: uniqueCustomers,
          usage_timeline: usageTimeline,
          recent_usage: transformedUsageData?.slice(0, 10) || []
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
