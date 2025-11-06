'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Edit,
  Clock,
  BarChart3,
  MessageSquare,
  UserCheck,
  Briefcase,
  RefreshCw
} from 'lucide-react'

interface Employee {
  id: string
  user_id: string
  email: string
  full_name: string
  phone: string
  address?: string
  position: string
  salary_type: string
  salary_amount: number
  telegram_chat_id?: string
  is_active: boolean
  hire_date?: string
  employee_code?: string
  created_at: string
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadEmployee()
  }, [employeeId])

  const loadEmployee = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const { data } = await response.json()
        setEmployee(data)
      }
    } catch (error) {
      console.error('Error loading employee:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      pelayan: 'Pelayan',
      dapur: 'Dapur',
      kasir: 'Kasir',
      stok: 'Stok'
    }
    return labels[position] || position
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-600">Employee not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/employees"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Details</h1>
            <p className="text-gray-600">{employee.employee_code || 'N/A'}</p>
          </div>
        </div>
        <Link
          href={`/employees/${employeeId}/edit`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
        >
          <Edit className="h-4 w-4" />
          <span>Edit Employee</span>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href={`/employees/${employeeId}/attendance`}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Attendance</p>
              <p className="text-xs text-gray-600">View history</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/employees/${employeeId}/payroll`}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Payroll</p>
              <p className="text-xs text-gray-600">Salary details</p>
            </div>
          </div>
        </Link>

        <Link
          href="/employees/overtime-requests"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Overtime</p>
              <p className="text-xs text-gray-600">View requests</p>
            </div>
          </div>
        </Link>

        <Link
          href="/employees/shifts"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Shifts</p>
              <p className="text-xs text-gray-600">Schedule</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Employee Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              employee.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {employee.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="text-base font-medium text-gray-900">{employee.full_name}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-base font-medium text-gray-900">{employee.email}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="text-base font-medium text-gray-900">{employee.phone || '-'}</p>
              </div>
            </div>

            {employee.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-base font-medium text-gray-900">{employee.address}</p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Telegram</p>
                <p className="text-base font-medium text-gray-900">
                  {employee.telegram_chat_id ? (
                    <span className="text-green-600">Connected</span>
                  ) : (
                    <span className="text-gray-500">Not connected</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Employment Details</h2>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Briefcase className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Position</p>
                <p className="text-base font-medium text-gray-900">
                  {getPositionLabel(employee.position)}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <DollarSign className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Salary</p>
                <p className="text-base font-medium text-gray-900">
                  {formatCurrency(employee.salary_amount)}
                </p>
                <p className="text-xs text-gray-500 capitalize">{employee.salary_type}</p>
              </div>
            </div>

            {employee.hire_date && (
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Hire Date</p>
                  <p className="text-base font-medium text-gray-900">
                    {new Date(employee.hire_date).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <UserCheck className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Joined Since</p>
                <p className="text-base font-medium text-gray-900">
                  {new Date(employee.created_at).toLocaleDateString('id-ID', {
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
    </div>
  )
}
