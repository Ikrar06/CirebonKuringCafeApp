import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`)
    }


    // Fetch menu items with category join
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select(`
        *,
        menu_categories!inner (
          id,
          name,
          slug,
          description,
          display_order,
          is_active
        )
      `)
      .eq('is_available', true)
      .eq('menu_categories.is_active', true)
      .order('id')

    if (menuError) {
      throw new Error(`Failed to fetch menu items: ${menuError.message}`)
    }


    // Group menu items by category
    const menuByCategory = (categories || []).map(category => {
      const categoryItems = (menuItems || [])
        .filter(item => item.category_id === category.id)
        .map(item => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          price: item.base_price || 0, // Map base_price to price with fallback
          image_url: item.image_url,
          category_id: item.category_id,
          category_name: category.name,
          is_available: item.is_available,
          preparation_time: item.estimated_prep_time,
          is_halal: true, // Default to true, you can add this field to database if needed
          spice_level: item.spicy_level || 0,
          ingredients_available: true, // Default to true, can be enhanced later
          is_vegetarian: item.is_vegetarian,
          is_vegan: item.is_vegan,
          is_gluten_free: item.is_gluten_free,
          is_spicy: item.is_spicy,
          rating: item.average_rating || 0,
          total_reviews: item.rating_count || 0
        }))

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        sort_order: category.display_order || 0,
        items: categoryItems
      }
    }).filter(category => category.items.length > 0) // Only include categories with items

    const responseData = {
      categories: categories || [],
      menu: menuByCategory,
      total_items: menuItems?.length || 0
    }


    return NextResponse.json({ data: responseData })

  } catch (error) {
    console.error('Error in menu API:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// Get specific menu item details
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { item_id } = body

    if (!item_id) {
      return NextResponse.json(
        { error: { message: 'Menu item ID is required' } },
        { status: 400 }
      )
    }


    // Fetch menu item details
    const { data: menuItem, error: itemError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', item_id)
      .eq('is_available', true)
      .single()

    if (itemError) {
      console.error('Error fetching menu item:', itemError)
      return NextResponse.json(
        { error: { message: 'Menu item not found' } },
        { status: 404 }
      )
    }

    // Fetch customizations for this menu item
    const { data: customizations, error: customError } = await supabase
      .from('menu_customization_groups')
      .select(`
        *,
        menu_customization_options (
          id,
          option_name,
          price_adjustment,
          is_default,
          is_available
        )
      `)
      .eq('menu_item_id', item_id)
      .order('display_order')

    if (customError) {
      console.error('Error fetching customizations:', customError)
    }

    // Format customizations
    const formattedCustomizations = (customizations || []).map(group => ({
      id: group.id,
      name: group.group_name,
      type: group.group_type,
      required: group.is_required,
      options: (group.menu_customization_options || [])
        .filter(option => option.is_available)
        .map(option => ({
          id: option.id,
          name: option.option_name,
          price_modifier: option.price_adjustment,
          is_default: option.is_default
        }))
    }))

    const itemDetails = {
      id: menuItem.id,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.base_price || 0,  // Map base_price to price for frontend with fallback
      base_price: menuItem.base_price,
      estimated_prep_time: menuItem.estimated_prep_time,
      customizations: formattedCustomizations
    }


    return NextResponse.json({
      data: itemDetails
    })

  } catch (error) {
    console.error('Error fetching menu item details:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}