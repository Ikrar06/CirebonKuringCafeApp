import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch settings by category and/or key
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const key = searchParams.get('key')

    let query = supabase.from('system_settings').select('*')

    if (category) {
      query = query.eq('category', category)
    }

    if (key) {
      query = query.eq('key', key)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
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

// PUT - Update setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, value } = body

    console.log('=== UPDATE SETTING REQUEST ===')
    console.log('ID:', id)
    console.log('Value:', JSON.stringify(value, null, 2))

    if (!id || !value) {
      return NextResponse.json(
        { error: 'ID and value are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('system_settings')
      .update({
        value,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating setting:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('=== UPDATE SUCCESS ===')
    console.log('Updated data:', JSON.stringify(data, null, 2))

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
