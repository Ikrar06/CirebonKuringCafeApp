'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Clock,
  CheckCircle,
  AlertCircle,
  ChefHat,
  Utensils,
  Star,
  MapPin,
  Receipt,
  Phone,
  MessageCircle,
  RefreshCw,
  ArrowLeft,
  Bell,
  BellOff,
  Share2,
  Download,
  X
} from 'lucide-react'

// Hooks and API
import useTable from '@/hooks/useTable'
import apiClient from '@/lib/api/client'

// Types
interface OrderStatus {
  id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  customer_name: string
  table_number: string
  total_amount: number
  created_at: string
  updated_at: string
  estimated_completion: string | null
  actual_completion: string | null
  items: OrderItem[]
  payment_proof_url?: string
  special_notes?: string
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  customizations?: Record<string, string[]>
  notes?: string
  status: 'pending' | 'preparing' | 'ready' | 'served'
  preparation_time: number
}

interface ProgressStep {
  id: string
  title: string
  description: string
  status: 'completed' | 'current' | 'pending'
  timestamp?: string
  icon: React.ReactNode
  estimatedTime?: number
}

interface OrderStatusResponse {
  status: string
  estimated_completion: string | null
  progress_steps: Array<{
    step: string
    completed: boolean
    timestamp?: string
  }>
}

export default function OrderStatusPage() {
  const params = useParams()
  const router = useRouter()
  const tableId = params.tableId as string
  const orderId = params.orderId as string

  // Helper function to generate order number
  const generateOrderNumber = (orderId: string) => {
    return orderId.slice(-8).toUpperCase()
  }

  // Hooks
  const { table, isValidSession } = useTable()

  // State management
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const subscriptionRef = useRef<any>(null)

  // Load order status on mount
  useEffect(() => {
    if (!orderId) {
      toast.error('ID pesanan tidak valid')
      router.push(`/${tableId}`)
      return
    }

    loadOrderStatus()
    subscribeToUpdates()

    // Auto refresh every 30 seconds
    intervalRef.current = setInterval(loadOrderStatus, 30000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [orderId, tableId, router])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast.success('Notifikasi diaktifkan')
        }
      })
    }
  }, [])

  // Load order status
  const loadOrderStatus = async () => {
    try {
      if (!isLoading) setIsRefreshing(true)
      setError(null)

      // Load both order details and status
      const [orderResponse, statusResponse] = await Promise.all([
        apiClient.getOrder(orderId),
        apiClient.getOrderStatus(orderId)
      ])
      
      if (orderResponse.error) {
        throw new Error(orderResponse.error.message)
      }

      if (statusResponse.error) {
        throw new Error(statusResponse.error.message)
      }

      if (orderResponse.data && statusResponse.data) {
        // Combine order details with status information
        const newStatus: OrderStatus = {
          ...orderResponse.data,
          // Map database fields to expected fields
          order_number: generateOrderNumber(orderResponse.data.id),
          table_number: table?.table_number || tableId,
          estimated_completion: statusResponse.data.estimated_completion,
          actual_completion: null, // This would come from order completion
          items: [], // This would need to be loaded separately or included in API
          // Add any other mappings needed
        }
        
        // Check for status changes and notify
        if (orderStatus && orderStatus.status !== newStatus.status) {
          showStatusNotification(newStatus.status)
        }

        setOrderStatus(newStatus)
      }

    } catch (error: any) {
      console.error('Error loading order status:', error)
      setError(error.message || 'Gagal memuat status pesanan')
      
      if (error.message.includes('tidak ditemukan')) {
        router.push(`/${tableId}`)
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Subscribe to real-time updates
  const subscribeToUpdates = () => {
    subscriptionRef.current = apiClient.subscribeToOrderUpdates(
      orderId,
      (update) => {
        console.log('Order update received:', update)
        
        if (update.new) {
          const updatedOrder = update.new as OrderStatus
          
          // Show notification for status changes
          if (orderStatus && orderStatus.status !== updatedOrder.status) {
            showStatusNotification(updatedOrder.status)
          }

          setOrderStatus(updatedOrder)
        }
      }
    )
  }

  // Show status notification
  const showStatusNotification = (status: OrderStatus['status']) => {
    if (!notificationsEnabled) return

    const messages = {
      confirmed: 'Pesanan dikonfirmasi! 🎉',
      preparing: 'Pesanan sedang dipersiapkan 👨‍🍳',
      ready: 'Pesanan siap! Silakan ambil di counter 🍽️',
      served: 'Pesanan telah disajikan! Selamat menikmati 😋',
      completed: 'Pesanan selesai! Terima kasih 🙏'
    }

    const message = messages[status as keyof typeof messages]
    if (message) {
      toast.success(message)
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Update Pesanan', {
          body: message,
          icon: '/icon-192x192.png'
        })
      }
    }
  }

  // Generate progress steps
  const getProgressSteps = (): ProgressStep[] => {
    if (!orderStatus) return []

    const baseSteps: ProgressStep[] = [
      {
        id: 'payment',
        title: 'Pembayaran',
        description: orderStatus.payment_status === 'paid' ? 'Pembayaran dikonfirmasi' : 'Menunggu konfirmasi pembayaran',
        status: orderStatus.payment_status === 'paid' ? 'completed' : 'current',
        icon: <Receipt className="h-5 w-5" />,
        timestamp: orderStatus.payment_status === 'paid' ? orderStatus.created_at : undefined
      },
      {
        id: 'confirmed',
        title: 'Pesanan Dikonfirmasi',
        description: 'Pesanan diterima dan diproses',
        status: ['confirmed', 'preparing', 'ready', 'served', 'completed'].includes(orderStatus.status) ? 'completed' : 
                orderStatus.status === 'pending' ? 'pending' : 'current',
        icon: <CheckCircle className="h-5 w-5" />,
        estimatedTime: 2
      },
      {
        id: 'preparing',
        title: 'Sedang Dipersiapkan',
        description: 'Dapur sedang mempersiapkan pesanan Anda',
        status: ['preparing', 'ready', 'served', 'completed'].includes(orderStatus.status) ? 'completed' :
                orderStatus.status === 'confirmed' ? 'current' : 'pending',
        icon: <ChefHat className="h-5 w-5" />,
        estimatedTime: orderStatus.estimated_completion ? 
          Math.max(0, Math.floor((new Date(orderStatus.estimated_completion).getTime() - Date.now()) / 60000)) : 15
      },
      {
        id: 'ready',
        title: 'Siap Disajikan',
        description: 'Pesanan siap dan akan segera disajikan',
        status: ['ready', 'served', 'completed'].includes(orderStatus.status) ? 'completed' :
                orderStatus.status === 'preparing' ? 'current' : 'pending',
        icon: <Bell className="h-5 w-5" />,
        estimatedTime: 2
      },
      {
        id: 'served',
        title: 'Disajikan',
        description: 'Pesanan telah disajikan di meja Anda',
        status: ['served', 'completed'].includes(orderStatus.status) ? 'completed' :
                orderStatus.status === 'ready' ? 'current' : 'pending',
        icon: <Utensils className="h-5 w-5" />,
        timestamp: orderStatus.status === 'served' ? orderStatus.updated_at : undefined
      }
    ]

    return baseSteps
  }

  // Handle manual refresh
  const handleRefresh = () => {
    loadOrderStatus()
  }

  // Handle rating submission
  const handleSubmitRating = async () => {
    if (!orderStatus || rating === 0) {
      toast.error('Pilih rating terlebih dahulu')
      return
    }

    try {
      const response = await apiClient.submitRating({
        orderId: orderStatus.id,
        rating,
        comment: review.trim() || undefined
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      toast.success('Terima kasih atas rating Anda!')
      setShowRatingModal(false)
      setRating(0)
      setReview('')

    } catch (error: any) {
      console.error('Error submitting rating:', error)
      toast.error(error.message || 'Gagal mengirim rating')
    }
  }

  // Handle share order
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Pesanan #${orderStatus?.order_number}`,
          text: `Status pesanan saya di Cafe Kita`,
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link status pesanan disalin')
      }
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  // Format customizations
  const formatCustomizations = (customizations?: Record<string, string[]>) => {
    if (!customizations || Object.keys(customizations).length === 0) return null
    
    return Object.entries(customizations)
      .filter(([_, options]) => options.length > 0)
      .map(([_, options]) => options.join(', '))
      .join(' • ')
  }

  // Get status color
  const getStatusColor = (status: OrderStatus['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'confirmed': return 'text-blue-600 bg-blue-50'
      case 'preparing': return 'text-orange-600 bg-orange-50'
      case 'ready': return 'text-green-600 bg-green-50'
      case 'served': return 'text-purple-600 bg-purple-50'
      case 'completed': return 'text-green-600 bg-green-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Loading state
  if (isLoading || !orderStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Memuat Status Pesanan
          </h2>
          <p className="text-sm text-gray-600">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    )
  }

  const progressSteps = getProgressSteps()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Pesanan #{orderStatus.order_number}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>Meja {orderStatus.table_number}</span>
                  <span>•</span>
                  <span>{orderStatus.customer_name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  notificationsEnabled ? 'text-blue-600 bg-blue-50' : 'text-gray-500 bg-gray-50'
                }`}
                title={notificationsEnabled ? 'Matikan notifikasi' : 'Aktifkan notifikasi'}
              >
                {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh status"
              >
                <RefreshCw className={`h-4 w-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Bagikan"
              >
                <Share2 className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Order Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Status Pesanan
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Lacak perkembangan pesanan Anda secara real-time
                </p>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(orderStatus.status)}`}>
                {orderStatus.status.charAt(0).toUpperCase() + orderStatus.status.slice(1)}
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="p-4">
            <div className="space-y-4">
              {progressSteps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-4">
                  {/* Step Icon */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                    ${step.status === 'completed' 
                      ? 'bg-green-100 border-green-500 text-green-600' 
                      : step.status === 'current'
                      ? 'bg-blue-100 border-blue-500 text-blue-600 animate-pulse'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                    }
                  `}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.icon
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium ${
                        step.status === 'completed' ? 'text-green-900' :
                        step.status === 'current' ? 'text-blue-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </h3>
                      
                      {step.status === 'current' && step.estimatedTime && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                          ~{step.estimatedTime} menit
                        </span>
                      )}
                      
                      {step.timestamp && (
                        <span className="text-xs text-gray-500">
                          {new Date(step.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-sm mt-1 ${
                      step.status === 'completed' ? 'text-green-700' :
                      step.status === 'current' ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>

                  {/* Connecting Line */}
                  {index < progressSteps.length - 1 && (
                    <div className={`
                      absolute left-[33px] mt-10 w-0.5 h-8 
                      ${step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              Detail Pesanan
            </h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {orderStatus.items.map((item, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {item.quantity}× {item.name}
                    </h3>
                    
                    {formatCustomizations(item.customizations) && (
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCustomizations(item.customizations)}
                      </p>
                    )}
                    
                    {item.notes && (
                      <p className="text-sm text-gray-500 italic mt-1">
                        "{item.notes}"
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{item.preparation_time} menit</span>
                      </div>
                      
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'served' ? 'bg-green-100 text-green-700' :
                        item.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                    </div>
                    {item.quantity > 1 && (
                      <div className="text-sm text-gray-500">
                        {item.quantity} × Rp {item.price.toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Total */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">
                Total Pembayaran
              </span>
              <span className="text-lg font-bold text-gray-900">
                Rp {orderStatus.total_amount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Special Notes */}
        {orderStatus.special_notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <MessageCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-900">
                  Catatan Khusus
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {orderStatus.special_notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              Status Pembayaran
            </h2>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  orderStatus.payment_status === 'paid' 
                    ? 'bg-green-100 text-green-600' 
                    : orderStatus.payment_status === 'failed'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {orderStatus.payment_status === 'paid' ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : orderStatus.payment_status === 'failed' ? (
                    <AlertCircle className="h-6 w-6" />
                  ) : (
                    <Clock className="h-6 w-6" />
                  )}
                </div>
                
                <div>
                  <div className="font-medium text-gray-900">
                    {orderStatus.payment_status === 'paid' ? 'Pembayaran Berhasil' :
                     orderStatus.payment_status === 'failed' ? 'Pembayaran Gagal' :
                     'Menunggu Konfirmasi'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {orderStatus.payment_status === 'paid' 
                      ? 'Pembayaran telah dikonfirmasi oleh kasir'
                      : orderStatus.payment_status === 'failed'
                      ? 'Terjadi masalah dengan pembayaran'
                      : 'Kasir sedang memverifikasi bukti pembayaran'
                    }
                  </div>
                </div>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                orderStatus.payment_status === 'paid' 
                  ? 'bg-green-100 text-green-700'
                  : orderStatus.payment_status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {orderStatus.payment_status === 'paid' ? 'Lunas' :
                 orderStatus.payment_status === 'failed' ? 'Gagal' :
                 'Pending'}
              </div>
            </div>

            {/* Payment Proof */}
            {orderStatus.payment_proof_url && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Bukti Pembayaran
                  </span>
                  <a
                    href={orderStatus.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Lihat Bukti
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Butuh Bantuan?
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="tel:+6281234567890"
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Phone className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Hubungi Kasir</div>
                  <div className="text-sm text-gray-600">+62 812-3456-7890</div>
                </div>
              </a>
              
              <button
                onClick={() => {
                  // Open WhatsApp chat
                  const message = encodeURIComponent(`Halo, saya butuh bantuan dengan pesanan #${orderStatus.order_number}`)
                  window.open(`https://wa.me/6281234567890?text=${message}`, '_blank')
                }}
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Chat WhatsApp</div>
                  <div className="text-sm text-gray-600">Respon cepat</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Rating Section */}
        {orderStatus.status === 'completed' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Beri Rating & Ulasan
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Bagaimana pengalaman Anda? Rating Anda membantu kami memberikan pelayanan yang lebih baik.
              </p>
              
              <button
                onClick={() => setShowRatingModal(true)}
                className="w-full py-3 px-4 bg-yellow-400 text-yellow-900 rounded-lg font-medium hover:bg-yellow-500 transition-colors flex items-center justify-center space-x-2"
              >
                <Star className="h-5 w-5" />
                <span>Beri Rating</span>
              </button>
            </div>
          </div>
        )}

        {/* Order Timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">
              Timeline Pesanan
            </h3>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Pesanan dibuat</span>
              <span className="font-medium text-gray-900">
                {new Date(orderStatus.created_at).toLocaleString('id-ID')}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Terakhir diperbarui</span>
              <span className="font-medium text-gray-900">
                {new Date(orderStatus.updated_at).toLocaleString('id-ID')}
              </span>
            </div>
            
            {orderStatus.estimated_completion && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Estimasi selesai</span>
                <span className="font-medium text-gray-900">
                  {new Date(orderStatus.estimated_completion).toLocaleString('id-ID')}
                </span>
              </div>
            )}
            
            {orderStatus.actual_completion && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Waktu selesai</span>
                <span className="font-medium text-green-700">
                  {new Date(orderStatus.actual_completion).toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-t-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Beri Rating & Ulasan
                </h3>
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Star Rating */}
              <div className="text-center">
                <h4 className="text-base font-medium text-gray-900 mb-3">
                  Seberapa puas Anda dengan pesanan ini?
                </h4>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 transition-colors ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      <Star className="h-8 w-8 fill-current" />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {rating === 1 ? 'Sangat Tidak Puas' :
                     rating === 2 ? 'Tidak Puas' :
                     rating === 3 ? 'Biasa Saja' :
                     rating === 4 ? 'Puas' :
                     'Sangat Puas'}
                  </p>
                )}
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ulasan (Opsional)
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Ceritakan pengalaman Anda..."
                  rows={3}
                  maxLength={200}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {review.length}/200 karakter
                </p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitRating}
                disabled={rating === 0}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Kirim Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-6"></div>
    </div>
  )
}