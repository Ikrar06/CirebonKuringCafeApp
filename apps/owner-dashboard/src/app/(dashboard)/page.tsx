'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Loader2,
  Users,
  Calendar,
  Timer,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  PackageX
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import RealtimeMetrics from '@/components/dashboard/RealtimeMetrics'

interface PendingRequest {
  type: 'leave' | 'overtime'
  id: string
  employee_name: string
  date: string
  status: string
}

export default function DashboardPage() {
  const { status } = useSession()
  const { user, isAuthenticated, isOwner } = useAuth()
  const router = useRouter()
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [employeeStats, setEmployeeStats] = useState({ active: 0, total: 0 })
  const [todayShifts, setTodayShifts] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (!isOwner) {
      router.replace('/login?error=unauthorized')
      return
    }

    fetchDashboardData()
  }, [status, isAuthenticated, isOwner, router])

  const fetchDashboardData = async () => {
    try {
      // Fetch pending leave requests
      const leaveRes = await fetch('/api/leave-requests')
      if (leaveRes.ok) {
        const leaveData = await leaveRes.json()
        const leaveArray = Array.isArray(leaveData) ? leaveData : (leaveData.data || [])
        const pending = leaveArray.filter((req: any) => req.status === 'pending').slice(0, 5)
        const formattedLeave = pending.map((req: any) => ({
          type: 'leave' as const,
          id: req.id,
          employee_name: req.employee?.full_name || 'Unknown',
          date: req.start_date,
          status: req.status
        }))

        // Fetch pending overtime requests
        const overtimeRes = await fetch('/api/overtime-requests')
        if (overtimeRes.ok) {
          const overtimeData = await overtimeRes.json()
          const overtimeArray = Array.isArray(overtimeData) ? overtimeData : (overtimeData.data || [])
          const pendingOT = overtimeArray.filter((req: any) => req.status === 'pending').slice(0, 5)
          const formattedOT = pendingOT.map((req: any) => ({
            type: 'overtime' as const,
            id: req.id,
            employee_name: req.employee?.full_name || 'Unknown',
            date: req.overtime_date,
            status: req.status
          }))

          setPendingRequests([...formattedLeave, ...formattedOT].slice(0, 5))
        }
      }

      // Fetch employee stats
      const employeeRes = await fetch('/api/employees')
      if (employeeRes.ok) {
        const employeeData = await employeeRes.json()
        const employees = Array.isArray(employeeData) ? employeeData : (employeeData.data || [])
        setEmployeeStats({
          active: employees.filter((e: any) => e.employment_status === 'active').length,
          total: employees.length
        })
      }

      // You can add more API calls here for schedules, etc.

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const quickStats = [
    {
      label: 'Karyawan Aktif',
      value: employeeStats.active,
      total: employeeStats.total,
      icon: Users,
      color: 'blue',
      href: '/employees'
    },
    {
      label: 'Pengajuan Pending',
      value: pendingRequests.length,
      icon: Clock,
      color: 'yellow',
      href: '/leave-requests'
    },
  ]

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
      <div className="max-w-7xl mx-auto py-6 px-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stat.value}
                      {stat.total && (
                        <span className="text-lg text-gray-500">/{stat.total}</span>
                      )}
                    </p>
                  </div>
                  <div className={`p-3 bg-${stat.color}-50 rounded-lg`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Pengajuan Menunggu Persetujuan</h2>
              <Link href="/leave-requests" className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
                Lihat Semua
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={`${request.type}-${request.id}`}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div className="flex items-center space-x-3">
                    {request.type === 'leave' ? (
                      <Calendar className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <Timer className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.type === 'leave' ? 'Pengajuan Cuti' : 'Pengajuan Lembur'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {request.employee_name} • {new Date(request.date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={request.type === 'leave' ? '/leave-requests' : '/overtime-requests'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Metrics Component */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <RealtimeMetrics />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Akses Cepat</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              { name: 'Karyawan', href: '/employees', icon: Users, color: 'bg-blue-50 text-blue-600' },
              { name: 'Jadwal Shift', href: '/employees', icon: Calendar, color: 'bg-purple-50 text-purple-600' },
              { name: 'Pengajuan Cuti', href: '/leave-requests', icon: Calendar, color: 'bg-green-50 text-green-600' },
              { name: 'Pengajuan Lembur', href: '/overtime-requests', icon: Timer, color: 'bg-orange-50 text-orange-600' },
              { name: 'Analytics', href: '/analytics', icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.name}
                  href={action.href}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all hover:border-blue-200"
                >
                  <div className={`inline-flex p-3 ${action.color} rounded-lg mb-3`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{action.name}</h3>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
