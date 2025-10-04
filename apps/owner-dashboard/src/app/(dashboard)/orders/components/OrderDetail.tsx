'use client'

import { useState, useEffect } from 'react'
import { X, Clock, User, MapPin, Phone, ChefHat, FileText, Check, XCircle } from 'lucide-react'
import { Order, orderService } from '@/services/orderService'
import { toast } from 'sonner'
import Image from 'next/image'
import OrderTimeline from './OrderTimeline'

interface OrderDetailProps {
  orderId: string
  onClose: () => void
  onOrderUpdate?: () => void
}

export default function OrderDetail({ orderId, onClose, onOrderUpdate }: OrderDetailProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      const data = await orderService.getOrderById(orderId)
      setOrder(data)
    } catch (error) {
      console.error('Error loading order:', error)
      toast.error('Failed to load order details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    if (!order) return

    setIsUpdating(true)
    try {
      await orderService.updateOrderStatus(order.id, newStatus)
      toast.success(`Order status updated to ${newStatus}`)
      await loadOrder()
      onOrderUpdate?.()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadgeClass = (status: Order['status']) => {
    const baseClass = 'px-3 py-1 rounded-full text-sm font-medium'
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-8 text-center">
          <p className="text-gray-600">Order not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const nextStatus = getNextStatus(order.status)
  const orderAge = orderService.getOrderAge(order)
  const prepTime = orderService.getOrderPreparationTime(order)

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h2>
            <p className="text-sm text-gray-600 mt-1">{formatDate(order.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status and Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-3">Order Status</h3>
              <div className="flex items-center gap-3">
                <span className={getStatusBadgeClass(order.status)}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                </span>
                {order.payment_status && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.payment_status === 'verified' ? 'bg-green-100 text-green-800' :
                    order.payment_status === 'processing' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </span>
                )}
              </div>
              {orderAge > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{orderAge} minutes old</span>
                </div>
              )}
              {prepTime && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <ChefHat className="h-4 w-4" />
                  <span>Preparation time: {prepTime} minutes</span>
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-3">Customer Information</h3>
              <div className="space-y-2">
                {order.customer_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900">{order.customer_name}</span>
                  </div>
                )}
                {order.customer_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900">{order.customer_phone}</span>
                  </div>
                )}
                {order.tables && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900">Table {order.tables.table_number}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900 capitalize">{order.order_type.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0">
                  {item.menu_items?.image_url && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={item.menu_items.image_url}
                        alt={item.menu_items.name || 'Menu item'}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.menu_items?.name || 'Unknown Item'}</h4>
                    <p className="text-sm text-gray-600">
                      {item.quantity} × {formatCurrency(parseFloat(item.unit_price?.toString() || '0'))}
                    </p>
                    {item.special_instructions && (
                      <p className="text-sm text-gray-500 mt-1 italic">Note: {item.special_instructions}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(parseFloat(item.subtotal?.toString() || '0'))}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(parseFloat(order.subtotal?.toString() || '0'))}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">{formatCurrency(parseFloat(order.tax_amount?.toString() || '0'))}</span>
                </div>
              )}
              {order.service_charge > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Service Charge</span>
                  <span className="text-gray-900">{formatCurrency(parseFloat(order.service_charge?.toString() || '0'))}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-600">Discount</span>
                  <span className="text-red-600">-{formatCurrency(parseFloat(order.discount_amount?.toString() || '0'))}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCurrency(parseFloat(order.total_amount?.toString() || '0'))}</span>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-900 mb-1">Special Instructions</h3>
                  <p className="text-yellow-800 text-sm">{order.special_instructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Information */}
          {(order.payment_method || order.payment_proof_url) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>

              {order.payment_method && (
                <div className="mb-4">
                  <span className="text-sm text-gray-600">Payment Method:</span>
                  <div className={`inline-block ml-2 px-3 py-1 rounded-full text-sm font-medium ${
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

              {order.payment_proof_url && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Payment Proof:</h4>
                  <div className="relative w-full h-96 border border-gray-200 rounded-lg bg-gray-50">
                    <Image
                      src={order.payment_proof_url}
                      alt="Payment proof"
                      fill
                      className="object-contain rounded-lg"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <a
                    href={order.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm underline mt-2 inline-block"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Order Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h3>
            <OrderTimeline order={order} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
            {nextStatus && order.status !== 'completed' && order.status !== 'cancelled' && (
              <button
                onClick={() => handleStatusUpdate(nextStatus)}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="h-5 w-5" />
                <span>{isUpdating ? 'Updating...' : `Mark as ${nextStatus.replace('_', ' ')}`}</span>
              </button>
            )}

            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <button
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={isUpdating}
                className="px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <XCircle className="h-5 w-5" />
                <span>Cancel Order</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
