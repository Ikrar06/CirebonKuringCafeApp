import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch all tables
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('table_number', { ascending: true })

    if (error) {
      console.error('Error fetching tables:', error)
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

// POST - Create new table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      table_number,
      capacity,
      zone,
      floor,
      position_x,
      position_y,
      notes
    } = body

    if (!table_number || !capacity) {
      return NextResponse.json(
        { error: 'Table number and capacity are required' },
        { status: 400 }
      )
    }

    // Generate QR code ID
    const qr_code_id = `QR${String(table_number).padStart(3, '0')}`

    const { data, error } = await supabase
      .from('tables')
      .insert({
        table_number,
        qr_code_id,
        capacity,
        zone: zone || 'indoor',
        floor: floor || '1',
        position_x,
        position_y,
        status: 'available',
        is_active: true,
        notes
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating table:', error)
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
