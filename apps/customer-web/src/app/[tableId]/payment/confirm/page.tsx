'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  CheckCircle,
  Clock,
  CreditCard,
  QrCode,
  University,
  Banknote,
  ArrowLeft,
  Upload,
  RefreshCw,
  X,
  FileImage
} from 'lucide-react'

// Components and hooks
import apiClient from '@/lib/api/client'

interface PaymentData {
  transaction_id: string
  order_id: string
  amount: number
  method: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'verified' | string
  message?: string
  next_step?: string
  qr_code?: string
  merchant_name?: string
  amount_to_pay?: number
  formatted_amount?: string
  instructions?: string[]
  bank_options?: {
    bank_name: string
    account_number: string
    account_name: string
  }[]
  bank_details?: {
    bank_name: string
    account_number: string
    account_name: string
  }
  expires_at?: string
}

export default function PaymentConfirmPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tableId = params.tableId as string
  const paymentId = searchParams.get('payment_id')
  const method = searchParams.get('method')

  // Debug log
  console.log('Payment confirm page params:', { tableId, paymentId, method })

  // State
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)

  // Load payment data
  useEffect(() => {
    if (!paymentId) {
      toast.error('Payment ID tidak valid')
      router.push(`/${tableId}/payment`)
      return
    }

    loadPaymentData()
    // Start auto-polling status every 10 seconds
    statusCheckInterval.current = setInterval(() => {
      checkPaymentStatus()
    }, 10000)

    // Cleanup on unmount
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current)
      }
    }
  }, [paymentId])

  const loadPaymentData = async () => {
    try {
      setIsLoading(true)

      // Get payment transaction details using query parameter
      // paymentId is the same as transaction_id
      const response = await apiClient.request({
        endpoint: `/payments?transaction_id=${paymentId}`,
        method: 'GET'
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      // API returns { data: paymentData }, handle both structures
      const paymentData = response.data.data || response.data
      setPaymentData(paymentData)
    } catch (error: any) {
      console.error('Error loading payment data:', error)
      toast.error(error.message || 'Gagal memuat data pembayaran')
      router.push(`/${tableId}/payment`)
    } finally {
      setIsLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!paymentId) {
      console.log('No payment ID available for status check')
      return
    }

    try {
      setIsCheckingStatus(true)

      console.log('Checking payment status for payment ID:', paymentId)

      // Use our API endpoint to check payment status
      const response = await apiClient.request({
        endpoint: `/payments?transaction_id=${paymentId}`,
        method: 'GET'
      })

      console.log('Payment status check response:', response)

      if (response.error) {
        console.error('Error checking payment status:', response.error)
        return
      }

      const paymentData = response.data.data || response.data
      console.log('Current payment data:', paymentData)

      // If we have order_id, check order status via API
      if (paymentData?.order_id) {
        try {
          const orderResponse = await apiClient.request({
            endpoint: `/order?id=${paymentData.order_id}`,
            method: 'GET'
          })

          console.log('Order status response:', orderResponse)

          if (orderResponse.data && !orderResponse.error) {
            // Access the actual order data (it's nested under 'data' property)
            const orderData = orderResponse.data.data || orderResponse.data
            console.log('Complete order data:', orderData)
            console.log('Order status check result:', {
              payment_status: orderData.payment_status,
              status: orderData.status,
              id: orderData.id,
              all_keys: Object.keys(orderData || {})
            })

            if (orderData.payment_status === 'verified') {
              toast.success('Pembayaran telah dikonfirmasi oleh kasir!')

              // Stop auto-polling
              if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current)
              }

              // Redirect to thank you page
              router.push(`/${tableId}/thank-you?order_id=${paymentData.order_id}`)
              return
            }
          }
        } catch (orderError) {
          console.error('Error checking order status via API:', orderError)
        }
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error)
      // Don't show error toast for auto-polling, only for manual checks
      if (!statusCheckInterval.current) {
        toast.error(error.message || 'Gagal memeriksa status pembayaran')
      }
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleUploadProof = () => {
    setShowUploadModal(true)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Hanya file gambar yang diperbolehkan')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB')
        return
      }

      setSelectedFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadFile = async () => {
    if (!selectedFile || !paymentId) {
      toast.error('Pilih file bukti pembayaran terlebih dahulu')
      return
    }

    try {
      setIsUploading(true)

      const response = await apiClient.uploadPaymentProof(paymentId, selectedFile, paymentData?.order_id)

      if (response.error) {
        throw new Error(response.error.message)
      }

      toast.success('Bukti pembayaran berhasil diupload!')
      setShowUploadModal(false)
      setSelectedFile(null)
      setPreview(null)

      // Refresh payment data
      loadPaymentData()

    } catch (error: any) {
      console.error('Error uploading proof:', error)
      toast.error(error.message || 'Gagal mengupload bukti pembayaran')
    } finally {
      setIsUploading(false)
    }
  }

  const closeUploadModal = () => {
    setShowUploadModal(false)
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'qris':
        return <QrCode className="h-8 w-8" />
      case 'transfer':
        return <University className="h-8 w-8" />
      case 'cash':
        return <Banknote className="h-8 w-8" />
      case 'card':
        return <CreditCard className="h-8 w-8" />
      default:
        return <CreditCard className="h-8 w-8" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'pending':
      case 'processing':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Memuat Data Pembayaran
          </h2>
          <p className="text-gray-600">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Data Pembayaran Tidak Ditemukan
          </h2>
          <p className="text-gray-600 mb-6">
            Maaf, kami tidak dapat menemukan informasi pembayaran Anda
          </p>
          <button
            onClick={() => router.push(`/${tableId}/payment`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Kembali ke Pembayaran
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Konfirmasi Pembayaran
            </h1>
            <p className="text-sm text-gray-600">
              #{paymentData.transaction_id.slice(0, 8)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Payment Method Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              {getPaymentIcon(paymentData.method)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {paymentData.method === 'qris' ? 'QRIS' :
                 paymentData.method === 'transfer' ? 'Transfer Bank' :
                 paymentData.method === 'cash' ? 'Bayar Tunai' :
                 paymentData.method === 'card' ? 'Kartu Debit/Kredit' :
                 'Pembayaran'}
              </h2>
              <p className="text-lg font-bold text-blue-600">
                Rp {paymentData.amount.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="mb-4">
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(paymentData.status)}`}>
              {paymentData.status === 'completed' ? 'Berhasil' :
               paymentData.status === 'pending' ? 'Menunggu' :
               paymentData.status === 'processing' ? 'Diproses' :
               paymentData.status === 'failed' ? 'Gagal' :
               paymentData.status}
            </span>
          </div>

          {/* Message */}
          {paymentData.message && (
            <div className="mb-4">
              <p className="text-gray-700">
                {paymentData.message}
              </p>
            </div>
          )}

          {/* Next Step */}
          {paymentData.next_step && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">
                {paymentData.next_step}
              </p>
            </div>
          )}
        </div>

        {/* QRIS Code */}
        {paymentData.method === 'qris' && paymentData.qr_code && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Scan QR Code QRIS
            </h3>
            <div className="bg-gray-100 p-6 rounded-lg mb-4">
              <QrCode className="h-32 w-32 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">QR Code Statis Cirebon Kuring Cafe</p>
            </div>

            {/* Copy Amount Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-blue-800 mb-2">Nominal yang harus dibayar:</p>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl font-bold text-blue-600">
                  {paymentData.formatted_amount || `Rp ${paymentData.amount.toLocaleString('id-ID')}`}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(paymentData.amount.toString())
                    toast.success('Nominal berhasil disalin!')
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Instructions */}
            {paymentData.instructions && (
              <div className="text-left">
                <h4 className="font-medium text-gray-900 mb-2">Langkah Pembayaran:</h4>
                <ol className="text-sm text-gray-600 space-y-1">
                  {paymentData.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Bank Options */}
        {paymentData.method === 'transfer' && (paymentData.bank_options || paymentData.bank_details) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Pilih Rekening Transfer
            </h3>

            {/* Copy Amount Section */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-green-800 mb-2">Nominal yang harus ditransfer:</p>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl font-bold text-green-600">
                  {paymentData.formatted_amount || `Rp ${paymentData.amount.toLocaleString('id-ID')}`}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(paymentData.amount.toString())
                    toast.success('Nominal berhasil disalin!')
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Bank Options */}
            {paymentData.bank_options ? (
              <div className="space-y-4">
                {paymentData.bank_options.map((bank, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{bank.bank_name}</h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(bank.account_number)
                          toast.success('Nomor rekening berhasil disalin!')
                        }}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        Copy No. Rek
                      </button>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Nomor Rekening:</span>
                        <span className="font-mono font-medium text-gray-900">{bank.account_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nama Penerima:</span>
                        <span className="font-medium text-gray-900">{bank.account_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : paymentData.bank_details && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank</span>
                    <span className="font-medium text-gray-900">{paymentData.bank_details.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nomor Rekening</span>
                    <span className="font-medium text-gray-900">{paymentData.bank_details.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama Penerima</span>
                    <span className="font-medium text-gray-900">{paymentData.bank_details.account_name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {paymentData.instructions && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Langkah Transfer:</h4>
                <ol className="text-sm text-gray-600 space-y-1">
                  {paymentData.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Upload Proof (for transfer and QRIS) */}
          {(paymentData.method === 'transfer' || paymentData.method === 'qris') && paymentData.status === 'pending' && (
            <button
              onClick={handleUploadProof}
              className="w-full py-4 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Upload className="h-5 w-5" />
              <span>Upload Bukti {paymentData.method === 'transfer' ? 'Transfer' : 'Pembayaran'}</span>
            </button>
          )}

          {/* Check Status */}
          <button
            onClick={checkPaymentStatus}
            disabled={isCheckingStatus}
            className="w-full py-4 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`h-5 w-5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
            <span>{isCheckingStatus ? 'Memeriksa...' : 'Cek Status Pembayaran'}</span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-600">
          <p>
            Pembayaran akan diverifikasi secara otomatis.
          </p>
          <p>
            Jika ada kendala, hubungi staf cafe.
          </p>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-8"></div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Bukti Pembayaran
              </h3>
              <button
                onClick={closeUploadModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  Pastikan foto jelas dan menampilkan nominal serta waktu pembayaran
                </p>
              </div>

              {/* File Upload */}
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">Pilih foto bukti pembayaran</p>
                  <p className="text-xs text-gray-500">JPG, PNG (Max 5MB)</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Preview */}
                  <div className="relative">
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      {preview && (
                        <Image
                          src={preview}
                          alt="Preview bukti pembayaran"
                          fill
                          className="object-contain"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null)
                        setPreview(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* File Info */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <FileImage className="h-6 w-6 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                        <p className="text-sm text-gray-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 space-y-2">
              {selectedFile && (
                <button
                  onClick={handleUploadFile}
                  disabled={isUploading}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  <Upload className={`h-4 w-4 ${isUploading ? 'animate-pulse' : ''}`} />
                  <span>{isUploading ? 'Mengupload...' : 'Upload Bukti'}</span>
                </button>
              )}
              <button
                onClick={closeUploadModal}
                className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}