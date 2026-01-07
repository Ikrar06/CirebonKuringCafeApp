'use client'

import { useAuth } from '@/lib/auth/AuthContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Clock,
  FileText,
  Calendar,
  CalendarDays,
  User,
  LogOut,
  Menu,
  X,
  Coffee,
  Timer,
  Bell
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { employee, logout } = useAuth()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Absensi', href: '/attendance', icon: Clock },
    { name: 'Slip Gaji', href: '/payslip', icon: FileText },
    { name: 'Jadwal', href: '/schedule', icon: CalendarDays },
    { name: 'Cuti', href: '/leave', icon: Calendar },
  ]

  const secondaryNavigation = [
    { name: 'Lembur', href: '/overtime', icon: Timer },
    { name: 'Notifikasi', href: '/notifications', icon: Bell },
    { name: 'Profil', href: '/profile', icon: User },
  ]

  const allNavigation = [...mainNavigation, ...secondaryNavigation]

  const handleLogout = () => {
    toast('Yakin ingin keluar?', {
      description: 'Anda akan keluar dari Employee Portal',
      action: {
        label: 'Keluar',
        onClick: () => {
          logout()
          toast.success('Berhasil logout')
        },
      },
      cancel: {
        label: 'Batal',
        onClick: () => {},
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg mr-2"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Coffee className="h-6 w-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900">Employee Portal</h1>
                  <p className="text-xs text-gray-500">Cirebon Kuring Cafe</p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {mainNavigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              {/* Secondary Navigation - Icon Only */}
              <div className="hidden lg:flex items-center space-x-1">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={item.name}
                      className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  )
                })}
              </div>

              <div className="hidden md:block h-6 w-px bg-gray-300"></div>

              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{employee?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{employee?.position}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {allNavigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
