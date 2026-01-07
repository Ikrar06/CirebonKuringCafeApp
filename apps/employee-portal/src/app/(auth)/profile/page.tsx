'use client'

import { useAuth } from '@/lib/auth/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import {
  User, Mail, Phone, MapPin, Calendar, Briefcase,
  Shield, AlertCircle, Umbrella, Stethoscope, Key,
  Clock, DollarSign, Users
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function ProfilePage() {
  const { employee } = useAuth()
  const router = useRouter()

  if (!employee) {
    return null
  }

  const InfoCard = ({ icon: Icon, label, value, className = '' }: any) => (
    <div className={`flex items-start space-x-3 ${className}`}>
      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-base font-medium text-gray-900 break-words">{value || '-'}</p>
      </div>
    </div>
  )

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: id })
    } catch {
      return '-'
    }
  }

  const getEmploymentStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800'
    }
    const text = {
      active: 'Aktif',
      inactive: 'Tidak Aktif',
      suspended: 'Ditangguhkan',
      terminated: 'Diberhentikan'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges] || badges.active}`}>
        {text[status as keyof typeof text] || status}
      </span>
    )
  }

  const getSalaryTypeText = (type: string) => {
    const types = {
      monthly: 'Bulanan',
      daily: 'Harian',
      hourly: 'Per Jam'
    }
    return types[type as keyof typeof types] || type
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <User className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">{employee.full_name}</h1>
                <p className="text-blue-100 mb-2 capitalize">{employee.position}</p>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Kode: {employee.employee_code}</span>
                </div>
              </div>
            </div>
            {getEmploymentStatusBadge(employee.employment_status || 'active')}
          </div>
        </div>

        {/* Saldo Cuti */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-green-700 mb-2">
                  <Umbrella className="h-5 w-5" />
                  <span className="font-medium">Cuti Tahunan</span>
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {employee.annual_leave_balance || 0}
                </p>
                <p className="text-sm text-green-600 mt-1">hari tersisa</p>
              </div>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Umbrella className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-blue-700 mb-2">
                  <Stethoscope className="h-5 w-5" />
                  <span className="font-medium">Cuti Sakit</span>
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {employee.sick_leave_balance || 0}
                </p>
                <p className="text-sm text-blue-600 mt-1">hari tersisa</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Stethoscope className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Informasi Pribadi */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Informasi Pribadi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard
              icon={User}
              label="Nama Lengkap"
              value={employee.full_name}
            />
            <InfoCard
              icon={Shield}
              label="Kode Karyawan"
              value={employee.employee_code}
            />
            <InfoCard
              icon={Phone}
              label="Nomor Telepon"
              value={employee.phone_number}
            />
            <InfoCard
              icon={Mail}
              label="Username"
              value={employee.username}
            />
            {employee.address && (
              <InfoCard
                icon={MapPin}
                label="Alamat"
                value={employee.address}
                className="md:col-span-2"
              />
            )}
          </div>
        </div>

        {/* Informasi Pekerjaan */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
            Informasi Pekerjaan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard
              icon={Briefcase}
              label="Posisi"
              value={employee.position?.charAt(0).toUpperCase() + employee.position?.slice(1) || '-'}
            />
            <InfoCard
              icon={Calendar}
              label="Tanggal Bergabung"
              value={formatDate(employee.join_date)}
            />
            <InfoCard
              icon={DollarSign}
              label="Tipe Gaji"
              value={getSalaryTypeText(employee.salary_type || 'monthly')}
            />
            <InfoCard
              icon={DollarSign}
              label="Gaji"
              value={formatCurrency(employee.salary_amount || 0)}
            />
            {employee.contract_end_date && (
              <InfoCard
                icon={Clock}
                label="Akhir Kontrak"
                value={formatDate(employee.contract_end_date)}
              />
            )}
          </div>
        </div>

        {/* Kontak Darurat */}
        {(employee.emergency_contact || employee.emergency_phone) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
              Kontak Darurat
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoCard
                icon={Users}
                label="Nama Kontak"
                value={employee.emergency_contact}
              />
              <InfoCard
                icon={Phone}
                label="Nomor Telepon"
                value={employee.emergency_phone}
              />
            </div>
          </div>
        )}

        {/* Aksi */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Key className="h-5 w-5 mr-2 text-blue-600" />
            Keamanan Akun
          </h2>
          <button
            onClick={() => router.push('/change-password')}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
          >
            <Key className="h-5 w-5" />
            <span>Ubah Password</span>
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Pastikan untuk mengubah password secara berkala untuk keamanan akun Anda.
          </p>
        </div>

        {/* Footer Info */}
        {employee.last_login && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                Login terakhir: {format(new Date(employee.last_login), 'dd MMMM yyyy HH:mm', { locale: id })}
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
