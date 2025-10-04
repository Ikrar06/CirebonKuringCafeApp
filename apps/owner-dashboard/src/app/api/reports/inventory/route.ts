import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch inventory report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    console.log('Generating inventory report:', { startDate, endDate })

    // Get all ingredients with current stock
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true })

    if (ingredientsError) {
      console.error('Error fetching ingredients:', ingredientsError)
      return NextResponse.json({ error: ingredientsError.message }, { status: 500 })
    }

    // Get stock movements within date range
    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false })

    if (movementsError) {
      console.error('Error fetching movements:', movementsError)
      return NextResponse.json({ error: movementsError.message }, { status: 500 })
    }

    // Calculate summary metrics
    const totalIngredients = ingredients?.length || 0
    const lowStockCount = ingredients?.filter(ing =>
      parseFloat(ing.current_stock || 0) <= parseFloat(ing.min_stock_level || 0)
    ).length || 0
    const outOfStockCount = ingredients?.filter(ing =>
      parseFloat(ing.current_stock || 0) === 0
    ).length || 0
    const totalMovements = movements?.length || 0

    // Calculate stock value
    const totalStockValue = ingredients?.reduce((sum, ing) =>
      sum + (parseFloat(ing.current_stock || 0) * parseFloat(ing.unit_cost || 0))
    , 0) || 0

    // Group movements by type
    const movementsByType = movements?.reduce((acc: any, mov) => {
      const type = mov.movement_type
      if (!acc[type]) {
        acc[type] = { count: 0, quantity: 0 }
      }
      acc[type].count += 1
      acc[type].quantity += parseFloat(mov.quantity || 0)
      return acc
    }, {})

    // Daily stock movements
    const dailyMovements = movements?.reduce((acc: any, mov) => {
      const date = new Date(mov.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          in: 0,
          out: 0,
          adjustment: 0,
          wastage: 0
        }
      }
      const qty = parseFloat(mov.quantity || 0)
      if (mov.movement_type === 'in' || mov.movement_type === 'purchase') {
        acc[date].in += qty
      } else if (mov.movement_type === 'out' || mov.movement_type === 'usage') {
        acc[date].out += qty
      } else if (mov.movement_type === 'adjustment') {
        acc[date].adjustment += qty
      } else if (mov.movement_type === 'wastage') {
        acc[date].wastage += qty
      }
      return acc
    }, {})

    const dailyTrend = Object.values(dailyMovements).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Get ingredient names for movements
    const movementsWithNames = await Promise.all(
      (movements?.slice(0, 50) || []).map(async (mov: any) => {
        const { data: ingredient } = await supabase
          .from('ingredients')
          .select('name')
          .eq('id', mov.ingredient_id)
          .single()

        return {
          'Date': new Date(mov.created_at).toLocaleDateString('id-ID'),
          'Ingredient': ingredient?.name || '-',
          'Type': mov.movement_type,
          'Quantity': `${parseFloat(mov.quantity || 0)} ${mov.unit || ''}`,
          'Reason': mov.reason || '-',
          'Reference': mov.reference_number || '-'
        }
      })
    )

    return NextResponse.json({
      data: {
        summary: [
          {
            label: 'Total Ingredients',
            value: totalIngredients,
            bgColor: 'bg-blue-100',
            color: 'text-blue-600'
          },
          {
            label: 'Low Stock Items',
            value: lowStockCount,
            bgColor: 'bg-orange-100',
            color: 'text-orange-600'
          },
          {
            label: 'Out of Stock',
            value: outOfStockCount,
            bgColor: 'bg-red-100',
            color: 'text-red-600'
          },
          {
            label: 'Stock Value',
            value: totalStockValue,
            format: 'currency',
            bgColor: 'bg-green-100',
            color: 'text-green-600'
          }
        ],
        table: movementsWithNames,
        columns: ['Date', 'Ingredient', 'Type', 'Quantity', 'Reason', 'Reference'],
        chart: {
          daily: dailyTrend,
          byType: movementsByType
        },
        stats: {
          totalIngredients,
          lowStockCount,
          outOfStockCount,
          totalStockValue,
          totalMovements,
          movementsByType
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
