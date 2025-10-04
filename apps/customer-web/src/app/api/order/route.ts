import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('=== ORDER API START ===')
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))

    const {
      table_id,
      customer_name,
      customer_phone,
      customer_email,
      items,
      special_notes,
      subtotal,
      tax_amount,
      service_fee,
      total_amount,
      promo_code,
      discount_amount
    } = body

    // Validate required fields
    console.log('Validating required fields:')
    console.log('- table_id:', table_id, typeof table_id)
    console.log('- customer_name:', customer_name, typeof customer_name)
    console.log('- customer_phone:', customer_phone, typeof customer_phone)
    console.log('- items:', items, Array.isArray(items), items?.length)

    if (!table_id || !customer_name || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
      console.log('Validation failed - missing required fields')
      const missingFields = []
      if (!table_id) missingFields.push('table_id')
      if (!customer_name) missingFields.push('customer_name')
      if (!customer_phone) missingFields.push('customer_phone')
      if (!items || !Array.isArray(items)) missingFields.push('items (array)')
      if (items?.length === 0) missingFields.push('items (empty)')

      return NextResponse.json(
        { error: { message: `Missing required fields: ${missingFields.join(', ')}` } },
        { status: 400 }
      )
    }

    // Try to find table by ID first, then by table_number if ID fails
    console.log('Validating table:', table_id)
    let table = null
    let tableError = null

    // First try by ID
    const idResponse = await supabase
      .from('tables')
      .select('id, table_number')
      .eq('id', table_id)
      .single()

    if (idResponse.data) {
      table = idResponse.data
    } else {
      // Try by table_number in case table_id is actually table number
      console.log('Trying by table_number:', table_id)
      const numberResponse = await supabase
        .from('tables')
        .select('id, table_number')
        .eq('table_number', table_id)
        .single()

      if (numberResponse.data) {
        table = numberResponse.data
      } else {
        tableError = numberResponse.error || idResponse.error
      }
    }

    console.log('Table query result:', { table, tableError })

    if (tableError || !table) {
      console.log('Table validation failed:', tableError)
      return NextResponse.json(
        { error: { message: 'Invalid table ID: ' + (tableError?.message || 'Table not found') } },
        { status: 400 }
      )
    }

    // Calculate order total from items
    let calculatedSubtotal = 0
    const validItems = []

    for (const item of items) {
      // Validate menu item exists
      const { data: menuItem, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, base_price, is_available')
        .eq('id', item.menu_item_id)
        .single()

      if (menuError || !menuItem) {
        return NextResponse.json(
          { error: { message: `Invalid menu item: ${item.menu_item_id}` } },
          { status: 400 }
        )
      }

      if (!menuItem.is_available) {
        return NextResponse.json(
          { error: { message: `Menu item "${menuItem.name}" is not available` } },
          { status: 400 }
        )
      }

      const itemPrice = item.unit_price || menuItem.base_price

      // Calculate customization price (temporarily disabled to debug)
      let customizationPrice = 0
      try {
        if (item.customizations && Object.keys(item.customizations).length > 0) {
          // Skip customization price calculation for now to avoid errors
          console.log('Customization found but price calculation skipped for debugging')
        }
      } catch (error) {
        console.error('Error calculating customization price:', error)
        customizationPrice = 0
      }

      const itemSubtotal = (itemPrice + customizationPrice) * item.quantity
      calculatedSubtotal += itemSubtotal

      validItems.push({
        menu_item_id: item.menu_item_id,
        item_name: menuItem.name, // Required field from database
        item_price: itemPrice, // Required field from database
        quantity: item.quantity,
        customizations: item.customizations || {}, // JSONB field
        customization_price: customizationPrice, // Required field with default 0
        subtotal: itemSubtotal,
        notes: item.notes || null // TEXT field, nullable
      })
    }

    // Calculate taxes and fees
    const taxRate = 0.1 // 10% tax
    const serviceFeeRate = 0.05 // 5% service fee
    const calculatedTax = Math.round(calculatedSubtotal * taxRate)
    const calculatedServiceFee = Math.round(calculatedSubtotal * serviceFeeRate)
    const discountAmount = Number(discount_amount) || 0
    // Ensure minimum order value after discount (e.g., minimum 1000)
    const rawTotal = calculatedSubtotal + calculatedTax + calculatedServiceFee - discountAmount
    const calculatedTotal = Math.max(1000, rawTotal)

    console.log('Final calculation:', {
      calculatedSubtotal,
      calculatedTax,
      calculatedServiceFee,
      discountAmount,
      calculatedTotal
    })

    // Validate promo code if provided
    let validatedPromo = null
    if (promo_code) {
      console.log('Validating promo code:', promo_code)
      const { data: promoData, error: promoError } = await supabase
        .from('promos')
        .select('id, code, promo_type, discount_value, min_purchase_amount, max_uses_total, current_uses, is_active')
        .eq('code', promo_code.toUpperCase())
        .eq('is_active', true)
        .single()

      if (promoError || !promoData) {
        return NextResponse.json(
          { error: { message: `Invalid promo code: ${promo_code}` } },
          { status: 400 }
        )
      }

      // Check if promo has usage limits
      if (promoData.max_uses_total && promoData.current_uses >= promoData.max_uses_total) {
        return NextResponse.json(
          { error: { message: 'Promo code has reached maximum usage limit' } },
          { status: 400 }
        )
      }

      // Check minimum purchase amount
      if (promoData.min_purchase_amount && calculatedSubtotal < promoData.min_purchase_amount) {
        return NextResponse.json(
          { error: { message: `Minimum purchase amount for this promo is Rp ${promoData.min_purchase_amount.toLocaleString('id-ID')}` } },
          { status: 400 }
        )
      }

      validatedPromo = promoData
      console.log('Promo validated successfully:', validatedPromo)
    }

    // Create order in database - use database schema from migration (not TypeScript types)
    // IMPORTANT: Set discount_amount = 0 initially to avoid constraint violation
    // The database trigger will calculate total based on order_items (which don't exist yet)
    // We'll update the discount after creating order_items
    const currentTime = new Date().toISOString()
    const orderData = {
      table_id: table.id, // Use the actual table UUID from database
      // session_id will be generated after order creation using the actual order.id
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.replace(/\s+/g, ''),
      customer_notes: special_notes?.trim() || null, // Use actual database field name
      subtotal: 0, // Will be calculated by trigger
      tax_amount: 0, // Will be calculated by trigger
      service_charge: 0, // Will be calculated by trigger
      total_amount: 0, // Will be calculated by trigger
      status: 'pending_payment' as const, // Use actual enum value from migration
      payment_status: 'pending' as const,
      // Add promo data (but set discount to 0 initially)
      promo_code: validatedPromo?.code || null,
      promo_id: validatedPromo?.id || null,
      discount_percentage: validatedPromo?.promo_type === 'percentage' ? validatedPromo.discount_value : null,
      discount_amount: 0, // Set to 0 initially, will be updated later
      // Explicitly set created_at to ensure it's set first
      created_at: currentTime,
      // Ensure payment_verified_at is NULL initially (should only be set when payment is approved)
      payment_verified_at: null
    }

    console.log('Creating order with data:', orderData)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData as any)
      .select()
      .single()

    console.log('Order creation result:', { order, orderError })

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: { message: 'Failed to create order: ' + orderError.message } },
        { status: 500 }
      )
    }

    // Generate session_id using the actual order.id and update the order
    const sessionId = `session_${order.id}_${Date.now()}`
    console.log('Updating order with session_id:', sessionId)

    const { error: sessionUpdateError } = await supabase
      .from('orders')
      .update({
        session_id: sessionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (sessionUpdateError) {
      console.error('Error updating order with session_id:', sessionUpdateError)
    } else {
      console.log('Order session_id updated successfully')
    }

    // Create order items
    const orderItems = validItems.map(item => ({
      ...item,
      order_id: order.id
    }))

    console.log('Creating order items with data:', JSON.stringify(orderItems, null, 2))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      console.error('Order items data:', JSON.stringify(orderItems, null, 2))
      // Try to delete the order if items creation failed
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: { message: 'Failed to create order items: ' + itemsError.message } },
        { status: 500 }
      )
    }

    // Update order totals after creating items (database trigger has now calculated correct values)
    // Now apply the discount if any
    console.log('Updating order totals with discount after creating items')
    const finalUpdate: any = {
      promo_code: validatedPromo?.code || null,
      promo_id: validatedPromo?.id || null,
      discount_percentage: validatedPromo?.promo_type === 'percentage' ? validatedPromo.discount_value : null,
      discount_amount: discountAmount,
      updated_at: new Date().toISOString()
    }

    // Update promo usage count if promo was used
    if (validatedPromo && discountAmount > 0) {
      const { error: promoUpdateError } = await supabase
        .from('promos')
        .update({
          current_uses: validatedPromo.current_uses + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedPromo.id)

      if (promoUpdateError) {
        console.error('Error updating promo usage count:', promoUpdateError)
      } else {
        console.log('Promo usage count updated successfully')
      }
    }

    // If there's a discount, we need to recalculate total_amount
    if (discountAmount > 0) {
      // Get the current totals calculated by the trigger
      const currentSubtotal = calculatedSubtotal
      const currentTax = calculatedTax
      const currentServiceFee = calculatedServiceFee
      const newTotal = Math.max(1000, currentSubtotal + currentTax + currentServiceFee - discountAmount)

      finalUpdate.total_amount = newTotal
      console.log('Applying discount:', {
        beforeDiscount: currentSubtotal + currentTax + currentServiceFee,
        discount: discountAmount,
        afterDiscount: newTotal
      })
    }

    const { error: totalsUpdateError } = await supabase
      .from('orders')
      .update(finalUpdate)
      .eq('id', order.id)

    if (totalsUpdateError) {
      console.error('Error updating order totals:', totalsUpdateError)
    } else {
      console.log('Order totals updated successfully')
    }

    // Update table status to occupied with session_id
    console.log('Updating table status for table:', table.id, 'with session:', sessionId)
    const { error: tableUpdateError } = await supabase
      .from('tables')
      .update({
        status: 'occupied',
        current_session_id: sessionId,
        occupied_since: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', table.id)

    if (tableUpdateError) {
      console.error('Error updating table status:', tableUpdateError)
    } else {
      console.log('Table status updated to occupied with session:', sessionId)
    }

    // Calculate estimated completion (30 minutes from now)
    const estimatedCompletion = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    // Calculate final total amount for response (with discount applied)
    const finalTotalAmount = discountAmount > 0
      ? Math.max(1000, calculatedSubtotal + calculatedTax + calculatedServiceFee - discountAmount)
      : calculatedSubtotal + calculatedTax + calculatedServiceFee

    return NextResponse.json({
      data: {
        order_id: order.id,
        total_amount: finalTotalAmount,
        table_number: table.table_number,
        estimated_completion: estimatedCompletion
      }
    })

  } catch (error: any) {
    console.error('Error in order creation:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      details: error.details
    })

    return NextResponse.json(
      { error: {
        message: 'Internal server error: ' + (error.message || 'Unknown error'),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }},
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')


    if (!orderId) {
      return NextResponse.json(
        { error: { message: 'Order ID is required' } },
        { status: 400 }
      )
    }

    // Get order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        tables(id, table_number),
        order_items(
          *,
          menu_items(id, name, base_price)
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: { message: 'Order not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: order
    })

  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}