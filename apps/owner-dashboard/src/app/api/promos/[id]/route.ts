import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch single promo by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    console.log('Fetching promo by ID:', id)

    const { data: promo, error } = await supabase
      .from('promos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching promo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!promo) {
      return NextResponse.json({ error: 'Promo not found' }, { status: 404 })
    }

    return NextResponse.json({ data: promo })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update promo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    console.log('Updating promo:', id)

    // Check if promo exists
    const { data: existing } = await supabase
      .from('promos')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Promo not found' }, { status: 404 })
    }

    // If updating code, check if new code already exists
    if (body.code) {
      const { data: codeExists } = await supabase
        .from('promos')
        .select('id')
        .eq('code', body.code)
        .neq('id', id)
        .single()

      if (codeExists) {
        return NextResponse.json(
          { error: 'Promo code already exists' },
          { status: 400 }
        )
      }
    }

    // Update promo
    const { data: promo, error } = await supabase
      .from('promos')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating promo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: promo })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete promo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    console.log('Deleting promo:', id)

    // Check if promo exists
    const { data: existing } = await supabase
      .from('promos')
      .select('id, current_uses')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Promo not found' }, { status: 404 })
    }

    // Optionally: Prevent deletion if promo has been used
    if (existing.current_uses > 0) {
      return NextResponse.json(
        { error: 'Cannot delete promo that has been used. Consider deactivating instead.' },
        { status: 400 }
      )
    }

    // Delete promo
    const { error } = await supabase
      .from('promos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting promo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
