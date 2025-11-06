'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export interface Employee {
  id: string
  username: string
  full_name: string
  position: string
  employee_code: string
  phone_number?: string
  telegram_chat_id?: string
  annual_leave_balance: number
  sick_leave_balance: number
  must_change_password: boolean
  // Additional fields for profile
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  salary_type?: string
  salary_amount?: number
  join_date?: string
  employment_status?: string
  contract_end_date?: string
  last_login?: string
}

interface AuthContextType {
  employee: Employee | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  refreshEmployee: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'employee_auth_token'
const EMPLOYEE_KEY = 'employee_data'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load token and verify on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        // Check if we're in browser (not SSR)
        if (typeof window === 'undefined') {
          setIsLoading(false)
          return
        }

        const storedToken = localStorage.getItem(TOKEN_KEY)
        const storedEmployee = localStorage.getItem(EMPLOYEE_KEY)

        if (storedToken && storedEmployee) {
          try {
            setToken(storedToken)
            setEmployee(JSON.parse(storedEmployee))

            // Verify token is still valid
            const response = await fetch('/api/auth', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${storedToken}`,
              },
              body: JSON.stringify({ action: 'verify' }),
            })

            if (!response.ok) {
              // Token invalid, clear auth
              console.log('Token invalid, clearing auth')
              localStorage.removeItem(TOKEN_KEY)
              localStorage.removeItem(EMPLOYEE_KEY)
              setToken(null)
              setEmployee(null)
            } else {
              // Update with fresh employee data
              const data = await response.json()
              if (data.success && data.employee) {
                setEmployee(data.employee)
                localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(data.employee))
              }
            }
          } catch (verifyError) {
            console.error('Error verifying token:', verifyError)
            // Clear invalid data
            localStorage.removeItem(TOKEN_KEY)
            localStorage.removeItem(EMPLOYEE_KEY)
            setToken(null)
            setEmployee(null)
          }
        }
      } catch (error) {
        console.error('Error loading auth:', error)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(EMPLOYEE_KEY)
        setToken(null)
        setEmployee(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadAuth()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Login gagal' }
      }

      // Save token and employee data
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(data.employee))
      setToken(data.token)
      setEmployee(data.employee)

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Terjadi kesalahan saat login' }
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMPLOYEE_KEY)
    setToken(null)
    setEmployee(null)
    router.push('/login')
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!employee) {
      return { success: false, error: 'Tidak ada sesi aktif' }
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          employeeId: employee.id,
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Gagal mengubah password' }
      }

      // Update employee data to reflect password change
      const updatedEmployee = { ...employee, must_change_password: false }
      setEmployee(updatedEmployee)
      localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(updatedEmployee))

      return { success: true }
    } catch (error) {
      console.error('Change password error:', error)
      return { success: false, error: 'Terjadi kesalahan saat mengubah password' }
    }
  }

  const refreshEmployee = async () => {
    if (!token) return

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'verify' }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.employee) {
          setEmployee(data.employee)
          localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(data.employee))
        }
      }
    } catch (error) {
      console.error('Error refreshing employee data:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        employee,
        token,
        isLoading,
        login,
        logout,
        changePassword,
        refreshEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for protected routes
export function useRequireAuth() {
  const { employee, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !employee) {
      router.push('/login')
    }
  }, [employee, isLoading, router])

  return { employee, isLoading }
}
