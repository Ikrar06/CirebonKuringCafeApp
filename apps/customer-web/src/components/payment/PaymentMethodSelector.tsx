'use client'

import { useState } from 'react'
import {
  CreditCard,
  Smartphone,
  Banknote,
  University,
  Check,
  AlertCircle,
  QrCode,
  Info
} from 'lucide-react'

// Types
interface PaymentMethod {
  id: string
  name: string
  type: 'cash' | 'card' | 'qris' | 'transfer'
  description: string
  icon: React.ReactNode
  processing_time: string
  fee?: number
  fee_description?: string
  is_available: boolean
  instructions?: string[]
  min_amount?: number
  max_amount?: number
}

interface PaymentMethodSelectorProps {
  onMethodSelect: (methodId: string) => void
  selectedMethod: string
  orderTotal: number
  disabled?: boolean
}

export default function PaymentMethodSelector({
  onMethodSelect,
  selectedMethod,
  orderTotal,
  disabled = false
}: PaymentMethodSelectorProps) {

  // Payment methods configuration
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'qris',
      name: 'QRIS',
      type: 'qris',
      description: 'Bayar dengan scan QR code menggunakan aplikasi bank atau e-wallet',
      icon: <QrCode className="h-6 w-6" />,
      processing_time: 'Instan',
      is_available: true,
      instructions: [
        'Scan QR code dengan aplikasi bank atau e-wallet Anda',
        'Masukkan nominal sesuai total pembayaran',
        'Konfirmasi pembayaran di aplikasi',
        'Upload bukti pembayaran'
      ]
    },
    {
      id: 'transfer',
      name: 'Transfer Bank',
      type: 'transfer',
      description: 'Transfer ke rekening bank cafe',
      icon: <University className="h-6 w-6" />,
      processing_time: '1-5 menit',
      is_available: true,
      instructions: [
        'Transfer ke nomor rekening yang disediakan',
        'Gunakan kode unik untuk identifikasi',
        'Upload bukti transfer',
        'Tunggu konfirmasi dari kasir'
      ]
    },
    {
      id: 'cash',
      name: 'Tunai',
      type: 'cash',
      description: 'Bayar langsung di kasir dengan uang tunai',
      icon: <Banknote className="h-6 w-6" />,
      processing_time: 'Langsung',
      is_available: true,
      instructions: [
        'Datang ke meja kasir',
        'Sebutkan nomor pesanan Anda',
        'Bayar sesuai total yang tertera',
        'Simpan struk pembayaran'
      ]
    },
    {
      id: 'card',
      name: 'Kartu Debit/Kredit',
      type: 'card',
      description: 'Bayar dengan kartu debit atau kredit di kasir',
      icon: <CreditCard className="h-6 w-6" />,
      processing_time: 'Langsung',
      is_available: true,
      instructions: [
        'Datang ke meja kasir',
        'Sebutkan nomor pesanan Anda',
        'Gesek atau tap kartu di mesin EDC',
        'Masukkan PIN jika diperlukan'
      ]
    }
  ]

  // Get method availability
  const getMethodAvailability = (method: PaymentMethod) => {
    if (!method.is_available) {
      return { available: false, reason: 'Tidak tersedia' }
    }

    if (method.min_amount && orderTotal < method.min_amount) {
      return {
        available: false,
        reason: `Minimum Rp ${method.min_amount.toLocaleString('id-ID')}`
      }
    }

    if (method.max_amount && orderTotal > method.max_amount) {
      return {
        available: false,
        reason: `Maksimum Rp ${method.max_amount.toLocaleString('id-ID')}`
      }
    }

    return { available: true, reason: '' }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          Metode Pembayaran
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Pilih cara pembayaran yang Anda inginkan
        </p>
      </div>

      <div className="p-4 space-y-3">
        {paymentMethods.map((method) => {
          const availability = getMethodAvailability(method)
          const isSelected = selectedMethod === method.id

          return (
            <button
              key={method.id}
              onClick={() => availability.available && !disabled && onMethodSelect(method.id)}
              disabled={!availability.available || disabled}
              className={`
                w-full
                text-left
                p-4
                border
                rounded-lg
                transition-all
                ${availability.available && !disabled
                  ? isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                  : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className={`
                  p-2
                  rounded-lg
                  ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                `}>
                  {method.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {method.name}
                      </h3>
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {method.processing_time}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    {method.description}
                  </p>

                  {/* Fee information */}
                  {method.fee && method.fee > 0 && (
                    <div className="text-xs text-orange-600 mt-1">
                      {method.fee_description || `Biaya admin Rp ${method.fee.toLocaleString('id-ID')}`}
                    </div>
                  )}

                  {/* Availability status */}
                  {!availability.available && (
                    <div className="text-xs text-red-600 mt-1 flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{availability.reason}</span>
                    </div>
                  )}

                  {/* Instructions preview */}
                  {isSelected && method.instructions && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs font-medium text-blue-900 mb-2">
                        Langkah-langkah:
                      </div>
                      <ol className="text-xs text-blue-700 space-y-1">
                        {method.instructions.map((instruction, index) => (
                          <li key={index} className="flex items-start space-x-1">
                            <span className="font-medium">{index + 1}.</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}