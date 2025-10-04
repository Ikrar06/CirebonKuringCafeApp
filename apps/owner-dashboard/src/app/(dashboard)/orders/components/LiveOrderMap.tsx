'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/services/orderService'

interface Table {
  id: string
  table_number: string
  capacity: number
  status: 'available' | 'occupied' | 'reserved'
  location?: string
}

interface LiveOrderMapProps {
  orders: Order[]
}

export default function LiveOrderMap({ orders }: LiveOrderMapProps) {
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('table_number')

      if (error) throw error

      setTables(data || [])
    } catch (error) {
      console.error('Error loading tables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTableOrders = (tableId: string): Order[] => {
    // Only count active orders (not completed or cancelled)
    return orders.filter(order =>
      order.table_id === tableId &&
      !['completed', 'cancelled'].includes(order.status)
    )
  }

  const getTableStatus = (table: Table): { color: string; label: string } => {
    const tableOrders = getTableOrders(table.id)

    // No orders = table available
    if (tableOrders.length === 0) {
      return { color: 'bg-green-100 border-green-300 text-green-800', label: 'Available' }
    }

    // Priority: Check if any order is still pending payment/verification
    const hasPendingPayment = tableOrders.some(o => ['pending_payment', 'payment_verification'].includes(o.status))
    if (hasPendingPayment) {
      return { color: 'bg-yellow-100 border-yellow-300 text-yellow-800', label: 'Pending Payment' }
    }

    // Check if any order is confirmed/preparing
    const hasOrderInPrep = tableOrders.some(o => ['confirmed', 'preparing'].includes(o.status))
    if (hasOrderInPrep) {
      return { color: 'bg-orange-100 border-orange-300 text-orange-800', label: 'Ordering' }
    }

    // Check if orders are ready for delivery
    const hasReadyOrders = tableOrders.some(o => o.status === 'ready')
    if (hasReadyOrders) {
      return { color: 'bg-blue-100 border-blue-300 text-blue-800', label: 'Food Ready' }
    }

    // Check if food has been delivered (customer eating)
    const hasDeliveredOrders = tableOrders.some(o => o.status === 'delivered')
    if (hasDeliveredOrders) {
      return { color: 'bg-purple-100 border-purple-300 text-purple-800', label: 'Dining' }
    }

    // If all orders are completed/cancelled, table is available
    const allCompleted = tableOrders.every(o => ['completed', 'cancelled'].includes(o.status))
    if (allCompleted) {
      return { color: 'bg-green-100 border-green-300 text-green-800', label: 'Available' }
    }

    // Fallback: occupied
    return { color: 'bg-purple-100 border-purple-300 text-purple-800', label: 'Occupied' }
  }

  const getTotalAmount = (tableId: string): number => {
    const tableOrders = getTableOrders(tableId)
    return tableOrders.reduce((sum, order) => sum + parseFloat(order.total_amount?.toString() || '0'), 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Table Overview</h2>
        <p className="text-sm text-gray-600">Real-time table status and active orders</p>
        <p className="text-xs text-gray-500 mt-1">💡 Amount shown is total of unpaid/active orders. Completed orders are not counted.</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
          <span className="text-sm text-gray-700">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
          <span className="text-sm text-gray-700">Pending Payment</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
          <span className="text-sm text-gray-700">Ordering</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
          <span className="text-sm text-gray-700">Food Ready</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
          <span className="text-sm text-gray-700">Dining</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map((table) => {
          const status = getTableStatus(table)
          const tableOrders = getTableOrders(table.id)
          const totalAmount = getTotalAmount(table.id)

          return (
            <div
              key={table.id}
              className={`relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${status.color}`}
            >
              {/* Table Number */}
              <div className="text-center mb-2">
                <div className="text-2xl font-bold">
                  {table.table_number}
                </div>
                <div className="text-xs opacity-75">
                  {table.capacity} seats
                </div>
              </div>

              {/* Status */}
              <div className="text-center mb-2">
                <span className="text-xs font-medium">
                  {status.label}
                </span>
              </div>

              {/* Orders Info */}
              {tableOrders.length > 0 && (
                <div className="text-center space-y-1">
                  <div className="text-xs">
                    {tableOrders.length} active order{tableOrders.length > 1 ? 's' : ''}
                  </div>
                  {totalAmount > 0 && (
                    <div className="text-xs font-semibold" title="Total unpaid bill">
                      {formatCurrency(totalAmount)}
                    </div>
                  )}
                </div>
              )}

              {/* Location Badge */}
              {table.location && (
                <div className="absolute top-1 right-1">
                  <span className="text-xs px-1.5 py-0.5 bg-white bg-opacity-50 rounded">
                    {table.location}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {tables.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No tables configured yet.</p>
        </div>
      )}
    </div>
  )
}
