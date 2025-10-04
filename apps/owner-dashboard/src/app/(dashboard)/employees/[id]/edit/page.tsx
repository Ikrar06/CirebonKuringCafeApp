'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserCog, RefreshCw } from 'lucide-react'
import EmployeeForm, { EmployeeFormData } from '../../components/EmployeeForm'

export default function EditEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<EmployeeFormData | null>(null)
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
      } else {
        alert('Failed to load employee data')
        router.push('/employees')
      }
    } catch (error) {
      console.error('Error loading employee:', error)
      alert('Failed to load employee data')
      router.push('/employees')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (data: EmployeeFormData) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update employee')
      }

      router.push('/employees')
    } catch (error: any) {
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-600">Employee not found</p>
        </div>
      </div>
    )
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
              <UserCog className="h-6 w-6" />
              <span>Edit Employee</span>
            </h1>
            <p className="text-gray-600">Update employee information</p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Important Information</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Changes will be saved to the employee's profile immediately</li>
          <li>Email cannot be changed after account creation</li>
          <li>Password field is optional - leave blank to keep current password</li>
          <li>Employee will receive notifications if Telegram is configured</li>
        </ul>
      </div>

      {/* Form */}
      <EmployeeForm initialData={employee} onSubmit={handleSubmit} />
    </div>
  )
}
