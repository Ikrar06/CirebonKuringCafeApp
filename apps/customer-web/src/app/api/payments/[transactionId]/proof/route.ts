import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    console.log('=== UPLOAD PAYMENT PROOF API START ===')
    const transactionId = params.transactionId
    console.log('Transaction ID:', transactionId)

    // Get form data
    const formData = await request.formData()
    const file = formData.get('proof') as File

    if (!file) {
      return NextResponse.json(
        { error: { message: 'No file provided' } },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' } },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: { message: 'File too large. Maximum size is 5MB' } },
        { status: 400 }
      )
    }

    // Validate transaction exists
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('id, order_id, status')
      .eq('id', transactionId)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: { message: 'Transaction not found' } },
        { status: 404 }
      )
    }

    // Check if transaction is in correct state
    if (transaction.status === 'success') {
      return NextResponse.json(
        { error: { message: 'Transaction already verified' } },
        { status: 400 }
      )
    }

    try {
      // Convert file to buffer for upload
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Generate unique filename
      const timestamp = new Date().getTime()
      const fileExtension = file.name.split('.').pop()
      const fileName = `payment-proof-${transactionId}-${timestamp}.${fileExtension}`
      const filePath = `payment-proofs/${fileName}`

      console.log('Uploading file:', filePath)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json(
          { error: { message: 'Failed to upload file: ' + uploadError.message } },
          { status: 500 }
        )
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath)

      const proofUrl = urlData.publicUrl

      console.log('File uploaded successfully:', proofUrl)

      // Update payment transaction with proof URL
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          proof_image_url: proofUrl,
          status: 'pending', // Keep as pending until manually verified by staff
          processed_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      if (updateError) {
        console.error('Error updating transaction:', updateError)
        return NextResponse.json(
          { error: { message: 'Failed to update transaction: ' + updateError.message } },
          { status: 500 }
        )
      }

      // Also update the order payment status
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          payment_proof_url: proofUrl,
          payment_status: 'processing' // Set to processing, waiting for verification
        })
        .eq('id', transaction.order_id)

      if (orderUpdateError) {
        console.error('Error updating order:', orderUpdateError)
      }

      console.log('Payment proof uploaded successfully')

      return NextResponse.json({
        data: {
          transaction_id: transactionId,
          proof_url: proofUrl,
          status: 'pending_verification',
          message: 'Bukti pembayaran berhasil diupload. Menunggu verifikasi dari kasir.'
        }
      })

    } catch (fileError) {
      console.error('File processing error:', fileError)
      return NextResponse.json(
        { error: { message: 'Failed to process file' } },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Error in upload payment proof:', error)
    return NextResponse.json(
      { error: {
        message: 'Internal server error: ' + (error.message || 'Unknown error'),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }},
      { status: 500 }
    )
  }
}