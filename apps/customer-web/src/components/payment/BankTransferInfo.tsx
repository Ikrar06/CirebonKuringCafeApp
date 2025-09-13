'use client'

import { useState, useRef } from 'react'
import { 
  University,
  Copy,
  Check,
  AlertCircle,
  Info,
  CreditCard,
  Smartphone,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react'
import { toast } from 'sonner'

// Types
interface BankAccount {
  bank_name: string
  account_number: string
  account_name: string
  bank_code?: string
  swift_code?: string
  branch?: string
}

interface BankTransferInfoProps {
  bankDetails: BankAccount
  amount: number
  transferCode: string
  orderNumber: string
  onPaymentProof: (file: File) => void
  className?: string
}

interface BankInfo {
  name: string
  logo: string
  color: string
  internetBanking: string
  mobileBanking: string
}

export default function BankTransferInfo({
  bankDetails,
  amount,
  transferCode,
  orderNumber,
  onPaymentProof,
  className = ''
}: BankTransferInfoProps) {
  // State management
  const [copiedField, setCopiedField] = useState<string>('')
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'mobile' | 'internet'>('mobile')

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bank information mapping
  const bankInfo: Record<string, BankInfo> = {
    'BCA': {
      name: 'Bank Central Asia',
      logo: '🏦',
      color: 'bg-blue-600',
      internetBanking: 'KlikBCA',
      mobileBanking: 'BCA Mobile'
    },
    'MANDIRI': {
      name: 'Bank Mandiri',
      logo: '🏦',
      color: 'bg-yellow-600',
      internetBanking: 'Mandiri Online',
      mobileBanking: 'Livin by Mandiri'
    },
    'BNI': {
      name: 'Bank Negara Indonesia',
      logo: '🏦',
      color: 'bg-orange-600',
      internetBanking: 'BNI Internet Banking',
      mobileBanking: 'BNI Mobile Banking'
    },
    'BRI': {
      name: 'Bank Rakyat Indonesia',
      logo: '🏦',
      color: 'bg-blue-800',
      internetBanking: 'BRI Internet Banking',
      mobileBanking: 'BRImo'
    }
  }

  const currentBank = bankInfo[bankDetails.bank_name] || {
    name: bankDetails.bank_name,
    logo: '🏦',
    color: 'bg-gray-600',
    internetBanking: 'Internet Banking',
    mobileBanking: 'Mobile Banking'
  }

  // Handle copy to clipboard
  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast.success(`${fieldName} berhasil disalin`)
      
      setTimeout(() => {
        setCopiedField('')
      }, 2000)
    } catch (error) {
      console.error('Error copying text:', error)
      toast.error(`Gagal menyalin ${fieldName}`)
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

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Format account number for display
  const formatAccountNumber = (accountNumber: string, show: boolean) => {
    if (show) return accountNumber
    const visibleDigits = 4
    const hiddenPart = '*'.repeat(Math.max(0, accountNumber.length - visibleDigits))
    return hiddenPart + accountNumber.slice(-visibleDigits)
  }

  // Instructions for different methods
  const getInstructions = (method: 'mobile' | 'internet') => {
    const appName = currentBank.mobileBanking
    
    switch (method) {
      case 'mobile':
        return [
          `Buka aplikasi ${appName}`,
          'Login dengan PIN atau biometrik Anda',
          'Pilih menu "Transfer" atau "Kirim Uang"',
          'Pilih "Transfer ke Bank Lain" atau "Transfer Antar Bank"',
          'Masukkan nomor rekening tujuan',
          'Masukkan nominal transfer yang tepat',
          'Masukkan kode transfer sebagai berita transfer',
          'Konfirmasi dan selesaikan transaksi',
          'Screenshot bukti transfer',
          'Upload bukti transfer di aplikasi ini'
        ]
      case 'internet':
        return [
          `Buka website ${currentBank.internetBanking}`,
          'Login dengan user ID dan password',
          'Pilih menu "Transfer"',
          'Pilih "Transfer ke Bank Lain"',
          'Masukkan informasi rekening tujuan',
          'Masukkan nominal dan kode transfer',
          'Konfirmasi dengan token/SMS OTP',
          'Simpan bukti transfer',
          'Upload bukti transfer'
        ]
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 ${currentBank.color} rounded-lg flex items-center justify-center`}>
            <University className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transfer Bank
            </h2>
            <p className="text-sm text-gray-600">
              {currentBank.name}
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Details */}
      <div className="p-4 space-y-4">
        {/* Amount */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-sm text-blue-700 mb-1">Total Transfer</div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl font-bold text-blue-900">
                Rp {amount.toLocaleString('id-ID')}
              </span>
              <button
                onClick={() => handleCopy(amount.toString(), 'Nominal')}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="Salin nominal"
              >
                {copiedField === 'Nominal' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-blue-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900">
            Informasi Rekening Tujuan
          </h3>

          {/* Bank Name */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Nama Bank</div>
              <div className="font-medium text-gray-900">{bankDetails.bank_name}</div>
            </div>
            <span className="text-2xl">{currentBank.logo}</span>
          </div>

          {/* Account Number */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="text-sm text-gray-600">Nomor Rekening</div>
              <div className="font-mono text-lg font-medium text-gray-900">
                {formatAccountNumber(bankDetails.account_number, showAccountNumber)}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAccountNumber(!showAccountNumber)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title={showAccountNumber ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showAccountNumber ? (
                  <EyeOff className="h-4 w-4 text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => handleCopy(bankDetails.account_number, 'Nomor Rekening')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Salin nomor rekening"
              >
                {copiedField === 'Nomor Rekening' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Account Name */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Nama Penerima</div>
              <div className="font-medium text-gray-900">{bankDetails.account_name}</div>
            </div>
            <button
              onClick={() => handleCopy(bankDetails.account_name, 'Nama Penerima')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Salin nama penerima"
            >
              {copiedField === 'Nama Penerima' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>

          {/* Transfer Code */}
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <div className="text-sm text-yellow-700">Kode Transfer (Wajib)</div>
              <div className="font-mono text-lg font-bold text-yellow-900">{transferCode}</div>
              <div className="text-xs text-yellow-600 mt-1">
                Masukkan kode ini sebagai berita transfer atau referensi
              </div>
            </div>
            <button
              onClick={() => handleCopy(transferCode, 'Kode Transfer')}
              className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
              title="Salin kode transfer"
            >
              {copiedField === 'Kode Transfer' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-yellow-700" />
              )}
            </button>
          </div>

          {/* Bank Code (if available) */}
          {bankDetails.bank_code && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Kode Bank</div>
                <div className="font-mono font-medium text-gray-900">{bankDetails.bank_code}</div>
              </div>
              <button
                onClick={() => handleCopy(bankDetails.bank_code!, 'Kode Bank')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Salin kode bank"
              >
                {copiedField === 'Kode Bank' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Important Notes */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-700">
              <div className="font-medium mb-2">Penting untuk Diperhatikan:</div>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Nominal harus persis</strong> - Rp {amount.toLocaleString('id-ID')}</li>
                <li>• <strong>Wajib mencantumkan kode transfer:</strong> {transferCode}</li>
                <li>• Simpan bukti transfer untuk konfirmasi</li>
                <li>• Pesanan baru diproses setelah transfer dikonfirmasi</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Methods */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              Cara Transfer
            </span>
          </div>
          <span className={`text-gray-500 transition-transform ${showInstructions ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showInstructions && (
          <div className="mt-4 space-y-4">
            {/* Method Selection */}
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedMethod('mobile')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedMethod === 'mobile'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Smartphone className="h-4 w-4 mx-auto mb-1" />
                Mobile Banking
              </button>
              <button
                onClick={() => setSelectedMethod('internet')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedMethod === 'internet'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CreditCard className="h-4 w-4 mx-auto mb-1" />
                Internet Banking
              </button>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900 mb-3">
                Langkah-langkah {selectedMethod === 'mobile' ? 'Mobile Banking' : 'Internet Banking'}:
              </div>
              {getInstructions(selectedMethod).map((instruction, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{instruction}</p>
                </div>
              ))}
            </div>

            {/* Quick Copy All */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-900 mb-2">
                Copy Semua Informasi Transfer
              </div>
              <button
                onClick={() => {
                  const allInfo = `Bank: ${bankDetails.bank_name}\nRekening: ${bankDetails.account_number}\nNama: ${bankDetails.account_name}\nNominal: Rp ${amount.toLocaleString('id-ID')}\nKode: ${transferCode}`
                  handleCopy(allInfo, 'Semua Informasi')
                }}
                className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {copiedField === 'Semua Informasi' ? (
                  <Check className="h-4 w-4 mx-auto" />
                ) : (
                  'Copy Semua ke Clipboard'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Proof Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-center space-y-3">
          <div className="text-sm font-medium text-gray-900">
            Upload Bukti Transfer
          </div>
          <p className="text-xs text-gray-600">
            Screenshot bukti transfer dari aplikasi mobile banking
          </p>
          
          <button
            onClick={triggerFileInput}
            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Camera className="h-5 w-5" />
              <span className="text-sm font-medium">
                Pilih File atau Ambil Foto
              </span>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleProofUpload}
            className="hidden"
          />

          <p className="text-xs text-gray-500">
            Format yang didukung: JPG, PNG, maksimal 5MB
          </p>
        </div>
      </div>

      {/* Transfer Tips */}
      <div className="border-t border-gray-200 p-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <div className="font-medium mb-1">Tips Transfer:</div>
              <ul className="space-y-1 text-xs">
                <li>• Gunakan mobile banking untuk transfer yang lebih cepat</li>
                <li>• Screenshot langsung dari aplikasi untuk bukti yang jelas</li>
                <li>• Pastikan signal internet stabil saat transfer</li>
                <li>• Double check nomor rekening sebelum transfer</li>
                <li>• Jangan lupa mencantumkan kode transfer di berita/referensi</li>
                <li>• Transfer biasanya terverifikasi dalam 1-5 menit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}