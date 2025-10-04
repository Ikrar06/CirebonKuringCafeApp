'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  QrCode,
  Building2,
  Save,
  Loader2,
  CheckCircle,
  Plus,
  Trash2,
  X
} from 'lucide-react'

interface BankAccount {
  bank: string
  name: string
  account: string
}

interface PaymentMethods {
  cash: boolean
  qris: boolean
  transfer: boolean
  card: boolean
}

export default function PaymentMethodsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const [settingIds, setSettingIds] = useState({ methods: '', accounts: '' })
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({
    cash: true,
    qris: true,
    transfer: true,
    card: false
  })
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])

  const [newAccount, setNewAccount] = useState({
    bank: '',
    name: '',
    account: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings?category=payment')
      const { data } = await response.json()

      if (data) {
        // Parse payment methods
        const methodsSetting = data.find((s: any) => s.key === 'methods')
        if (methodsSetting) {
          setSettingIds(prev => ({ ...prev, methods: methodsSetting.id }))
          setPaymentMethods(methodsSetting.value)
        }

        // Parse bank accounts
        const accountsSetting = data.find((s: any) => s.key === 'bank_accounts')
        if (accountsSetting) {
          setSettingIds(prev => ({ ...prev, accounts: accountsSetting.id }))
          setBankAccounts(accountsSetting.value || [])
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = (method: keyof PaymentMethods) => {
    setPaymentMethods(prev => ({ ...prev, [method]: !prev[method] }))
  }

  const handleAddAccount = () => {
    if (!newAccount.bank || !newAccount.name || !newAccount.account) {
      alert('Semua field wajib diisi!')
      return
    }

    setBankAccounts(prev => [...prev, { ...newAccount }])
    setNewAccount({ bank: '', name: '', account: '' })
    setShowAddModal(false)
  }

  const handleDeleteAccount = (index: number) => {
    if (confirm('Hapus akun bank ini?')) {
      setBankAccounts(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save payment methods
      if (settingIds.methods) {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: settingIds.methods,
            value: paymentMethods
          })
        })
      }

      // Save bank accounts
      if (settingIds.accounts) {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: settingIds.accounts,
            value: bankAccounts
          })
        })
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving payment methods:', error)
      alert('Gagal menyimpan konfigurasi')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Metode Pembayaran</h1>
                  <p className="text-sm text-gray-600">Atur metode pembayaran yang diterima</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-2 disabled:opacity-50 shadow-sm transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : showSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Simpan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Payment Methods Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Tipe Pembayaran</h2>
            <div className="space-y-4">
              {/* Cash */}
              <label className="flex items-center justify-between p-5 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Tunai (Cash)</p>
                    <p className="text-sm text-gray-600">Pembayaran tunai langsung</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={paymentMethods.cash}
                  onChange={() => handleToggle('cash')}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>

              {/* QRIS */}
              <label className="flex items-center justify-between p-5 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <QrCode className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">QRIS</p>
                    <p className="text-sm text-gray-600">Scan QR Code untuk pembayaran</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={paymentMethods.qris}
                  onChange={() => handleToggle('qris')}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>

              {/* Transfer */}
              <label className="flex items-center justify-between p-5 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Transfer Bank / E-Wallet</p>
                    <p className="text-sm text-gray-600">Transfer ke rekening atau e-wallet</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={paymentMethods.transfer}
                  onChange={() => handleToggle('transfer')}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>

              {/* Card */}
              <label className="flex items-center justify-between p-5 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Kartu Debit/Kredit</p>
                    <p className="text-sm text-gray-600">EDC Machine</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={paymentMethods.card}
                  onChange={() => handleToggle('card')}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Bank Accounts / E-Wallets */}
        {paymentMethods.transfer && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Rekening Bank & E-Wallet</h2>
                  <p className="text-sm text-gray-600 mt-1">Tambahkan rekening bank atau nomor e-wallet untuk transfer</p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah</span>
                </button>
              </div>

              {bankAccounts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Belum ada rekening bank atau e-wallet</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center space-x-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Tambah Rekening</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bankAccounts.map((account, index) => (
                    <div
                      key={index}
                      className="p-5 bg-blue-50 border-2 border-blue-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg">{account.bank}</h3>
                            <p className="text-sm text-gray-700 mt-1">{account.name}</p>
                            <p className="text-sm font-mono text-gray-900 mt-1 font-semibold">
                              {account.account}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteAccount(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-900 mb-2">Ringkasan</h3>
          <div className="space-y-2 text-sm text-blue-700">
            <p>• {Object.values(paymentMethods).filter(Boolean).length} metode pembayaran aktif</p>
            {paymentMethods.transfer && <p>• {bankAccounts.length} rekening bank/e-wallet terdaftar</p>}
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Tambah Rekening / E-Wallet</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewAccount({ bank: '', name: '', account: '' })
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Bank / E-Wallet *
                </label>
                <input
                  type="text"
                  value={newAccount.bank}
                  onChange={(e) => setNewAccount({ ...newAccount, bank: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="BCA / GoPay / OVO / DANA"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Contoh: BCA, Mandiri, GoPay, OVO, DANA, dll
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Pemilik *
                </label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="PT Cafe Digital / Nama Pemilik"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Rekening / HP *
                </label>
                <input
                  type="text"
                  value={newAccount.account}
                  onChange={(e) => setNewAccount({ ...newAccount, account: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1234567890 / 08xxxxxxxxxx"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewAccount({ bank: '', name: '', account: '' })
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleAddAccount}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
