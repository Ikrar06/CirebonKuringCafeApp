'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  ArrowLeft,
  QrCode,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  Upload,
  Camera,
  Info,
  RefreshCw,
  X
} from 'lucide-react'

// Hooks and API
import useTable from '@/hooks/useTable'
import apiClient from '@/lib/api/client'
import storage from '@/lib/utils/storage'

// Types
interface QRISPayment {
  payment_id: string
  order_id: string
  amount: number
  qr_code: string
  qr_code_url?: string
  payment_reference: string
  expires_at: string
  status: 'pending' | 'processing' | 'completed' | 'expired' | 'failed'
}

export default function QRISPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tableId = params.tableId as string
  const orderId = searchParams.get('order_id')
  const paymentId = searchParams.get('payment_id')

  // Hooks
  const { table } = useTable()

  // State management
  const [paymentData, setPaymentData] = useState<QRISPayment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'expired' | 'failed'>('pending')
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  // Refs for cleanup
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)

  // Load payment data
  useEffect(() => {
    if (!orderId || !paymentId) {
      toast.error('Data pembayaran tidak valid')
      router.push(`/${tableId}`)
      return
    }

    loadPaymentData()
    // Start automatic payment status checking
    startStatusChecking()

    // Cleanup on unmount
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current)
      }
    }
  }, [orderId, paymentId, tableId, router])

  // Countdown timer
  useEffect(() => {
    if (!paymentData?.expires_at) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(paymentData.expires_at).getTime()
      const difference = expiry - now

      if (difference <= 0) {
        setTimeRemaining('Expired')
        setPaymentStatus('expired')
        clearInterval(interval)
        return
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)
      setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [paymentData?.expires_at])

  // Mock payment data for demo
  const loadPaymentData = async () => {
    try {
      setIsLoading(true)

      // Mock QRIS payment data - in real app, this would come from API
      const mockPaymentData: QRISPayment = {
        payment_id: paymentId!,
        order_id: orderId!,
        amount: 85000, // This should come from order data
        qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126580011ID.LINKAJA.WWW01189360050300000898240214540123456789015303360540485000.005802ID5912Cirebon Kuring6010Kuningan9062070703A0163041C6B', // Mock QR
        payment_reference: 'QR' + Date.now(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
        status: 'pending'
      }

      setPaymentData(mockPaymentData)
      setPaymentStatus(mockPaymentData.status)

    } catch (error: any) {
      console.error('Error loading payment data:', error)
      toast.error(error.message || 'Gagal memuat data pembayaran')
      router.push(`/${tableId}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }

    setPaymentProof(file)

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  // Handle proof upload
  const handleUploadProof = async () => {
    if (!paymentProof || !paymentData) {
      toast.error('Pilih file bukti pembayaran')
      return
    }

    try {
      setIsUploading(true)

      // Mock upload - in real app, this would upload to server
      await new Promise(resolve => setTimeout(resolve, 2000))

      setPaymentStatus('processing')
      toast.success('Bukti pembayaran berhasil diunggah! Menunggu verifikasi kasir.')

      // Clear customer session data since payment proof is uploaded
      storage.clearSessionData(tableId)

      // Navigate to status page
      router.push(`/${tableId}/payment/status?payment_id=${paymentData.payment_id}`)

    } catch (error: any) {
      console.error('Error uploading proof:', error)
      toast.error(error.message || 'Gagal mengunggah bukti pembayaran')
    } finally {
      setIsUploading(false)
    }
  }

  // Start automatic payment status checking (every 5 seconds)
  const startStatusChecking = () => {
    // Check status immediately
    checkPaymentStatus()

    // Then check every 5 seconds
    statusCheckInterval.current = setInterval(() => {
      checkPaymentStatus()
    }, 5000)
  }

  // Check payment status from database
  const checkPaymentStatus = async () => {
    if (!orderId) return

    try {
      setIsCheckingStatus(true)
      console.log('Checking payment status for QRIS order:', orderId)
      console.log('QRIS Order ID type:', typeof orderId)
      console.log('QRIS Order ID length:', orderId.length)

      // Check payment status using API endpoint (with service role key)
      const response = await fetch(`/api/orders/${orderId}/payment-status`)
      const result = await response.json()

      console.log('QRIS payment status API response:', { response: response.status, result })

      if (!response.ok) {
        console.error('Error from QRIS payment status API:', result)
        return
      }

      const order = result.data

      if (!order) {
        console.log('Order not found in database, continuing with local data')
        return
      }

      console.log('QRIS order payment_status:', order.payment_status, 'status:', order.status)

      if (order && order.payment_status === 'verified') {
        // Payment has been verified by cashier
        console.log('QRIS payment verified! Redirecting to thank you page...')

        // Stop checking
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current)
        }

        setPaymentStatus('completed')
        toast.success('Pembayaran telah dikonfirmasi oleh kasir!')

        // Clear customer session data since payment is completed
        storage.clearSessionData(tableId)

        // Navigate to thank you page
        router.push(`/${tableId}/thank-you?order_id=${orderId}`)
      }
    } catch (error: any) {
      console.error('Error checking QRIS payment status:', error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  // Copy QR code data
  const copyQRData = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code)
      toast.success('QR Code data disalin')
    }
  }

  // Remove selected file
  const removeSelectedFile = () => {
    setPaymentProof(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Memuat Pembayaran QRIS
          </h2>
          <p className="text-sm text-gray-600">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Data Pembayaran Tidak Ditemukan
          </h2>
          <button
            onClick={() => router.push(`/${tableId}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Kembali ke Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Pembayaran QRIS
              </h1>
              <p className="text-sm text-gray-600">
                Order #{paymentData.order_id.slice(-8).toUpperCase()} • Meja {table?.table_number || tableId}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Timer */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Waktu Pembayaran
              </h3>
              <div className={`text-lg font-bold ${
                paymentStatus === 'expired' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {paymentStatus === 'expired' ? 'Expired' : timeRemaining}
              </div>
              <p className="text-xs text-gray-500">
                QR Code akan expired secara otomatis
              </p>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Total Pembayaran</p>
            <p className="text-2xl font-bold text-gray-900">
              Rp {paymentData.amount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Scan QR Code
            </h2>

            {/* QR Code Image */}
            <div className="flex justify-center">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                <Image
                  src={paymentData.qr_code}
                  alt="QR Code"
                  width={250}
                  height={250}
                  className="rounded"
                />
              </div>
            </div>

            {/* QR Code Actions */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={copyQRData}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span className="text-sm">Copy Data</span>
              </button>
              <button
                onClick={() => window.open(paymentData.qr_code, '_blank')}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">Download</span>
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Buka aplikasi bank atau e-wallet Anda dan scan QR Code di atas
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                Cara Pembayaran QRIS
              </h3>
              <ol className="text-sm text-blue-700 mt-2 space-y-1">
                <li className="flex items-start space-x-1">
                  <span className="font-medium">1.</span>
                  <span>Buka aplikasi bank atau e-wallet Anda</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span className="font-medium">2.</span>
                  <span>Pilih menu "Scan QR" atau "QRIS"</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span className="font-medium">3.</span>
                  <span>Scan QR Code di atas</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span className="font-medium">4.</span>
                  <span>Konfirmasi pembayaran di aplikasi</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span className="font-medium">5.</span>
                  <span>Upload bukti pembayaran di bawah</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Upload Proof Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Upload Bukti Pembayaran
          </h3>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!paymentProof ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={paymentStatus === 'expired'}
              className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">
                  Pilih File Bukti Pembayaran
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG hingga 5MB
                </p>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative">
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 relative">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {paymentProof.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(paymentProof.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeSelectedFile}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUploadProof}
                disabled={isUploading || paymentStatus === 'expired'}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload Bukti Pembayaran</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {paymentStatus === 'expired' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-900">
                QR Code Expired
              </p>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Waktu pembayaran telah habis. Silakan buat pesanan baru.
            </p>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className={`h-5 w-5 text-yellow-600 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              <p className="text-sm font-medium text-yellow-900">
                Menunggu Verifikasi
              </p>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Bukti pembayaran sedang diverifikasi oleh kasir. Sistem akan otomatis memantau status pembayaran setiap 5 detik.
            </p>
          </div>
        )}

        {/* Automatic Status Checking Info for pending status */}
        {paymentStatus === 'pending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className={`h-5 w-5 text-blue-600 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              <p className="text-sm font-medium text-blue-900">
                Memantau Status Pembayaran
              </p>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Sistem sedang memantau status pembayaran secara otomatis setiap 5 detik. Halaman akan otomatis berpindah setelah kasir mengkonfirmasi pembayaran.
            </p>
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-16"></div>
    </div>
  )
}