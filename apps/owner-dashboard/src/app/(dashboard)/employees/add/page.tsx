'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import EmployeeForm, { EmployeeFormData } from '../components/EmployeeForm'

export default function AddEmployeePage() {
  const router = useRouter()

  const handleSubmit = async (data: EmployeeFormData) => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create employee')
      }

      // Success - redirect to employees list
      router.push('/employees')
    } catch (error: any) {
      // Error will be handled by the form component
      throw error
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <UserPlus className="h-6 w-6" />
              <span>Add New Employee</span>
            </h1>
            <p className="text-gray-600">Create a new employee account</p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Important Information</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>A user account will be created automatically with the provided email and password</li>
          <li><strong>Username</strong> will be used for Employee Portal login (e.g., employee logs in with username, not email)</li>
          <li>Employee will be required to change their password on first login to Employee Portal</li>
          <li>You can set their Telegram Chat ID now or add it later for notifications</li>
          <li>Make sure to communicate the login credentials (username and temporary password) to the employee securely</li>
        </ul>
      </div>

      {/* Form */}
      <EmployeeForm onSubmit={handleSubmit} />
    </div>
  )
}
