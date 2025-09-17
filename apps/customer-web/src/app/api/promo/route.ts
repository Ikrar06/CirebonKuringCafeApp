import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET PROMOS API START ===')

    const { data: promos, error } = await (supabase as any)
      .from('promos')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    console.log('Promos query result:', { promos, error })

    if (error) {
      console.error('Error fetching promos:', error)
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: promos || []
    })

  } catch (error: any) {
    console.error('Error in promos API:', error)
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch promos' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== VALIDATE PROMO API START ===')

    const body = await request.json()
    const { code, order_total } = body

    console.log('Validating promo:', { code, order_total })

    if (!code) {
      return NextResponse.json(
        { error: { message: 'Promo code is required' } },
        { status: 400 }
      )
    }

    const { data: promo, error } = await (supabase as any)
      .from('promos')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    console.log('Promo validation result:', { promo, error })

    if (error || !promo) {
      return NextResponse.json(
        { error: { message: 'Kode promo tidak ditemukan' } },
        { status: 404 }
      )
    }

    // Check minimum purchase amount
    if (promo.min_purchase_amount && order_total < promo.min_purchase_amount) {
      return NextResponse.json(
        { error: {
          message: `Minimum pembelian Rp ${promo.min_purchase_amount.toLocaleString('id-ID')}`
        } },
        { status: 400 }
      )
    }

    // Check usage limits
    if (promo.max_uses_total && promo.current_uses >= promo.max_uses_total) {
      return NextResponse.json(
        { error: { message: 'Promo telah mencapai batas maksimal penggunaan' } },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: promo
    })

  } catch (error: any) {
    console.error('Error in promo validation API:', error)
    return NextResponse.json(
      { error: { message: error.message || 'Failed to validate promo' } },
      { status: 500 }
    )
  }
}