'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import RealtimeMetrics from '@/components/dashboard/RealtimeMetrics'

export default function DashboardPage() {
  const { status } = useSession()
  const { user, isAuthenticated, isOwner } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!isAuthenticated) {
      // User is not authenticated, redirect to login
      router.replace('/login')
      return
    }

    if (!isOwner) {
      // User is authenticated but not an owner, redirect to login with error
      router.replace('/login?error=unauthorized')
      return
    }
  }, [status, isAuthenticated, isOwner, router])

  // Show loading state while checking auth or redirecting
  if (status === 'loading' || !isAuthenticated || !isOwner) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  Dashboard Owner
                </h1>
                <p className="text-gray-600">
                  Selamat datang kembali, <span className="font-semibold text-blue-600">{user?.name || 'Owner'}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Tanggal</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-6">
        {/* Real-time Metrics Component */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <RealtimeMetrics />
        </div>
      </div>
    </div>
  )
}
