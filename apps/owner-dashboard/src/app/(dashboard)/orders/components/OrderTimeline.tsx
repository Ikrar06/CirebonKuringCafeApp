'use client'

import { Check, Clock, ChefHat, Package, Truck, CheckCircle2, XCircle } from 'lucide-react'
import { Order } from '@/services/orderService'

interface OrderTimelineProps {
  order: Order
}

export default function OrderTimeline({ order }: OrderTimelineProps) {
  const formatTime = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short'
    })
  }

  const timelineSteps = [
    {
      key: 'created',
      label: 'Order Created',
      icon: Clock,
      timestamp: order.created_at,
      status: 'completed'
    },
    {
      key: 'payment_verified',
      label: 'Payment Verified',
      icon: Check,
      timestamp: order.status === 'pending_payment' || order.status === 'payment_verification' ? undefined : order.confirmed_at || order.created_at,
      status: order.status === 'pending_payment' || order.status === 'payment_verification' ? 'pending' : 'completed'
    },
    {
      key: 'confirmed',
      label: 'Order Confirmed',
      icon: CheckCircle2,
      timestamp: order.confirmed_at,
      status: order.confirmed_at ? 'completed' : (order.status === 'confirmed' ? 'current' : 'pending')
    },
    {
      key: 'preparing',
      label: 'Preparing',
      icon: ChefHat,
      timestamp: order.preparing_at,
      status: order.preparing_at ? 'completed' : (order.status === 'preparing' ? 'current' : 'pending')
    },
    {
      key: 'ready',
      label: 'Ready',
      icon: Package,
      timestamp: order.ready_at,
      status: order.ready_at ? 'completed' : (order.status === 'ready' ? 'current' : 'pending')
    },
    {
      key: 'delivered',
      label: 'Delivered',
      icon: Truck,
      timestamp: order.delivered_at,
      status: order.delivered_at ? 'completed' : (order.status === 'delivered' ? 'current' : 'pending')
    },
    {
      key: 'completed',
      label: 'Completed',
      icon: CheckCircle2,
      timestamp: order.completed_at,
      status: order.completed_at ? 'completed' : (order.status === 'completed' ? 'current' : 'pending')
    }
  ]

  // Filter out steps based on order status
  let displaySteps = timelineSteps

  // If cancelled, show only until the point where it was cancelled
  if (order.status === 'cancelled') {
    displaySteps = [
      ...timelineSteps.slice(0, 1),
      {
        key: 'cancelled',
        label: 'Order Cancelled',
        icon: XCircle,
        timestamp: order.updated_at,
        status: 'cancelled'
      }
    ]
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'current':
        return 'text-blue-600 bg-blue-100 ring-4 ring-blue-50'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-500 bg-gray-100'
    }
  }

  const getLineColor = (currentStatus: string, nextStatus?: string) => {
    if (currentStatus === 'completed' && (nextStatus === 'completed' || nextStatus === 'current')) {
      return 'bg-green-300'
    }
    if (currentStatus === 'cancelled') {
      return 'bg-red-300'
    }
    return 'bg-gray-200'
  }

  return (
    <div className="relative">
      <div className="space-y-4">
        {displaySteps.map((step, index) => {
          const Icon = step.icon
          const isLast = index === displaySteps.length - 1
          const nextStep = !isLast ? displaySteps[index + 1] : undefined

          return (
            <div key={step.key} className="relative flex items-start gap-4">
              {/* Timeline line */}
              {!isLast && (
                <div
                  className={`absolute left-5 top-10 w-0.5 h-full ${getLineColor(step.status, nextStep?.status)}`}
                />
              )}

              {/* Icon */}
              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${getStepColor(step.status)} transition-all`}>
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${
                    step.status === 'completed' ? 'text-gray-900' :
                    step.status === 'current' ? 'text-blue-900' :
                    step.status === 'cancelled' ? 'text-red-900' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </h4>
                  {step.timestamp && (
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        step.status === 'completed' ? 'text-gray-900' :
                        step.status === 'current' ? 'text-blue-900' :
                        step.status === 'cancelled' ? 'text-red-900' :
                        'text-gray-500'
                      }`}>
                        {formatTime(step.timestamp)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(step.timestamp)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                {step.status === 'current' && (
                  <p className="text-sm text-blue-600 mt-1">In progress...</p>
                )}
                {step.status === 'pending' && !step.timestamp && (
                  <p className="text-sm text-gray-500 mt-1">Waiting...</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Duration info */}
      {order.completed_at && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Duration</span>
            <span className="font-medium text-gray-900">
              {Math.round((new Date(order.completed_at).getTime() - new Date(order.created_at).getTime()) / 1000 / 60)} minutes
            </span>
          </div>
          {order.preparing_at && order.ready_at && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600">Preparation Time</span>
              <span className="font-medium text-gray-900">
                {Math.round((new Date(order.ready_at).getTime() - new Date(order.preparing_at).getTime()) / 1000 / 60)} minutes
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
