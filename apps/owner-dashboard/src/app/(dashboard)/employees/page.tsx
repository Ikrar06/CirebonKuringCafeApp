'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Calendar,
  MessageSquare,
  RefreshCw,
  Clock,
  Eye
} from 'lucide-react'

interface Employee {
  id: string
  user_id: string
  email: string
  full_name: string
  phone: string
  address?: string
  position: 'pelayan' | 'dapur' | 'kasir' | 'stok'
  salary_type: 'monthly' | 'daily' | 'hourly'
  salary_amount: number
  telegram_chat_id?: string
  is_active: boolean
  shift?: string
  hire_date?: string
  created_at: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPosition, setFilterPosition] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [deletingEmployee, setDeletingEmployee] = useState<string | null>(null)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setIsLoading(true)
    try {
      console.log('Fetching employees from frontend...')
      const response = await fetch('/api/employees')
      console.log('Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Response data:', result)
        console.log('Number of employees:', result.data?.length)
        setEmployees(result.data || [])
      } else {
        console.error('Response not OK:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading employees:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDeletingEmployee(null)
        loadEmployees()
      } else {
        alert('Failed to delete employee')
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      alert('Failed to delete employee')
    }
  }

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !searchQuery ||
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone?.includes(searchQuery)

    const matchesPosition = !filterPosition || emp.position === filterPosition
    const matchesStatus = !filterStatus ||
      (filterStatus === 'active' && emp.is_active) ||
      (filterStatus === 'inactive' && !emp.is_active)

    return matchesSearch && matchesPosition && matchesStatus
  })

  // Calculate stats
  const stats = {
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    inactive: employees.filter(e => !e.is_active).length,
    totalSalary: employees
      .filter(e => e.is_active && e.salary_type === 'monthly')
      .reduce((sum, e) => sum + e.salary_amount, 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      pelayan: 'bg-green-100 text-green-800',
      dapur: 'bg-orange-100 text-orange-800',
      kasir: 'bg-yellow-100 text-yellow-800',
      stok: 'bg-blue-100 text-blue-800'
    }
    return colors[position] || 'bg-gray-100 text-gray-800'
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage employee accounts and information</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/employees/shifts"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Shifts</span>
          </Link>
          <Link
            href="/employees/overtime-requests"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center space-x-2"
          >
            <Clock className="h-4 w-4" />
            <span>Overtime</span>
          </Link>
          <Link
            href="/employees/add"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-6 w-6 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-600 mt-1">Employees</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="h-6 w-6 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-gray-600 mt-1">Working</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <UserX className="h-6 w-6 text-red-600" />
            <span className="text-xs text-gray-500 uppercase">Inactive</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          <p className="text-xs text-gray-600 mt-1">Not working</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-6 w-6 text-purple-600" />
            <span className="text-xs text-gray-500 uppercase">Salary</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalSalary)}</p>
          <p className="text-xs text-gray-600 mt-1">Monthly total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Positions</option>
              <option value="pelayan">Pelayan</option>
              <option value="dapur">Dapur</option>
              <option value="kasir">Kasir</option>
              <option value="stok">Stok</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Employees Found</h3>
            <p className="text-gray-600 mb-6">Start by adding your first employee</p>
            <Link
              href="/employees/add"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add First Employee</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telegram</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                        <div className="text-xs text-gray-500">{employee.email}</div>
                        {employee.hire_date && (
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            Hired: {new Date(employee.hire_date).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {employee.phone && (
                          <div className="text-xs text-gray-600 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {employee.phone}
                          </div>
                        )}
                        {employee.address && (
                          <div className="text-xs text-gray-600 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {employee.address.substring(0, 30)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(employee.position)}`}>
                        {getPositionLabel(employee.position)}
                      </span>
                      {employee.shift && (
                        <div className="text-xs text-gray-500 mt-1">Shift: {employee.shift}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(employee.salary_amount)}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {employee.salary_type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {employee.telegram_chat_id ? (
                        <div className="flex items-center text-xs text-green-600">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Connected
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Not set</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        employee.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/employees/${employee.id}`}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/employees/${employee.id}/edit`}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title="Edit employee"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setDeletingEmployee(employee.id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                          title="Delete employee"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-red-900 mb-4">Delete Employee</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this employee? This will also remove their user account.
              This action cannot be undone.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDeletingEmployee(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deletingEmployee && handleDelete(deletingEmployee)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
