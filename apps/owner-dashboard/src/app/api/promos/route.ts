import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch all promos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // active, inactive
    const type = searchParams.get('type')

    console.log('Fetching promos...', { status, type })

    let query = supabase
      .from('promos')
      .select('*')
      .order('created_at', { ascending: false })

    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    if (type) {
      query = query.eq('promo_type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching promos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Found ${data?.length || 0} promos`)
    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new promo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      code,
      description,
      promo_type,
      discount_value,
      max_discount_amount,
      min_purchase_amount,
      applicable_categories,
      applicable_items,
      buy_quantity,
      buy_items,
      get_quantity,
      get_items,
      get_discount_percentage,
      bundle_items,
      bundle_price,
      valid_from,
      valid_until,
      valid_days,
      valid_from_time,
      valid_until_time,
      max_uses_total,
      max_uses_per_customer,
      is_active,
      is_stackable,
      excluded_promos
    } = body

    console.log('Creating promo...', { name, code, promo_type })

    // Validate required fields
    if (!name || !promo_type || discount_value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, promo_type, discount_value' },
        { status: 400 }
      )
    }

    // Check if code already exists (if provided)
    if (code) {
      const { data: existing } = await supabase
        .from('promos')
        .select('id')
        .eq('code', code)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Promo code already exists' },
          { status: 400 }
        )
      }
    }

    // Create promo
    const { data: promo, error } = await supabase
      .from('promos')
      .insert({
        name,
        code: code || null,
        description,
        promo_type,
        discount_value,
        max_discount_amount: max_discount_amount || null,
        min_purchase_amount: min_purchase_amount || null,
        applicable_categories: applicable_categories || null,
        applicable_items: applicable_items || null,
        buy_quantity: buy_quantity || null,
        buy_items: buy_items || null,
        get_quantity: get_quantity || null,
        get_items: get_items || null,
        get_discount_percentage: get_discount_percentage || null,
        bundle_items: bundle_items || null,
        bundle_price: bundle_price || null,
        valid_from: valid_from || null,
        valid_until: valid_until || null,
        valid_days: valid_days || null,
        valid_from_time: valid_from_time || null,
        valid_until_time: valid_until_time || null,
        max_uses_total: max_uses_total || null,
        max_uses_per_customer: max_uses_per_customer || null,
        current_uses: 0,
        is_active: is_active !== false,
        is_stackable: is_stackable || false,
        excluded_promos: excluded_promos || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating promo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: promo }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
