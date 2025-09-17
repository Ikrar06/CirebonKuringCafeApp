'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Clock,
  CheckCircle,
  Package,
  ChefHat,
  Coffee,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'

// Hooks
import useTable from '@/hooks/useTable'
import apiClient from '@/lib/api/client'

interface OrderStatus {
  id: string
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
  const searchParams = useSearchParams()
  const tableId = params.tableId as string
  const orderId = searchParams.get('order_id')

  // Hooks
  const { table } = useTable()

  // State
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!orderId) {
      toast.error('ID pesanan tidak valid')
      router.push(`/${tableId}`)
      return
    }

    loadOrderStatus()

    // Refresh status every 30 seconds
    const interval = setInterval(loadOrderStatus, 30000)
    return () => clearInterval(interval)
  }, [orderId, tableId, router])

  const loadOrderStatus = async () => {
    try {
      setIsLoading(true)

      const response = await apiClient.getOrderStatus(orderId!)


      if (response.error || !response.data) {
        throw new Error('Failed to load order status')
      }

      // Handle nested response structure: { data: { data: actualOrderStatus } }
      const orderStatusData = response.data.data || response.data

      setOrderStatus(orderStatusData)

    } catch (error: any) {
      console.error('Error loading order status:', error)
      toast.error(error.message || 'Gagal memuat status pesanan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push(`/${tableId}/thank-you?order_id=${orderId}`)
  }

  const handleBackToMenu = () => {
    router.push(`/${tableId}`)
  }

  const handleRefresh = () => {
    loadOrderStatus()
  }

  if (isLoading && !orderStatus) {
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

  if (!orderStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Pesanan Tidak Ditemukan
          </h2>
          <p className="text-gray-600 mb-6">
            Maaf, kami tidak dapat menemukan status pesanan Anda
          </p>
          <button
            onClick={handleBackToMenu}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Kembali ke Menu
          </button>
        </div>
      </div>
    )
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return {
          label: 'Menunggu Pembayaran',
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock
        }
      case 'payment_verification':
        return {
          label: 'Verifikasi Pembayaran',
          color: 'bg-blue-100 text-blue-800',
          icon: Clock
        }
      case 'confirmed':
        return {
          label: 'Dikonfirmasi',
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle
        }
      case 'preparing':
        return {
          label: 'Sedang Diproses',
          color: 'bg-orange-100 text-orange-800',
          icon: ChefHat
        }
      case 'ready':
        return {
          label: 'Siap Disajikan',
          color: 'bg-purple-100 text-purple-800',
          icon: Coffee
        }
      case 'delivered':
        return {
          label: 'Diantar',
          color: 'bg-blue-100 text-blue-800',
          icon: CheckCircle
        }
      case 'completed':
        return {
          label: 'Selesai',
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle
        }
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800',
          icon: Clock
        }
    }
  }

  const statusInfo = getStatusInfo(orderStatus.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Kembali</span>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Status Pesanan
            </h1>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Current Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <StatusIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {statusInfo.label}
              </h2>
              <p className="text-sm text-gray-600">
                Pesanan #{orderId?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Status saat ini:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Estimated Time */}
        {orderStatus.estimated_completion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">
                  Estimasi Waktu Selesai
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Sekitar pukul {new Date(orderStatus.estimated_completion).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  * Waktu dapat berubah tergantung kondisi dapur
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        {orderStatus.progress_steps && orderStatus.progress_steps.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Perkembangan Pesanan
            </h3>
            <div className="space-y-4">
              {orderStatus.progress_steps.map((step, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    step.completed
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <div className="w-2 h-2 bg-current rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      step.completed ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.step}
                    </p>
                    {step.timestamp && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(step.timestamp).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-full py-4 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>

          <button
            onClick={handleBackToMenu}
            className="w-full py-4 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Kembali ke Menu</span>
          </button>
        </div>

        {/* Auto Refresh Notice */}
        <div className="text-center text-sm text-gray-500">
          <p>Status akan diperbarui otomatis setiap 30 detik</p>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-8"></div>
    </div>
  )
}