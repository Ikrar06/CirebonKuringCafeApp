'use client'

import { useState, useEffect } from 'react'
import { 
  Clock,
  CheckCircle,
  AlertCircle,
  ChefHat,
  Utensils,
  CreditCard,
  Package,
  Star,
  MessageSquare
} from 'lucide-react'
import { OrderTimeline } from './OrderTimeline'
import { RatingForm } from './RatingForm'
import { useOrderStatus } from '@/hooks/useOrderStatus'

// Types
interface OrderStatus {
  id: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed'
  payment_status: 'pending' | 'verified' | 'failed'
  created_at: string
  updated_at: string
  estimated_completion?: string
  preparation_time?: number
  items: OrderItem[]
  total_amount: number
  customer_name: string
  table_number: number
}

interface OrderItem {
  id: string
  menu_item: {
    name: string
    image_url?: string
  }
  quantity: number
  customizations?: any[]
  subtotal: number
}

interface OrderTrackerProps {
  orderId: string
  tableId: string
  onRatingComplete?: () => void
  className?: string
}

// Status configurations
interface StatusConfig {
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  borderColor: string
  title: string
  description: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    title: 'Menunggu Pembayaran',
    description: 'Pesanan Anda sedang menunggu konfirmasi pembayaran dari kasir'
  },
  confirmed: {
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    title: 'Pembayaran Dikonfirmasi',
    description: 'Pembayaran berhasil, pesanan akan segera diproses dapur'
  },
  preparing: {
    icon: ChefHat,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    title: 'Sedang Dipersiapkan',
    description: 'Chef sedang menyiapkan pesanan Anda dengan penuh cinta'
  },
  ready: {
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    title: 'Siap Disajikan',
    description: 'Pesanan sudah siap! Pelayan akan segera mengantar ke meja Anda'
  },
  served: {
    icon: Utensils,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    title: 'Telah Disajikan',
    description: 'Pesanan telah tiba di meja Anda. Selamat menikmati!'
  },
  completed: {
    icon: Star,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    title: 'Pesanan Selesai',
    description: 'Terima kasih! Jangan lupa berikan rating untuk pesanan Anda'
  }
}

export function OrderTracker({ 
  orderId, 
  tableId, 
  onRatingComplete,
  className = '' 
}: OrderTrackerProps) {
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  
  const { 
    order, 
    loading, 
    error, 
    refreshOrder 
  } = useOrderStatus(orderId)

  // Calculate estimated completion time
  useEffect(() => {
    if (order?.status === 'preparing' && order.preparation_time) {
      const prepTime = order.preparation_time * 60 * 1000 // Convert to milliseconds
      const startTime = new Date(order.updated_at).getTime()
      const completionTime = startTime + prepTime
      const remainingTime = Math.max(0, completionTime - Date.now())
      
      setEstimatedTime(Math.ceil(remainingTime / (60 * 1000))) // Convert to minutes
      
      // Update every minute
      const interval = setInterval(() => {
        const newRemainingTime = Math.max(0, completionTime - Date.now())
        setEstimatedTime(Math.ceil(newRemainingTime / (60 * 1000)))
      }, 60000)
      
      return () => clearInterval(interval)
    }
  }, [order])

  // Auto-refresh order status
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrder()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [refreshOrder])

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Gagal Memuat Status Pesanan
        </h3>
        <p className="text-gray-600 mb-4">
          {error || 'Terjadi kesalahan saat memuat status pesanan'}
        </p>
        <button
          onClick={refreshOrder}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  const currentConfig = STATUS_CONFIG[order.status]
  const StatusIcon = currentConfig.icon
  const canRate = order.status === 'completed'

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Status Header */}
      <div className={`rounded-xl p-6 border-2 ${currentConfig.bgColor} ${currentConfig.borderColor}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-white ${currentConfig.color}`}>
            <StatusIcon className="w-8 h-8" />
          </div>
          
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${currentConfig.color} mb-1`}>
              {currentConfig.title}
            </h2>
            <p className="text-gray-700 mb-3">
              {currentConfig.description}
            </p>
            
            {/* Estimated Time */}
            {order.status === 'preparing' && estimatedTime !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-gray-900">
                  Estimasi: {estimatedTime > 0 ? `${estimatedTime} menit lagi` : 'Segera selesai'}
                </span>
              </div>
            )}
            
            {/* Payment Status for Pending Orders */}
            {order.status === 'pending' && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-gray-900">
                  Status Pembayaran: {order.payment_status === 'pending' ? 'Menunggu Verifikasi' : 'Diproses'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Timeline */}
      <OrderTimeline
        currentStatus={order.status}
        paymentStatus={order.payment_status}
        createdAt={order.created_at}
        updatedAt={order.updated_at}
        estimatedCompletion={order.estimated_completion}
      />

      {/* Order Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Ringkasan Pesanan #{orderId.slice(-8).toUpperCase()}
        </h3>
        
        <div className="space-y-4">
          {/* Customer & Table Info */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Atas Nama</span>
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Nomor Meja</span>
            <span className="font-medium">#{order.table_number}</span>
          </div>
          
          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Items Pesanan:</h4>
            {order.items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 py-2">
                {item.menu_item.image_url && (
                  <img
                    src={item.menu_item.image_url}
                    alt={item.menu_item.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.menu_item.name}</p>
                  {item.customizations && item.customizations.length > 0 && (
                    <p className="text-sm text-gray-600">
                      {item.customizations.map((c: any) => c.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.quantity}x</p>
                  <p className="text-sm text-gray-600">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0
                    }).format(item.subtotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Total */}
          <div className="flex justify-between items-center py-3 border-t border-gray-200 font-semibold text-lg">
            <span>Total Pembayaran</span>
            <span className="text-green-600">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
              }).format(order.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Rating Section */}
      {canRate && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Bagaimana Pengalaman Anda?
            </h3>
          </div>
          
          <p className="text-gray-700 mb-4">
            Berikan rating dan feedback untuk membantu kami meningkatkan pelayanan
          </p>
          
          {!showRatingForm ? (
            <button
              onClick={() => setShowRatingForm(true)}
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Berikan Rating
            </button>
          ) : (
            <RatingForm
              orderId={orderId}
              onComplete={() => {
                setShowRatingForm(false)
                onRatingComplete?.()
              }}
              onCancel={() => setShowRatingForm(false)}
            />
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={refreshOrder}
          className="text-gray-600 hover:text-gray-900 transition-colors text-sm flex items-center gap-2 mx-auto"
        >
          <Clock className="w-4 h-4" />
          Refresh Status
        </button>
      </div>
    </div>
  )
}