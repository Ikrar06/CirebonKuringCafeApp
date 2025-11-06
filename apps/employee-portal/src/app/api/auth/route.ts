import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, action } = body

    // LOGIN
    if (action === 'login') {
      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username dan password wajib diisi' },
          { status: 400 }
        )
      }

      // Get employee by username
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('username', username.toLowerCase())
        .eq('employment_status', 'active')
        .single()

      console.log('🔍 Login attempt:', { username: username.toLowerCase(), found: !!employee, error: employeeError?.message })

      if (employeeError || !employee) {
        console.log('❌ Employee not found or error:', employeeError)
        return NextResponse.json(
          { error: 'Username atau password salah' },
          { status: 401 }
        )
      }

      console.log('✅ Employee found:', { id: employee.id, username: employee.username, hasPasswordHash: !!employee.password_hash })

      // Verify password
      const isValidPassword = await bcrypt.compare(password, employee.password_hash)
      console.log('🔐 Password check:', { isValid: isValidPassword, passwordLength: password.length })

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Username atau password salah' },
          { status: 401 }
        )
      }

      // Update last login
      await supabase
        .from('employees')
        .update({ last_login: new Date().toISOString() })
        .eq('id', employee.id)

      // Generate JWT token
      const token = jwt.sign(
        {
          id: employee.id,
          username: employee.username,
          position: employee.position,
          full_name: employee.full_name,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      // Return employee data and token
      return NextResponse.json({
        success: true,
        token,
        employee: {
          id: employee.id,
          username: employee.username,
          full_name: employee.full_name,
          position: employee.position,
          employee_code: employee.employee_code,
          phone_number: employee.phone_number,
          telegram_chat_id: employee.telegram_chat_id,
          annual_leave_balance: employee.annual_leave_balance,
          sick_leave_balance: employee.sick_leave_balance,
          must_change_password: employee.must_change_password,
          // Additional fields for profile
          address: employee.address,
          emergency_contact: employee.emergency_contact,
          emergency_phone: employee.emergency_phone,
          salary_type: employee.salary_type,
          salary_amount: employee.salary_amount,
          join_date: employee.join_date,
          employment_status: employee.employment_status,
          contract_end_date: employee.contract_end_date,
          last_login: employee.last_login,
        },
      })
    }

    // LOGOUT
    if (action === 'logout') {
      return NextResponse.json({ success: true })
    }

    // VERIFY TOKEN
    if (action === 'verify') {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (!token) {
        return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 401 })
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any

        // Get fresh employee data
        const { data: employee, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', decoded.id)
          .eq('employment_status', 'active')
          .single()

        if (error || !employee) {
          return NextResponse.json({ error: 'Session tidak valid' }, { status: 401 })
        }

        return NextResponse.json({
          success: true,
          employee: {
            id: employee.id,
            username: employee.username,
            full_name: employee.full_name,
            position: employee.position,
            employee_code: employee.employee_code,
            phone_number: employee.phone_number,
            telegram_chat_id: employee.telegram_chat_id,
            annual_leave_balance: employee.annual_leave_balance,
            sick_leave_balance: employee.sick_leave_balance,
            must_change_password: employee.must_change_password,
            // Additional fields for profile
            address: employee.address,
            emergency_contact: employee.emergency_contact,
            emergency_phone: employee.emergency_phone,
            salary_type: employee.salary_type,
            salary_amount: employee.salary_amount,
            join_date: employee.join_date,
            employment_status: employee.employment_status,
            contract_end_date: employee.contract_end_date,
            last_login: employee.last_login,
          },
        })
      } catch (error) {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
      }
    }

    // CHANGE PASSWORD (for first-time login)
    if (action === 'change-password') {
      const { currentPassword, newPassword, employeeId } = body

      if (!currentPassword || !newPassword || !employeeId) {
        return NextResponse.json(
          { error: 'Data tidak lengkap' },
          { status: 400 }
        )
      }

      // Get employee
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()

      if (employeeError || !employee) {
        return NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 404 })
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, employee.password_hash)

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Password lama salah' },
          { status: 401 }
        )
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10)

      // Update password
      await supabase
        .from('employees')
        .update({
          password_hash: newPasswordHash,
          must_change_password: false,
        })
        .eq('id', employeeId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
