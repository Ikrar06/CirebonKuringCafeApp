'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import {
  Clock,
  FileText,
  Calendar,
  AlertCircle,
  CalendarDays,
  Timer,
  Bell,
  TrendingUp,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface TodaySchedule {
  shift_start: string
  shift_end: string
  shift_type: string
  break_duration: number
}

interface RecentActivity {
  type: 'leave' | 'overtime'
  title: string
  date: string
  status: 'pending' | 'approved' | 'rejected'
}

export default function DashboardPage() {
  const { employee } = useAuth()
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('employee_auth_token')
      if (!token) return

      // Fetch today's schedule
      const today = new Date()
      const scheduleResponse = await fetch(
        `/api/schedule?month=${today.getMonth() + 1}&year=${today.getFullYear()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        const todayStr = format(today, 'yyyy-MM-dd')
        const schedule = scheduleData.data?.find((s: any) => s.date === todayStr)
        setTodaySchedule(schedule || null)
      }

      // Fetch recent leave requests
      const leaveResponse = await fetch('/api/leave', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (leaveResponse.ok) {
        const leaveData = await leaveResponse.json()
        const leaveArray = Array.isArray(leaveData) ? leaveData : (leaveData.data || [])
        const activities: RecentActivity[] = leaveArray.slice(0, 3).map((leave: any) => ({
          type: 'leave',
          title: `Cuti ${leave.leave_type === 'annual' ? 'Tahunan' : 'Sakit'}`,
          date: leave.start_date,
          status: leave.status
        }))
        setRecentActivities(activities)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      name: 'Cuti Tahunan',
      value: employee?.annual_leave_balance || 0,
      unit: 'hari',
      icon: Calendar,
      color: 'blue',
      href: '/leave'
    },
    {
      name: 'Cuti Sakit',
      value: employee?.sick_leave_balance || 0,
      unit: 'hari',
      icon: AlertCircle,
      color: 'green',
      href: '/leave'
    },
  ]

  const quickActions = [
    {
      name: 'Absensi',
      description: 'Clock in/out hari ini',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      href: '/attendance'
    },
    {
      name: 'Jadwal Shift',
      description: 'Lihat jadwal kerja Anda',
      icon: CalendarDays,
      color: 'bg-purple-50 text-purple-600',
      href: '/schedule'
    },
    {
      name: 'Pengajuan Cuti',
      description: 'Ajukan cuti baru',
      icon: Calendar,
      color: 'bg-green-50 text-green-600',
      href: '/leave'
    },
    {
      name: 'Pengajuan Lembur',
      description: 'Ajukan lembur',
      icon: Timer,
      color: 'bg-orange-50 text-orange-600',
      href: '/overtime'
    },
    {
      name: 'Slip Gaji',
      description: 'Riwayat gaji Anda',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-600',
      href: '/payslip'
    },
    {
      name: 'Notifikasi',
      description: 'Atur notifikasi Telegram',
      icon: Bell,
      color: 'bg-yellow-50 text-yellow-600',
      href: '/notifications'
    },
  ]

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: HelpCircle, text: 'Menunggu' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Disetujui' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Ditolak' }
    }
    return badges[status as keyof typeof badges] || badges.pending
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold">
            Selamat Datang, {employee?.full_name}!
          </h1>
          <p className="mt-1 opacity-90">
            <span className="capitalize">{employee?.position}</span> • {employee?.employee_code}
          </p>
          <p className="mt-2 text-sm opacity-80">
            {format(new Date(), "EEEE, dd MMMM yyyy", { locale: id })}
          </p>
        </div>

        {/* Today's Schedule */}
        {todaySchedule && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Jadwal Hari Ini</h2>
              <Link href="/schedule" className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
                Lihat Semua
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1 bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Jam Masuk</p>
                <p className="text-2xl font-bold text-gray-900">{todaySchedule.shift_start.slice(0, 5)}</p>
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex-1 bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Jam Pulang</p>
                <p className="text-2xl font-bold text-gray-900">{todaySchedule.shift_end.slice(0, 5)}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Istirahat</p>
                <p className="text-2xl font-bold text-gray-900">{todaySchedule.break_duration}<span className="text-sm text-gray-500">m</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Link
                key={stat.name}
                href={stat.href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stat.value} <span className="text-lg text-gray-500">{stat.unit}</span>
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

        {/* Recent Activities */}
        {recentActivities.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h2>
              <Link href="/leave" className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
                Lihat Semua
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => {
                const badge = getStatusBadge(activity.status)
                const StatusIcon = badge.icon
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(activity.date), 'dd MMM yyyy', { locale: id })}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${badge.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{badge.text}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => {
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
                  <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Informasi Penting
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Pastikan GPS aktif saat melakukan absensi</li>
            <li>• Absensi hanya bisa dilakukan dalam radius 200m dari cafe</li>
            <li>• Notifikasi jadwal akan dikirim via Telegram</li>
            <li>• Pengajuan cuti minimal 3 hari sebelumnya</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
