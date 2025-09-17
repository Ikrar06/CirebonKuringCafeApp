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
    const body = await request.json()

    const { orderId, rating, comment, aspects } = body

    // Validate required fields
    if (!orderId || !rating) {
      return NextResponse.json(
        { error: { message: 'Order ID and rating are required' } },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: { message: 'Rating must be between 1 and 5' } },
        { status: 400 }
      )
    }

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_name, table_id, tables(table_number)')
      .eq('id', orderId)
      .single()

    console.log('Order lookup result:', { order, orderError })

    if (orderError || !order) {
      return NextResponse.json(
        { error: { message: 'Order not found' } },
        { status: 404 }
      )
    }

    // Check if rating already exists for this order
    const { data: existingRating, error: existingError } = await supabase
      .from('ratings')
      .select('id')
      .eq('order_id', orderId)
      .single()

    console.log('Existing rating check:', { existingRating, existingError })

    if (existingRating) {
      return NextResponse.json(
        { error: { message: 'Rating sudah pernah diberikan untuk pesanan ini' } },
        { status: 409 }
      )
    }

    // Insert rating
    const ratingData = {
      order_id: orderId,
      overall_rating: rating,
      comment: comment || null,
      food_quality: aspects?.food_quality || null,
      service_quality: aspects?.service || null,
      cleanliness: aspects?.cleanliness || null,
      speed: aspects?.speed || null,
      created_at: new Date().toISOString()
    }

    console.log('Inserting rating data:', ratingData)

    const { data: newRating, error: insertError } = await supabase
      .from('ratings')
      .insert(ratingData)
      .select()
      .single()

    console.log('Rating insertion result:', { newRating, insertError })

    if (insertError) {
      console.error('Error inserting rating:', insertError)
      return NextResponse.json(
        { error: { message: 'Failed to save rating', details: insertError.message } },
        { status: 500 }
      )
    }

    // Update order to mark that it has been rated
    await supabase
      .from('orders')
      .update({
        rated: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    console.log('Rating submitted successfully')

    return NextResponse.json({
      success: true,
      message: 'Rating berhasil dikirim',
      data: newRating
    })

  } catch (error: any) {
    console.error('Error in rating submission API:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', details: error.message || 'Unknown error' } },
      { status: 500 }
    )
  }
}