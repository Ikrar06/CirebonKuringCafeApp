// app/(auth)/layout.tsx
'use client'

import { useEffect } from 'react'
import { useRequireAuth } from '@/lib/auth/AuthContext'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { employee, isLoading } = useRequireAuth()
  const pathname = usePathname()
  const router = useRouter()

  // daftar route publik yang boleh diakses tanpa auth
  const publicPaths = ['/login', '/change-password']

  const isPublic = publicPaths.includes(pathname)

  // redirect ke /login jika mencoba mengakses protected page tanpa employee
  useEffect(() => {
    if (!isLoading && !employee && !isPublic) {
      router.push('/login')
    }
  }, [isLoading, employee, isPublic, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Jika belum login dan route bukan publik -> sementara jangan render (useEffect akan redirect)
  if (!employee && !isPublic) {
    return null
  }

  // Render children untuk halaman publik maupun halaman protected jika sudah login
  return <>{children}</>
}
