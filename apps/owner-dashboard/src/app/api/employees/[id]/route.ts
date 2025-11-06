import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        *,
        users!employees_user_id_fkey (
          email,
          role
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Transform data
    const transformedEmployee = {
      id: employee.id,
      user_id: employee.user_id,
      email: employee.users?.email || null,
      full_name: employee.full_name,
      phone: employee.phone_number,
      address: employee.address,
      position: employee.position,
      salary_type: employee.salary_type,
      salary_amount: parseFloat(employee.salary_amount || 0),
      telegram_chat_id: employee.telegram_chat_id,
      is_active: employee.employment_status === 'active',
      hire_date: employee.join_date,
      created_at: employee.created_at
    }

    return NextResponse.json({ data: transformedEmployee })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const {
      full_name,
      phone,
      address,
      position,
      salary_type,
      salary_amount,
      telegram_chat_id,
      is_active,
      hire_date
    } = body

    // Update employee record
    const { data: employee, error } = await supabase
      .from('employees')
      .update({
        full_name,
        phone_number: phone,
        address,
        position,
        salary_type,
        salary_amount,
        telegram_chat_id: telegram_chat_id || null,
        telegram_notifications_enabled: !!telegram_chat_id,
        employment_status: is_active !== false ? 'active' : 'inactive',
        join_date: hire_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Update user active status (role stays as 'employee')
    if (employee.user_id) {
      await supabase
        .from('users')
        .update({
          is_active: is_active !== false,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.user_id)
    }

    return NextResponse.json({ data: employee })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get employee to find associated user
    const { data: employee, error: getError } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', id)
      .single()

    if (getError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Delete employee record
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting employee:', deleteError)
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    // Delete associated user account
    if (employee.user_id) {
      await supabase
        .from('users')
        .delete()
        .eq('id', employee.user_id)
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
