'use client'

import { useRouter } from 'next/navigation'
import {
  Store,
  CreditCard,
  Printer,
  Bell,
  User,
  Shield,
  Globe,
  MapPin,
  Percent,
  Clock,
  Package,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface SettingSection {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  badge?: string
}

const settingSections: SettingSection[] = [
  {
    id: 'cafe-info',
    title: 'Informasi Cafe',
    description: 'Nama cafe, alamat, jam operasional, dan kontak',
    icon: Store,
    href: '/settings/cafe-info',
    color: 'blue'
  },
  {
    id: 'tables',
    title: 'Manajemen Meja',
    description: 'Kelola meja, kapasitas, zone, dan QR code',
    icon: Globe,
    href: '/settings/tables',
    color: 'indigo'
  },
  {
    id: 'location',
    title: 'Lokasi GPS',
    description: 'Koordinat GPS cafe untuk validasi absensi karyawan',
    icon: MapPin,
    href: '/settings/location',
    color: 'red'
  },
  {
    id: 'payment-methods',
    title: 'Metode Pembayaran',
    description: 'Atur metode pembayaran yang diterima',
    icon: CreditCard,
    href: '/settings/payment-methods',
    color: 'green'
  },
  {
    id: 'telegram',
    title: 'Notifikasi Telegram',
    description: 'Konfigurasi bot Telegram untuk notifikasi',
    icon: Bell,
    href: '/settings/telegram',
    color: 'purple',
  },
  {
    id: 'printers',
    title: 'Konfigurasi Printer',
    description: 'Setup printer untuk kitchen dan bar',
    icon: Printer,
    href: '/settings/printers',
    color: 'orange'
  },
  {
    id: 'profile',
    title: 'Profile Owner',
    description: 'Informasi akun, email, dan password',
    icon: User,
    href: '/settings/profile',
    color: 'indigo'
  },
  {
    id: 'security',
    title: 'Keamanan & Privasi',
    description: 'Two-factor authentication dan session management',
    icon: Shield,
    href: '/settings/security',
    color: 'red'
  },
  {
    id: 'tax',
    title: 'Pajak & Service Charge',
    description: 'Atur tarif PPN dan biaya layanan',
    icon: Percent,
    href: '/settings/tax',
    color: 'orange'
  },
  {
    id: 'attendance-rules',
    title: 'Aturan Absensi',
    description: 'Validasi jarak, durasi istirahat, dan toleransi keterlambatan',
    icon: Clock,
    href: '/settings/attendance-rules',
    color: 'purple'
  },
  {
    id: 'inventory-alerts',
    title: 'Peringatan Inventory',
    description: 'Alert untuk stock rendah dan kadaluarsa',
    icon: Package,
    href: '/settings/inventory-alerts',
    color: 'yellow'
  }
]

const colorClasses: Record<string, { bg: string; text: string; hover: string; border: string }> = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    hover: 'hover:bg-blue-100',
    border: 'border-blue-200'
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    hover: 'hover:bg-green-100',
    border: 'border-green-200'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    hover: 'hover:bg-purple-100',
    border: 'border-purple-200'
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    hover: 'hover:bg-orange-100',
    border: 'border-orange-200'
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    hover: 'hover:bg-indigo-100',
    border: 'border-indigo-200'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    hover: 'hover:bg-red-100',
    border: 'border-red-200'
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    hover: 'hover:bg-yellow-100',
    border: 'border-yellow-200'
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <SettingsIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
              <p className="text-gray-600 mt-1">Kelola preferensi dan konfigurasi sistem</p>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user.name || 'Owner'}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200">
                Owner Account
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingSections.map((section) => {
            const Icon = section.icon
            const colors = colorClasses[section.color]

            return (
              <button
                key={section.id}
                onClick={() => router.push(section.href)}
                className={`bg-white border-2 border-gray-200 rounded-xl p-6 text-left transition-all hover:shadow-lg hover:border-gray-300 hover:-translate-y-1 group`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center ${colors.hover} transition-colors`}>
                    <Icon className={`h-7 w-7 ${colors.text}`} />
                  </div>
                  {section.badge && (
                    <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center space-x-1">
                      <Sparkles className="h-3 w-3" />
                      <span>{section.badge}</span>
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {section.description}
                  </p>
                </div>

                <div className="flex items-center text-sm font-medium text-gray-500 group-hover:text-blue-600 transition-colors">
                  <span>Buka Pengaturan</span>
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-600" />
            Informasi Sistem
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Versi Aplikasi</p>
              <p className="text-lg font-bold text-gray-900">v1.0.0</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Database Status</p>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-lg font-bold text-green-600">Connected</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Last Backup</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date().toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Perubahan yang Anda lakukan akan tersimpan secara otomatis</p>
        </div>
      </div>
    </div>
  )
}
