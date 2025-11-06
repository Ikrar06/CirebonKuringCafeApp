'use client'

import { useState } from 'react'
import { Save, AlertCircle, User, Mail, Phone, MapPin, Briefcase, DollarSign, Calendar, Lock } from 'lucide-react'
import TelegramSetup from './TelegramSetup'

interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormData) => Promise<void>
  initialData?: Partial<EmployeeFormData>
  isEdit?: boolean
}

export interface EmployeeFormData {
  email: string
  password?: string
  username?: string
  full_name: string
  phone: string
  address?: string
  position: 'pelayan' | 'dapur' | 'kasir' | 'stok'
  salary_type: 'monthly' | 'daily' | 'hourly'
  salary_amount: number
  telegram_chat_id?: string
  is_active: boolean
  hire_date?: string
}

export default function EmployeeForm({ onSubmit, initialData, isEdit = false }: EmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    email: initialData?.email || '',
    password: '',
    username: initialData?.username || '',
    full_name: initialData?.full_name || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    position: initialData?.position || 'pelayan',
    salary_type: initialData?.salary_type || 'monthly',
    salary_amount: initialData?.salary_amount || 0,
    telegram_chat_id: initialData?.telegram_chat_id || '',
    is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
    hire_date: initialData?.hire_date || new Date().toISOString().split('T')[0]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const positions = [
    { value: 'pelayan', label: 'Pelayan', description: 'Melayani pelanggan dan menerima pesanan' },
    { value: 'dapur', label: 'Dapur', description: 'Memasak dan menyiapkan makanan' },
    { value: 'kasir', label: 'Kasir', description: 'Menangani pembayaran dan transaksi' },
    { value: 'stok', label: 'Stok', description: 'Mengelola inventori dan stok barang' }
  ]

  const salaryTypes = [
    { value: 'monthly', label: 'Monthly', description: 'Fixed monthly salary' },
    { value: 'daily', label: 'Daily', description: 'Daily rate based on attendance' },
    { value: 'hourly', label: 'Hourly', description: 'Hourly rate based on hours worked' }
  ]

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Invalid email format'
    }

    if (!isEdit && !formData.password) {
      newErrors.password = 'Password is required for new employees'
    } else if (!isEdit && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!isEdit && !formData.username?.trim()) {
      newErrors.username = 'Username is required'
    } else if (!isEdit && formData.username && formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (!isEdit && formData.username && !/^[a-z0-9._]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain lowercase letters, numbers, dots, and underscores'
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    if (formData.salary_amount <= 0) {
      newErrors.salary_amount = 'Salary amount must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(formData)
    } catch (error: any) {
      console.error('Error submitting form:', error)
      setErrors({ submit: error.message || 'Failed to save employee. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Account Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Lock className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="employee@example.com"
                disabled={isEdit}
              />
            </div>
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
            {isEdit && (
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed after creation</p>
            )}
          </div>

          {!isEdit && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Minimum 6 characters"
                />
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Employee will change this on first login</p>
            </div>
          )}

          {!isEdit && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username * (for Employee Portal login)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., emp.kasir, dapur01, pelayan.budi"
                />
              </div>
              {errors.username && (
                <p className="text-red-600 text-sm mt-1">{errors.username}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, dots, and underscores. Employee will use this to login.</p>
            </div>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <User className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                errors.full_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="John Doe"
            />
            {errors.full_name && (
              <p className="text-red-600 text-sm mt-1">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="08123456789"
              />
            </div>
            {errors.phone && (
              <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hire Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                placeholder="Full address"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Job Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Briefcase className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Job Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {positions.map((pos) => (
                <label
                  key={pos.value}
                  className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    formData.position === pos.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="position"
                    value={pos.value}
                    checked={formData.position === pos.value}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{pos.label}</p>
                    <p className="text-xs text-gray-500">{pos.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Salary Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Salary Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salary Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {salaryTypes.map((type) => (
                <label
                  key={type.value}
                  className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    formData.salary_type === type.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="salary_type"
                    value={type.value}
                    checked={formData.salary_type === type.value}
                    onChange={(e) => setFormData({ ...formData, salary_type: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salary Amount (IDR) *
            </label>
            <input
              type="number"
              value={formData.salary_amount || ''}
              onChange={(e) => setFormData({ ...formData, salary_amount: parseFloat(e.target.value) || 0 })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                errors.salary_amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0"
            />
            {errors.salary_amount && (
              <p className="text-red-600 text-sm mt-1">{errors.salary_amount}</p>
            )}
            {formData.salary_amount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {formatCurrency(formData.salary_amount)} per {formData.salary_type === 'monthly' ? 'month' : formData.salary_type === 'daily' ? 'day' : 'hour'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Telegram Integration */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <TelegramSetup
          chatId={formData.telegram_chat_id}
          onChatIdChange={(chatId) => setFormData({ ...formData, telegram_chat_id: chatId })}
        />
      </div>

      {/* Status */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">Active Employee</span>
            <p className="text-xs text-gray-500">Employee can log in and access the system</p>
          </div>
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSubmitting ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}</span>
        </button>
      </div>
    </form>
  )
}
