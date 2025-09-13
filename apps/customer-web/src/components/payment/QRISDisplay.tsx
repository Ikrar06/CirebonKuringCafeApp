'use client'

import { useState } from 'react'
import Image from 'next/image'
import { 
  QrCode,
  Copy,
  Check,
  Smartphone,
  Info,
  Download,
  Share2,
  Camera
} from 'lucide-react'
import { toast } from 'sonner'

// Types
interface QRISDisplayProps {
  amount: number
  orderNumber: string
  onPaymentProof: (file: File) => void
  className?: string
}

interface QRISInfo {
  merchantName: string
  merchantCity: string
  merchantId: string
  qrImageUrl: string
}

export default function QRISDisplay({
  amount,
  orderNumber,
  onPaymentProof,
  className = ''
}: QRISDisplayProps) {
  // State management
  const [isCopied, setIsCopied] = useState(false)
  const [qrImageLoaded, setQrImageLoaded] = useState(false)
  const [showFullInstructions, setShowFullInstructions] = useState(false)

  // QRIS merchant info (static dari toko)
  const qrisInfo: QRISInfo = {
    merchantName: 'CAFE KITA',
    merchantCity: 'KENDARI',
    merchantId: 'ID1234567890123',
    qrImageUrl: '/images/qris-cafe-kita.png' // QR static dari toko
  }

  // Handle copy amount
  const handleCopyAmount = async () => {
    try {
      await navigator.clipboard.writeText(amount.toString())
      setIsCopied(true)
      toast.success('Nominal berhasil disalin')
      
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Error copying amount:', error)
      toast.error('Gagal menyalin nominal')
    }
  }

  // Handle download QR code
  const handleDownloadQR = () => {
    try {
      const link = document.createElement('a')
      link.href = qrisInfo.qrImageUrl
      link.download = `qris-cafe-kita.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('QR Code berhasil diunduh')
    } catch (error) {
      console.error('Error downloading QR code:', error)
      toast.error('Gagal mengunduh QR code')
    }
  }

  // Handle share QR code
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Pembayaran QRIS - Order #${orderNumber}`,
          text: `Scan QR code untuk pembayaran sebesar Rp ${amount.toLocaleString('id-ID')}`,
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link pembayaran berhasil disalin')
      }
    } catch (error) {
      console.error('Error sharing:', error)
      toast.error('Gagal membagikan QR code')
    }
  }

  // Handle proof upload
  const handleProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar')
        return
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Ukuran file maksimal 5MB')
        return
      }

      onPaymentProof(file)
    }
  }

  // Payment instructions
  const instructions = [
    'Buka aplikasi mobile banking atau e-wallet Anda',
    'Pilih menu "Scan QR" atau "QRIS"',
    'Scan QR code yang ditampilkan di atas',
    'Masukkan nominal pembayaran secara manual',
    'Konfirmasi pembayaran di aplikasi Anda',
    'Ambil screenshot bukti pembayaran',
    'Upload bukti pembayaran menggunakan tombol di bawah'
  ]

  const supportedApps = [
    { name: 'GoPay', icon: '🟢' },
    { name: 'OVO', icon: '🟣' },
    { name: 'DANA', icon: '🔵' },
    { name: 'ShopeePay', icon: '🟠' },
    { name: 'LinkAja', icon: '🔴' },
    { name: 'BCA Mobile', icon: '🏦' },
    { name: 'Mandiri Online', icon: '🏦' },
    { name: 'BNI Mobile', icon: '🏦' },
    { name: 'BRI Mobile', icon: '🏦' }
  ]

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <QrCode className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Pembayaran QRIS
            </h2>
            <p className="text-sm text-gray-600">
              Scan QR code dengan aplikasi pembayaran
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Display */}
      <div className="p-6">
        <div className="text-center space-y-4">
          {/* QR Code Image */}
          <div className="mx-auto w-64 h-64 bg-white border-2 border-gray-200 rounded-lg p-4 relative">
            <div className="relative">
              <Image
                src={qrisInfo.qrImageUrl}
                alt="QRIS QR Code Cafe Kita"
                width={224}
                height={224}
                className="mx-auto"
                onLoad={() => setQrImageLoaded(true)}
                onError={() => {
                  setQrImageLoaded(false)
                  toast.error('Gagal memuat QR code')
                }}
              />
              
              {/* QR Code Actions */}
              {qrImageLoaded && (
                <div className="absolute top-2 right-2 flex space-x-1">
                  <button
                    onClick={handleDownloadQR}
                    className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                    title="Download QR Code"
                  >
                    <Download className="h-3 w-3 text-gray-600" />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                    title="Share QR Code"
                  >
                    <Share2 className="h-3 w-3 text-gray-600" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Amount Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">Total Pembayaran</div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl font-bold text-blue-900">
                Rp {amount.toLocaleString('id-ID')}
              </span>
              <button
                onClick={handleCopyAmount}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="Salin nominal"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-blue-600" />
                )}
              </button>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Ketuk ikon salin untuk menyalin nominal
            </div>
          </div>

          {/* Merchant Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-left">
            <div className="text-xs font-medium text-gray-700 mb-2">Informasi Merchant</div>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Nama:</span>
                <span className="font-medium">{qrisInfo.merchantName}</span>
              </div>
              <div className="flex justify-between">
                <span>Kota:</span>
                <span>{qrisInfo.merchantCity}</span>
              </div>
              <div className="flex justify-between">
                <span>ID Merchant:</span>
                <span className="font-mono">{qrisInfo.merchantId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={() => setShowFullInstructions(!showFullInstructions)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-2">
            <Smartphone className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              Cara Pembayaran QRIS
            </span>
          </div>
          <span className={`text-gray-500 transition-transform ${showFullInstructions ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showFullInstructions && (
          <div className="mt-4 space-y-4">
            {/* Step by step instructions */}
            <div className="space-y-2">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{instruction}</p>
                </div>
              ))}
            </div>

            {/* Supported Apps */}
            <div>
              <div className="text-sm font-medium text-gray-900 mb-2">
                Aplikasi yang Didukung:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {supportedApps.map((app, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded text-xs">
                    <span>{app.icon}</span>
                    <span className="text-gray-700">{app.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <div className="font-medium mb-1">Penting:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Pastikan nominal yang dibayar sesuai dengan yang tertera</li>
                    <li>• Scan QR code dari aplikasi e-wallet atau mobile banking</li>
                    <li>• Masukkan nominal secara manual sesuai total pembayaran</li>
                    <li>• Simpan bukti pembayaran untuk konfirmasi</li>
                    <li>• Hubungi kasir jika ada kendala pembayaran</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Proof Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-center space-y-3">
          <div className="text-sm font-medium text-gray-900">
            Upload Bukti Pembayaran
          </div>
          <p className="text-xs text-gray-600">
            Screenshot bukti transfer dari aplikasi Anda
          </p>
          
          <label className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer block">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Camera className="h-5 w-5" />
              <span className="text-sm font-medium">
                Pilih File atau Ambil Foto
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleProofUpload}
              className="hidden"
            />
          </label>

          <p className="text-xs text-gray-500">
            Format yang didukung: JPG, PNG, maksimal 5MB
          </p>
        </div>
      </div>
    </div>
  )
}