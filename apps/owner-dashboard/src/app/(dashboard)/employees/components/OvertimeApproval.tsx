'use client'

import { useState } from 'react'
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  User,
  MessageSquare
} from 'lucide-react'

interface OvertimeRequest {
  id: string
  employee_id: string
  employee_name: string
  employee_position: string
  date: string
  clock_in: string
  clock_out: string
  regular_hours: number
  overtime_hours: number
  overtime_pay: number
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  requested_at: string
}

interface OvertimeApprovalProps {
  request: OvertimeRequest
  onClose: () => void
  onComplete: () => void
}

export default function OvertimeApproval({ request, onClose, onComplete }: OvertimeApprovalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [sendNotification, setSendNotification] = useState(true)

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/overtime-requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'approved',
          admin_notes: adminNotes,
          send_notification: sendNotification
        })
      })

      if (!response.ok) {
        throw new Error('Failed to approve overtime request')
      }

      onComplete()
    } catch (error) {
      console.error('Error approving overtime:', error)
      alert('Failed to approve overtime request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/overtime-requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
          admin_notes: adminNotes,
          send_notification: sendNotification
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reject overtime request')
      }

      onComplete()
    } catch (error) {
      console.error('Error rejecting overtime:', error)
      alert('Failed to reject overtime request')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const isPending = request.status === 'pending'

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isPending ? 'Review Overtime Request' : 'Overtime Request Details'}
            </h2>
            <p className="text-sm text-gray-600">
              {isPending ? 'Approve or reject this overtime request' : `Status: ${request.status}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Employee Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{request.employee_name}</p>
                <p className="text-xs text-gray-500 capitalize">{request.employee_position}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(request.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {request.clock_in} - {request.clock_out}
                </p>
              </div>
            </div>
          </div>

          {/* Hours Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-blue-900 font-medium">Regular Hours</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{request.regular_hours.toFixed(1)}h</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <p className="text-xs text-orange-900 font-medium">Overtime Hours</p>
              </div>
              <p className="text-2xl font-bold text-orange-900">+{request.overtime_hours.toFixed(1)}h</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <p className="text-xs text-green-900 font-medium">Overtime Pay</p>
              </div>
              <p className="text-lg font-bold text-green-900">{formatCurrency(request.overtime_pay)}</p>
            </div>
          </div>

          {/* Employee Reason */}
          {request.reason && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee's Reason
              </label>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                {request.reason}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-2">
              {isPending ? 'Admin Notes (optional)' : 'Admin Notes'}
              {!isPending && request.status === 'rejected' && (
                <span className="text-red-600 ml-1">*Required for rejection</span>
              )}
            </label>
            <textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              disabled={!isPending}
              rows={3}
              placeholder={isPending ? "Add any notes or comments..." : "No notes provided"}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Notification Toggle */}
          {isPending && (
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="sendNotification"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sendNotification" className="flex items-center text-sm text-gray-700">
                <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                Send Telegram notification to employee
              </label>
            </div>
          )}

          {/* Request Info */}
          <div className="text-xs text-gray-500">
            <p>Requested at: {new Date(request.requested_at).toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Footer */}
        {isPending && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <XCircle className="h-4 w-4" />
              <span>{isProcessing ? 'Processing...' : 'Reject'}</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{isProcessing ? 'Processing...' : 'Approve'}</span>
            </button>
          </div>
        )}

        {!isPending && (
          <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
