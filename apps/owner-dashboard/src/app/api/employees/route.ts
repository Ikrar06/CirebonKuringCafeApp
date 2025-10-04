import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching employees from API...')

    // First try to fetch employees only
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })

    if (empError) {
      console.error('Error fetching employees:', empError)
      return NextResponse.json(
        { error: empError.message },
        { status: 500 }
      )
    }

    console.log(`Found ${employees?.length || 0} employees`)

    if (!employees || employees.length === 0) {
      console.log('No employees found, returning empty array')
      return NextResponse.json({ data: [] })
    }

    // Fetch user emails separately for each employee
    const transformedEmployees = await Promise.all(
      employees.map(async (emp: any) => {
        let email = 'no-email@example.com'

        try {
          const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('id', emp.user_id)
            .single()

          if (user?.email) {
            email = user.email
          }
        } catch (err) {
          console.log(`Could not fetch email for employee ${emp.id}`)
        }

        return {
          id: emp.id,
          user_id: emp.user_id,
          email: email,
          full_name: emp.full_name,
          phone: emp.phone_number,
          address: emp.address,
          position: emp.position,
          salary_type: emp.salary_type,
          salary_amount: parseFloat(emp.salary_amount || 0),
          telegram_chat_id: emp.telegram_chat_id,
          telegram_notifications_enabled: emp.telegram_notifications_enabled || false,
          is_active: emp.employment_status === 'active',
          shift: null,
          hire_date: emp.join_date,
          created_at: emp.created_at
        }
      })
    )

    console.log('Returning', transformedEmployees.length, 'transformed employees')
    return NextResponse.json({ data: transformedEmployees })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      full_name,
      phone,
      address,
      position,
      salary_type,
      salary_amount,
      telegram_chat_id,
      is_active,
      shift,
      hire_date
    } = body

    // Validate required fields
    if (!email || !password || !full_name || !phone || !position || !salary_type || salary_amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user account first
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        role: 'employee', // All employees use 'employee' role
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      )
    }

    // Generate employee code
    const { data: lastEmployee } = await supabase
      .from('employees')
      .select('employee_code')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let employeeCode = 'EMP001'
    if (lastEmployee?.employee_code) {
      const lastNumber = parseInt(lastEmployee.employee_code.replace('EMP', ''))
      employeeCode = `EMP${String(lastNumber + 1).padStart(3, '0')}`
    }

    // Create employee record
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .insert({
        user_id: user.id,
        employee_code: employeeCode,
        full_name,
        phone_number: phone,
        address,
        position,
        salary_type,
        salary_amount,
        telegram_chat_id: telegram_chat_id || null,
        telegram_notifications_enabled: !!telegram_chat_id,
        employment_status: is_active !== false ? 'active' : 'inactive',
        join_date: hire_date || new Date().toISOString().split('T')[0],
        must_change_password: true,
        annual_leave_balance: 12,
        sick_leave_balance: 30,
        overtime_rate: 1.5,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (employeeError) {
      console.error('Error creating employee:', employeeError)

      // Rollback: Delete the user if employee creation failed
      await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      return NextResponse.json(
        { error: employeeError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        ...employee,
        email: user.email
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
