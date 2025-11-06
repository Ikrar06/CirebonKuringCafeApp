'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DollarSign,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2,
  Eye,
  Download,
  Send,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  employee_code: string
  position: string
  salary_type: string
  salary_amount: number
}

interface Payroll {
  id: string
  employee_id: string
  month: string
  year: string
  period_start: string
  period_end: string
  present_days: number
  absent_days: number
  late_days: number
  overtime_hours: number
  basic_salary: number
  overtime_pay: number
  gross_salary: number
  late_deduction: number
  absence_deduction: number
  total_deductions: number
  net_salary: number
  payment_status: 'pending' | 'paid' | 'cancelled'
  payment_date: string | null
  payment_reference: string | null
  created_at: string
  employees: Employee
}

export default function PayrollPage() {
  const router = useRouter()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filter states
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterStatus, setFilterStatus] = useState('')

  // Generate modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateMonth, setGenerateMonth] = useState((new Date().getMonth() + 1).toString())
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear().toString())
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(true)
  const [sendNotifications, setSendNotifications] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // Detail modal states
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState<any>({})

  useEffect(() => {
    fetchEmployees()
    fetchPayrolls()
  }, [filterMonth, filterYear, filterStatus])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching employees:', err)
    }
  }

  const fetchPayrolls = async () => {
    try {
      setIsLoading(true)
      let url = '/api/payroll?'
      if (filterMonth) url += `month=${filterMonth}&`
      if (filterYear) url += `year=${filterYear}&`
      if (filterStatus) url += `payment_status=${filterStatus}&`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPayrolls(data.data || [])
      } else {
        setError('Failed to fetch payrolls')
      }
    } catch (err) {
      console.error('Error fetching payrolls:', err)
      setError('An error occurred while fetching payrolls')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePayroll = async () => {
    if (!generateMonth || !generateYear) {
      setError('Please select month and year')
      return
    }

    setIsGenerating(true)
    setError('')
    setSuccess('')

    try {
      // Calculate period dates
      const year = parseInt(generateYear)
      const month = parseInt(generateMonth)
      const periodStart = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const periodEnd = new Date(year, month, 0).toISOString().split('T')[0]

      const payload = {
        employee_ids: selectAll ? null : selectedEmployees,
        month: generateMonth,
        year: generateYear,
        period_start: periodStart,
        period_end: periodEnd,
        send_notifications: sendNotifications
      }

      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate payroll')
      }

      setSuccess(`Payroll generated for ${data.total} employees!`)
      setShowGenerateModal(false)
      fetchPayrolls()

      // Reset form
      setSelectAll(true)
      setSelectedEmployees([])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMarkAsPaid = async (payrollId: string) => {
    if (!confirm('Mark this payroll as paid?')) return

    try {
      const response = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payroll_id: payrollId,
          payment_status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark as paid')
      }

      setSuccess('Payroll marked as paid!')
      fetchPayrolls()
      setShowDetailModal(false)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeletePayroll = async (payrollId: string) => {
    if (!confirm('Delete this payroll record?')) return

    try {
      const response = await fetch(`/api/payroll?id=${payrollId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete payroll')
      }

      setSuccess('Payroll deleted!')
      fetchPayrolls()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </span>
        )
      default:
        return null
    }
  }

  const stats = {
    total: payrolls.length,
    pending: payrolls.filter(p => p.payment_status === 'pending').length,
    paid: payrolls.filter(p => p.payment_status === 'paid').length,
    totalAmount: payrolls.reduce((sum, p) => sum + p.net_salary, 0)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <DollarSign className="h-6 w-6" />
            <span>Payroll Management</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Manage employee payroll and salary payments
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Generate Payroll</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.paid}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalAmount)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            >
              <option value="">All Years</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            >
              <option value="">All Months</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterMonth('')
                setFilterYear(new Date().getFullYear().toString())
                setFilterStatus('')
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Success</p>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Basic Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-gray-500">No payroll records found</p>
                  </td>
                </tr>
              ) : (
                payrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payroll.employees?.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payroll.employees?.position}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {months.find(m => m.value === payroll.month)?.label} {payroll.year}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payroll.period_start} - {payroll.period_end}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payroll.basic_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payroll.net_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payroll.payment_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPayroll(payroll)
                          setShowDetailModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {payroll.payment_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleMarkAsPaid(payroll.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePayroll(payroll.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Generate Payroll</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Period Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month *
                  </label>
                  <select
                    value={generateMonth}
                    onChange={(e) => setGenerateMonth(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year *
                  </label>
                  <select
                    value={generateYear}
                    onChange={(e) => setGenerateYear(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>

              {/* Employee Selection */}
              <div>
                <label className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => {
                      setSelectAll(e.target.checked)
                      setSelectedEmployees([])
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Generate for all active employees
                  </span>
                </label>

                {!selectAll && (
                  <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {employees.map(emp => (
                      <label key={emp.id} className="flex items-center space-x-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmployees([...selectedEmployees, emp.id])
                            } else {
                              setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id))
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">
                          {emp.full_name} - {emp.position}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Options */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={sendNotifications}
                    onChange={(e) => setSendNotifications(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">
                    Send Telegram notifications to employees
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={isGenerating}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePayroll}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Generate Payroll</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Payroll Details</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedPayroll.employees?.full_name} - {months.find(m => m.value === selectedPayroll.month)?.label} {selectedPayroll.year}
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Earnings */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4">
                    Earnings
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Basic Salary</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedPayroll.basic_salary)}
                      </span>
                    </div>
                    {selectedPayroll.overtime_pay > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Overtime ({selectedPayroll.overtime_hours} hrs)
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(selectedPayroll.overtime_pay)}
                        </span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-200 flex justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        Gross Salary
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        {formatCurrency(selectedPayroll.gross_salary)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4">
                    Deductions
                  </h3>
                  <div className="space-y-3">
                    {selectedPayroll.late_deduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Late ({selectedPayroll.late_days} days)
                        </span>
                        <span className="text-sm font-medium text-red-600">
                          -{formatCurrency(selectedPayroll.late_deduction)}
                        </span>
                      </div>
                    )}
                    {selectedPayroll.absence_deduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Absence ({selectedPayroll.absent_days} days)
                        </span>
                        <span className="text-sm font-medium text-red-600">
                          -{formatCurrency(selectedPayroll.absence_deduction)}
                        </span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-200 flex justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        Total Deductions
                      </span>
                      <span className="text-sm font-bold text-red-600">
                        -{formatCurrency(selectedPayroll.total_deductions)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-900">
                    Net Salary (Take Home)
                  </span>
                  <span className="text-2xl font-bold text-green-900">
                    {formatCurrency(selectedPayroll.net_salary)}
                  </span>
                </div>
              </div>

              {/* Attendance Summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase mb-3">
                  Attendance Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-700">Present Days</p>
                    <p className="text-xl font-bold text-green-900">
                      {selectedPayroll.present_days}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-xs text-yellow-700">Late Days</p>
                    <p className="text-xl font-bold text-yellow-900">
                      {selectedPayroll.late_days}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-red-700">Absent Days</p>
                    <p className="text-xl font-bold text-red-900">
                      {selectedPayroll.absent_days}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {selectedPayroll.payment_status === 'paid' && selectedPayroll.payment_date && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    Payment Information
                  </p>
                  <p className="text-sm text-blue-800">
                    Paid on: {new Date(selectedPayroll.payment_date).toLocaleDateString('id-ID')}
                  </p>
                  {selectedPayroll.payment_reference && (
                    <p className="text-sm text-blue-800">
                      Reference: {selectedPayroll.payment_reference}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <div>
                {getStatusBadge(selectedPayroll.payment_status)}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Close
                </button>
                {selectedPayroll.payment_status === 'pending' && (
                  <button
                    onClick={() => handleMarkAsPaid(selectedPayroll.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Mark as Paid</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
