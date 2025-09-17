import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPLOAD PROOF API START ===')

    const formData = await request.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('order_id') as string
    const paymentId = formData.get('payment_id') as string

    console.log('Upload request:', {
      orderId,
      paymentId,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size
    })

    // Validate required fields
    if (!file || !orderId || !paymentId) {
      return NextResponse.json(
        { error: { message: 'Missing required fields: file, order_id, payment_id' } },
        { status: 400 }
      )
    }

    // Validate file type (allow images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { message: 'File type not allowed. Please upload JPG, PNG, or WebP image.' } },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: { message: 'File size too large. Maximum 5MB allowed.' } },
        { status: 400 }
      )
    }

    // Validate that the order and payment exist
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('id, order_id, status')
      .eq('id', paymentId)
      .eq('order_id', orderId)
      .single()

    if (transactionError || !transaction) {
      console.error('Transaction validation failed:', transactionError)
      return NextResponse.json(
        { error: { message: 'Invalid payment or order ID' } },
        { status: 400 }
      )
    }

    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileExtension = file.name.split('.').pop()
    const fileName = `payment-proof-${orderId}-${timestamp}.${fileExtension}`
    const filePath = `payment-proofs/${fileName}`

    console.log('Uploading file to path:', filePath)

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer()

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: { message: `Upload failed: ${uploadError.message}` } },
        { status: 500 }
      )
    }

    console.log('File uploaded successfully:', uploadData.path)

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(uploadData.path)

    const publicUrl = publicUrlData.publicUrl

    // Update payment transaction with proof details
    const { error: updateTransactionError } = await supabase
      .from('payment_transactions')
      .update({
        proof_image_url: publicUrl,
        status: 'pending', // Change to pending for verification
        processed_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (updateTransactionError) {
      console.error('Error updating transaction with proof:', updateTransactionError)
      // Continue anyway since file is already uploaded
    }

    // Also update the orders table with payment proof URL (session_id should already be set during order creation)
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        payment_proof_url: publicUrl,
        payment_status: 'pending'
      })
      .eq('id', orderId)

    if (updateOrderError) {
      console.error('Error updating order with proof:', updateOrderError)
      // Continue anyway since file is already uploaded
    }

    console.log('Upload proof completed successfully')

    return NextResponse.json({
      data: {
        message: 'Payment proof uploaded successfully',
        proof_url: publicUrl,
        filename: fileName,
        status: 'uploaded'
      }
    })

  } catch (error: any) {
    console.error('Error in upload proof:', error)
    console.error('Error stack:', error.stack)

    return NextResponse.json(
      { error: {
        message: 'Internal server error: ' + (error.message || 'Unknown error'),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }},
      { status: 500 }
    )
  }
}