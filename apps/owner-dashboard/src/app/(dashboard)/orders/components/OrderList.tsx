'use client'

import { useState } from 'react'
import { Clock, User, MapPin, ChefHat, Check, XCircle, Image as ImageIcon } from 'lucide-react'
import { Order, orderService } from '@/services/orderService'
import { toast } from 'sonner'
import Image from 'next/image'

interface OrderListProps {
  orders: Order[]
  onOrderUpdate?: () => void
}

export default function OrderList({ orders, onOrderUpdate }: OrderListProps) {
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set())
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingOrders(prev => new Set(prev).add(orderId))

    try {
      // Use API endpoint to update order status
      const response = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update order status')
      }

      const result = await response.json()
      console.log('Order status update result:', result)

      toast.success(`Order status updated to ${newStatus}`)
      onOrderUpdate?.()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const getStatusBadgeClass = (status: Order['status']) => {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-medium'
    const colorMap: Record<Order['status'], string> = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      payment_verification: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return `${baseClass} ${colorMap[status]}`
  }

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const statusFlow: Record<Order['status'], Order['status'] | null> = {
      pending_payment: 'payment_verification',
      payment_verification: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'delivered',
      delivered: 'completed',
      completed: null,
      cancelled: null
    }
    return statusFlow[currentStatus]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <ChefHat className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Orders</h3>
        <p className="text-gray-600">All orders have been completed or there are no new orders.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const orderAge = orderService.getOrderAge(order)
        const isOverdue = orderAge > 30
        const isUpdating = updatingOrders.has(order.id)
        const nextStatus = getNextStatus(order.status)

        return (
          <div
            key={order.id}
            className={`bg-white rounded-xl border-2 p-6 transition-all ${
              isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    Order #{order.order_number}
                  </h3>
                  <span className={getStatusBadgeClass(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                  </span>
                  {isOverdue && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                      OVERDUE
                    </span>
                  )}
                  {order.payment_proof_url && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Has Proof
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {order.tables && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>Table {order.tables.table_number}</span>
                    </div>
                  )}
                  {order.customer_name && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{order.customer_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                      {orderAge}m ago
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(parseFloat(order.total_amount?.toString() || '0'))}
                </div>
                <div className={`text-sm font-medium ${
                  order.payment_status === 'verified' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {order.payment_status === 'verified' ? 'Paid' : order.payment_status === 'processing' ? 'Processing' : 'Pending'}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="space-y-2">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center font-medium">
                        {item.quantity}x
                      </span>
                      <span className="font-medium text-gray-900">
                        {item.menu_items?.name || 'Unknown Item'}
                      </span>
                    </div>
                    <span className="text-gray-600">
                      {formatCurrency(parseFloat(item.subtotal?.toString() || '0'))}
                    </span>
                  </div>
                ))}
              </div>

              {order.special_instructions && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Note:</span> {order.special_instructions}
                  </p>
                </div>
              )}
            </div>

            {/* Payment Proof Section */}
            {(order.payment_proof_url || order.payment_method) && (
              <div className="border-t border-gray-200 pt-4 mb-4">
                <button
                  onClick={() => toggleOrderExpand(order.id)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mb-3"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>
                    {expandedOrders.has(order.id) ? 'Hide' : 'Show'} Payment Details
                  </span>
                </button>

                {expandedOrders.has(order.id) && (
                  <div className="space-y-3">
                    {/* Payment Method Badge */}
                    {order.payment_method && (
                      <div>
                        <span className="text-xs font-medium text-gray-600">Payment Method:</span>
                        <div className={`inline-block ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                          order.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                          order.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                          order.payment_method === 'transfer' ? 'bg-purple-100 text-purple-800' :
                          order.payment_method === 'qris' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.payment_method === 'cash' ? '💰 Cash' :
                           order.payment_method === 'card' ? '💳 Card' :
                           order.payment_method === 'transfer' ? '🏦 Transfer' :
                           order.payment_method === 'qris' ? '📱 QRIS' :
                           order.payment_method}
                        </div>
                      </div>
                    )}

                    {/* Payment Proof Image */}
                    {order.payment_proof_url ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-600 mb-2">Payment Proof:</p>
                        <div className="relative w-full h-64 border border-gray-200 rounded bg-white">
                          <Image
                            src={order.payment_proof_url}
                            alt="Payment proof"
                            fill
                            className="object-contain rounded"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                        <a
                          href={order.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-xs underline mt-2 inline-block"
                        >
                          View full size image
                        </a>
                      </div>
                    ) : (
                      <div>
                        {(order.payment_method === 'cash' || order.payment_method === 'card') ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-blue-800 font-medium text-sm">
                              {order.payment_method === 'cash' ? '💰 Cash Payment' : '💳 Card Payment'}
                            </p>
                            <p className="text-blue-700 text-xs mt-1">
                              Customer will pay directly at cashier. No payment proof required.
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-xs">No payment proof uploaded</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              {nextStatus && (
                <button
                  onClick={() => handleStatusUpdate(order.id, nextStatus)}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {isUpdating ? 'Updating...' : `Mark as ${nextStatus}`}
                  </span>
                </button>
              )}

              {order.status !== 'cancelled' && order.status !== 'completed' && (
                <button
                  onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                  disabled={isUpdating}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            {/* Timeline */}
            {(order.confirmed_at || order.preparing_at || order.ready_at) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {order.confirmed_at && (
                    <span>Confirmed: {orderService.formatOrderTime(order.confirmed_at)}</span>
                  )}
                  {order.preparing_at && (
                    <>
                      <span>•</span>
                      <span>Preparing: {orderService.formatOrderTime(order.preparing_at)}</span>
                    </>
                  )}
                  {order.ready_at && (
                    <>
                      <span>•</span>
                      <span>Ready: {orderService.formatOrderTime(order.ready_at)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
