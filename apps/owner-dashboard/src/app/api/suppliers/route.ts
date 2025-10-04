import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const is_active = searchParams.get('is_active')
    const is_preferred = searchParams.get('is_preferred')
    const search = searchParams.get('search')

    let query = supabase
      .from('suppliers')
      .select('*')
      .order('company_name')

    if (is_active !== null && is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (is_preferred !== null && is_preferred !== undefined) {
      query = query.eq('is_preferred', is_preferred === 'true')
    }

    if (search) {
      query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.company_name || !body.phone_primary) {
      return NextResponse.json(
        { error: 'Missing required fields: company_name, phone_primary' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([{
        ...body,
        is_active: true
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}