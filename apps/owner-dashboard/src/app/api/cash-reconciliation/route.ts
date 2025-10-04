import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch cash reconciliation records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')

    console.log('Fetching cash reconciliation...', { date, startDate, endDate, status })

    let query = supabase
      .from('cash_reconciliation')
      .select('*')
      .order('date', { ascending: false })

    if (date) {
      query = query.eq('date', date)
    }

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching cash reconciliation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Found ${data?.length || 0} reconciliation records`)
    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create/Submit cash reconciliation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      kasir_id,
      starting_cash,
      system_cash_sales,
      actual_cash,
      denomination_breakdown,
      notes,
      reconciled_by
    } = body

    console.log('Creating cash reconciliation...', { date, actual_cash })

    // Validate required fields
    if (!date || actual_cash === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: date, actual_cash' },
        { status: 400 }
      )
    }

    // Check if reconciliation already exists for this date
    const { data: existing } = await supabase
      .from('cash_reconciliation')
      .select('id')
      .eq('date', date)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Reconciliation already exists for this date' },
        { status: 400 }
      )
    }

    // Calculate variance and status
    const expected = (starting_cash || 0) + (system_cash_sales || 0)
    const variance = actual_cash - expected
    const variancePercentage = expected > 0 ? (variance / expected) * 100 : 0

    // Determine status based on variance
    let status = 'closed'
    if (Math.abs(variance) > 10000) {
      status = 'discrepancy'
    }

    // Determine final status for our simplified version
    let finalStatus: 'balanced' | 'variance_approved' | 'pending_review' = 'balanced'
    if (variance !== 0) {
      finalStatus = 'pending_review'
    }

    // Create reconciliation record
    const { data: reconciliation, error } = await supabase
      .from('cash_reconciliation')
      .insert({
        date,
        kasir_id: kasir_id || null,
        starting_cash: starting_cash || 500000,
        system_cash_sales: system_cash_sales || 0,
        system_cash_returns: 0,
        actual_cash,
        denomination_breakdown,
        status,
        notes,
        variance_reason: reconciled_by || notes,
        closed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating reconciliation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return with our simplified status
    return NextResponse.json({
      data: {
        ...reconciliation,
        reconciled_by,
        status: finalStatus,
        expected_amount: expected,
        variance
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
