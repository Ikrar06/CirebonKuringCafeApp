'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  position: string
  employee_code: string
  salary_type: string
  salary_amount: number
}

interface PayrollRecord {
  id: string
  month: string
  base_salary: number
  overtime_pay: number
  deductions: number
  total_pay: number
  work_days: number
  overtime_hours: number
  status: 'pending' | 'paid' | 'processing'
  paid_at?: string
  created_at: string
}

export default function EmployeePayrollPage() {
  const params = useParams()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadEmployee()
    loadPayrollRecords()
  }, [employeeId])

  const loadEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const { data } = await response.json()
        setEmployee(data)
      }
    } catch (error) {
      console.error('Error loading employee:', error)
    }
  }

  const loadPayrollRecords = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/employees/${employeeId}/payroll`)
      if (response.ok) {
        const { data } = await response.json()
        setPayrollRecords(data || [])
      }
    } catch (error) {
      console.error('Error loading payroll records:', error)
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

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Pending',
      processing: 'Processing',
      paid: 'Paid'
    }
    return labels[status as keyof typeof labels] || status
  }

  // Calculate summary stats
  const stats = {
    totalPaid: payrollRecords
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + r.total_pay, 0),
    totalOvertime: payrollRecords.reduce((sum, r) => sum + r.overtime_hours, 0),
    avgMonthly: payrollRecords.length > 0
      ? payrollRecords.reduce((sum, r) => sum + r.total_pay, 0) / payrollRecords.length
      : 0
  }

  if (!employee) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
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
            href={`/employees/${employeeId}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payroll History</h1>
            <p className="text-gray-600 flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{employee.full_name}</span>
              <span className="text-gray-400">•</span>
              <span className="capitalize">{employee.position}</span>
              <span className="text-gray-400">•</span>
              <span className="text-sm">{employee.employee_code}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase">Base Salary</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(employee.salary_amount)}
          </p>
          <p className="text-xs text-gray-600 mt-1 capitalize">{employee.salary_type}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Total Paid</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalPaid)}
          </p>
          <p className="text-xs text-gray-600 mt-1">All time</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-6 w-6 text-orange-600" />
            <span className="text-xs text-gray-500 uppercase">Total OT</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {stats.totalOvertime.toFixed(0)}h
          </p>
          <p className="text-xs text-gray-600 mt-1">Overtime hours</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-6 w-6 text-purple-600" />
            <span className="text-xs text-gray-500 uppercase">Avg Monthly</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(stats.avgMonthly)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Average</p>
        </div>
      </div>

      {/* Payroll Records */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : payrollRecords.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payroll Records</h3>
            <p className="text-gray-600">No payroll records found for this employee</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(record.month + '-01').toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {record.work_days} work days • {record.overtime_hours.toFixed(1)}h OT
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(record.base_salary)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-orange-600">
                        +{formatCurrency(record.overtime_pay)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.deductions > 0 ? (
                        <div className="text-sm font-medium text-red-600">
                          -{formatCurrency(record.deductions)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">
                        {formatCurrency(record.total_pay)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                      {record.paid_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Paid: {new Date(record.paid_at).toLocaleDateString('id-ID')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                        title="Download slip"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Payroll Information</h3>
          <p className="text-sm text-blue-800">
            Payroll is calculated based on attendance records, overtime hours, and configured salary rates.
            Monthly salaries are processed at the end of each month. Contact HR for any discrepancies.
          </p>
        </div>
      </div>
    </div>
  )
}
