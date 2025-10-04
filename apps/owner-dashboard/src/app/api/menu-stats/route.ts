import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    const [itemsResponse, categoriesResponse] = await Promise.all([
      supabase
        .from('menu_items')
        .select('is_available'),
      supabase
        .from('menu_categories')
        .select('id')
        .eq('is_active', true)
    ])

    if (itemsResponse.error) throw itemsResponse.error
    if (categoriesResponse.error) throw categoriesResponse.error

    const items = itemsResponse.data || []
    const categories = categoriesResponse.data || []

    const availableItems = items.filter(item => item.is_available).length
    const unavailableItems = items.length - availableItems

    return NextResponse.json({
      data: {
        totalItems: items.length,
        availableItems,
        unavailableItems,
        categories: categories.length
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}