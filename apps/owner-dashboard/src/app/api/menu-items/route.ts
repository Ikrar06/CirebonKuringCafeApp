import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { ingredients, customization_groups, ...menuItemData } = body

    // Generate slug if not provided
    const slug = menuItemData.slug || menuItemData.name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)

    const dataWithSlug = {
      ...menuItemData,
      slug,
      created_by: session.user.id
    }

    // Insert menu item
    const { data: menuItem, error: menuError } = await supabase
      .from('menu_items')
      .insert([dataWithSlug])
      .select(`
        *,
        menu_categories (
          id,
          name,
          slug
        )
      `)
      .single()

    if (menuError) {
      console.error('Supabase error:', menuError)
      return NextResponse.json(
        { error: menuError.message },
        { status: 500 }
      )
    }

    // Insert ingredients if provided
    if (ingredients && ingredients.length > 0 && menuItem) {
      const ingredientRecords = ingredients.map((ing: any) => ({
        menu_item_id: menuItem.id,
        ingredient_id: ing.ingredient_id,
        quantity_needed: ing.quantity_needed,
        unit: ing.unit,
        preparation_notes: ing.preparation_notes,
        is_required: true
      }))

      const { error: ingredientError } = await supabase
        .from('menu_item_ingredients')
        .insert(ingredientRecords)

      if (ingredientError) {
        console.error('Error inserting ingredients:', ingredientError)
        // Don't fail the whole request, menu item is already created
      }
    }

    // Insert customization groups if provided
    if (customization_groups && customization_groups.length > 0 && menuItem) {
      for (const group of customization_groups) {
        const { options, ...groupData } = group

        // Insert customization group
        const { data: insertedGroup, error: groupError } = await supabase
          .from('menu_customization_groups')
          .insert([{
            menu_item_id: menuItem.id,
            group_name: groupData.group_name,
            group_type: groupData.group_type,
            is_required: groupData.is_required,
            display_order: groupData.display_order
          }])
          .select()
          .single()

        if (groupError) {
          console.error('Error inserting customization group:', groupError)
          continue
        }

        // Insert customization options
        if (options && options.length > 0 && insertedGroup) {
          const optionRecords = options.map((opt: any) => ({
            group_id: insertedGroup.id,
            option_name: opt.option_name,
            price_adjustment: opt.price_adjustment,
            is_default: opt.is_default,
            is_available: opt.is_available,
            display_order: opt.display_order,
            ingredient_id: opt.ingredient_id || null,
            ingredient_quantity: opt.ingredient_quantity || null
          }))

          const { error: optionError } = await supabase
            .from('menu_customization_options')
            .insert(optionRecords)

          if (optionError) {
            console.error('Error inserting customization options:', optionError)
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        ...menuItem,
        category_name: menuItem.menu_categories?.name
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category_id = searchParams.get('category_id')
    const is_available = searchParams.get('is_available')
    const search = searchParams.get('search')

    let query = supabase
      .from('menu_items')
      .select(`
        *,
        menu_categories (
          id,
          name
        )
      `)
      .order('name')

    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    if (is_available !== null && is_available !== undefined) {
      query = query.eq('is_available', is_available === 'true')
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: (data || []).map(item => ({
        ...item,
        category_name: item.menu_categories?.name
      }))
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}