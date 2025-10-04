'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  ArrowLeft,
  University,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Upload,
  Info,
  RefreshCw,
  X,
  CreditCard,
  Building2
} from 'lucide-react'

// Hooks and API
import useTable from '@/hooks/useTable'
import apiClient from '@/lib/api/client'

// Types
interface BankTransferPayment {
  payment_id: string
  order_id: string
  amount: number
  unique_amount: number // Amount with unique code
  unique_code: number
  bank_details: {
    bank_name: string
    account_number: string
    account_name: string
  }
  payment_reference: string
  expires_at: string
  status: 'pending' | 'processing' | 'completed' | 'expired' | 'failed'
}

interface BankAccount {
  bank: string
  name: string
  account: string
}

export default function BankTransferPaymentPage() {
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
  const [paymentData, setPaymentData] = useState<BankTransferPayment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'expired' | 'failed'>('pending')
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])

  // Load bank accounts from database
  useEffect(() => {
    fetchBankAccounts()
  }, [])

  // Load payment data
  useEffect(() => {
    if (!orderId || !paymentId) {
      toast.error('Data pembayaran tidak valid')
      router.push(`/${tableId}`)
      return
    }

    loadPaymentData()
  }, [orderId, paymentId, tableId, router, bankAccounts])

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

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeRemaining(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [paymentData?.expires_at])

  // Fetch bank accounts from database
  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/settings?category=payment&key=bank_accounts')
      const { data } = await response.json()

      if (data && data.length > 0) {
        const bankAccountsSetting = data[0]
        setBankAccounts(bankAccountsSetting.value || [])
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      // Don't show error to user, just use empty array
    }
  }

  // Mock payment data for demo
  const loadPaymentData = async () => {
    try {
      setIsLoading(true)

      // Wait for bank accounts to be loaded
      if (bankAccounts.length === 0) {
        return
      }

      // Generate unique code
      const uniqueCode = Math.floor(Math.random() * 999) + 1
      const baseAmount = 85000 // This should come from order data
      const uniqueAmount = baseAmount + uniqueCode

      // Use first bank account from database, or fallback to default
      const selectedBank = bankAccounts[0] || {
        bank: 'Bank BCA',
        account: '1234567890',
        name: 'PT CIREBON KURING CAFE'
      }

      // Mock bank transfer payment data - in real app, this would come from API
      const mockPaymentData: BankTransferPayment = {
        payment_id: paymentId!,
        order_id: orderId!,
        amount: baseAmount,
        unique_amount: uniqueAmount,
        unique_code: uniqueCode,
        bank_details: {
          bank_name: selectedBank.bank,
          account_number: selectedBank.account,
          account_name: selectedBank.name
        },
        payment_reference: 'TF' + Date.now(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
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
      toast.error('Pilih file bukti transfer')
      return
    }

    try {
      setIsUploading(true)

      // Mock upload - in real app, this would upload to server
      await new Promise(resolve => setTimeout(resolve, 2000))

      setPaymentStatus('processing')
      toast.success('Bukti transfer berhasil diunggah! Menunggu verifikasi kasir.')

      // Navigate to status page
      router.push(`/${tableId}/payment/status?payment_id=${paymentData.payment_id}`)

    } catch (error: any) {
      console.error('Error uploading proof:', error)
      toast.error(error.message || 'Gagal mengunggah bukti transfer')
    } finally {
      setIsUploading(false)
    }
  }

  // Copy account number
  const copyAccountNumber = () => {
    if (paymentData?.bank_details.account_number) {
      navigator.clipboard.writeText(paymentData.bank_details.account_number)
      toast.success('Nomor rekening disalin')
    }
  }

  // Copy transfer amount
  const copyAmount = () => {
    if (paymentData?.unique_amount) {
      navigator.clipboard.writeText(paymentData.unique_amount.toString())
      toast.success('Jumlah transfer disalin')
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
          <University className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Memuat Transfer Bank
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
                Transfer Bank
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
                Batas Waktu Transfer
              </h3>
              <div className={`text-lg font-bold ${
                paymentStatus === 'expired' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {paymentStatus === 'expired' ? 'Expired' : timeRemaining}
              </div>
              <p className="text-xs text-gray-500">
                Transfer harus dilakukan sebelum waktu habis
              </p>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Detail Rekening Transfer
            </h2>
          </div>

          <div className="space-y-4">
            {/* Bank Name */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {paymentData.bank_details.bank_name}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {paymentData.bank_details.account_name}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            {/* Account Number */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Nomor Rekening</p>
                  <p className="text-lg font-mono font-bold text-gray-900">
                    {paymentData.bank_details.account_number}
                  </p>
                </div>
                <button
                  onClick={copyAccountNumber}
                  className="flex items-center space-x-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span className="text-sm">Copy</span>
                </button>
              </div>
            </div>

            {/* Transfer Amount */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 mb-1">Jumlah Transfer (dengan kode unik)</p>
                  <p className="text-2xl font-bold text-green-800">
                    Rp {paymentData.unique_amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Total: Rp {paymentData.amount.toLocaleString('id-ID')} + Kode unik: {paymentData.unique_code}
                  </p>
                </div>
                <button
                  onClick={copyAmount}
                  className="flex items-center space-x-1 px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span className="text-sm">Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-900">
                Penting! Gunakan Jumlah Transfer yang Tepat
              </h3>
              <div className="text-sm text-yellow-800 mt-2 space-y-1">
                <p>• Transfer dengan jumlah <strong>Rp {paymentData.unique_amount.toLocaleString('id-ID')}</strong> (sudah termasuk kode unik)</p>
                <p>• Kode unik <strong>{paymentData.unique_code}</strong> digunakan untuk verifikasi otomatis</p>
                <p>• Jangan transfer dengan jumlah bulat tanpa kode unik</p>
                <p>• Screenshot atau simpan bukti transfer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                Cara Transfer Bank
              </h3>
              <ol className="text-sm text-blue-700 mt-2 space-y-1">
                <li className="flex items-start space-x-1">
                  <span className="font-medium">1.</span>
                  <span>Buka aplikasi mobile banking atau internet banking Anda</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span className="font-medium">2.</span>
                  <span>Pilih menu "Transfer" ke rekening bank lain</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span className="font-medium">3.</span>
                  <span>Masukkan nomor rekening: {paymentData.bank_details.account_number}</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span className="font-medium">4.</span>
                  <span>Masukkan jumlah: Rp {paymentData.unique_amount.toLocaleString('id-ID')}</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span className="font-medium">5.</span>
                  <span>Konfirmasi dan lakukan transfer</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span className="font-medium">6.</span>
                  <span>Upload bukti transfer di bawah</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Upload Proof Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Upload Bukti Transfer
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
                  Pilih File Bukti Transfer
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
                    <span>Upload Bukti Transfer</span>
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
                Waktu Transfer Expired
              </p>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Batas waktu transfer telah habis. Silakan buat pesanan baru.
            </p>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />
              <p className="text-sm font-medium text-yellow-900">
                Menunggu Verifikasi
              </p>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Bukti transfer sedang diverifikasi oleh kasir.
            </p>
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-16"></div>
    </div>
  )
}