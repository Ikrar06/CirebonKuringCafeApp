'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export interface AuthUser {
  id: string
  email: string
  name?: string
  role: string
  cafe_id: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export function useAuth() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isAuthenticated = status === "authenticated"
  const isOwner = session?.user?.role === "owner"

  const user: AuthUser | null = session?.user ? {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || undefined,
    role: session.user.role,
    cafe_id: session.user.cafe_id
  } : null

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        return false
      }

      // Successful login - redirect to dashboard (route group makes this root)
      router.push('/')
      return true
    } catch (err) {
      setError('An unexpected error occurred')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      await signOut({
        redirect: true,
        callbackUrl: '/login'
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearError = () => setError(null)

  return {
    // Auth state
    user,
    isAuthenticated,
    isOwner,
    isLoading: status === "loading" || isLoading,
    error,

    // Auth methods
    login,
    logout,
    clearError,

    // Session status
    status
  }
}

// Hook for components that require authentication
export function useRequireAuth() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.status === "loading") return

    if (!auth.isAuthenticated) {
      router.push('/login')
    }
  }, [auth.status, auth.isAuthenticated, router])

  return auth
}

// Hook for components that require owner role
export function useRequireOwner() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.status === "loading") return

    if (!auth.isAuthenticated) {
      router.push('/login')
      return
    }

    if (auth.isAuthenticated && !auth.isOwner) {
      router.push('/login?error=unauthorized')
    }
  }, [auth.status, auth.isAuthenticated, auth.isOwner, router])

  return auth
}
