'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Link from 'next/link'

interface Payroll {
  id: string
  employee_id: string
  period_start: string
  period_end: string
  basic_salary: number
  overtime_hours: number
  overtime_pay: number
  gross_salary: number
  total_deductions: number
  late_deduction?: number
  absence_deduction?: number
  bonus?: number
  net_salary: number
  payment_status: 'pending' | 'paid'
  payment_date: string | null
  notes: string | null
  created_at: string
  month: string
  year: string
}

export default function PayslipPage() {
  const { employee } = useAuth()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [filteredPayrolls, setFilteredPayrolls] = useState<Payroll[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filter states
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  useEffect(() => {
    fetchPayrolls()
  }, [])

  useEffect(() => {
    filterPayrolls()
  }, [payrolls, selectedYear, selectedMonth])

  const fetchPayrolls = async () => {
    try {
      const token = localStorage.getItem('employee_auth_token')

      if (!token) {
        setError('Token tidak ditemukan. Silakan login ulang.')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/payslip', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setPayrolls(data.payrolls || [])
      } else {
        setError(data.error || 'Gagal memuat data slip gaji')
      }
    } catch (err) {
      console.error('Error fetching payrolls:', err)
      setError('Terjadi kesalahan saat memuat data')
    } finally {
      setIsLoading(false)
    }
  }

  const filterPayrolls = () => {
    let filtered = [...payrolls]

    if (selectedYear) {
      filtered = filtered.filter(p => String(p.year) === selectedYear)
    }

    if (selectedMonth) {
      filtered = filtered.filter(p => String(p.month) === selectedMonth)
    }

    setFilteredPayrolls(filtered)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getAvailableYears = () => {
    const years = new Set<string>()
    payrolls.forEach(p => {
      years.add(p.year)
    })
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))
  }

  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ]

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat data slip gaji...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <span>Slip Gaji</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Lihat riwayat slip gaji dan detail pembayaran Anda
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tahun
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                <option value="">Semua Tahun</option>
                {getAvailableYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                <option value="">Semua Bulan</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedYear(new Date().getFullYear().toString())
                  setSelectedMonth('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
              >
                Reset Filter
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Menampilkan {filteredPayrolls.length} dari {payrolls.length} slip gaji
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Payroll List */}
        {filteredPayrolls.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Belum Ada Slip Gaji
            </h3>
            <p className="text-gray-600">
              {selectedYear || selectedMonth
                ? 'Tidak ada slip gaji untuk periode yang dipilih'
                : 'Slip gaji Anda akan muncul di sini setelah proses payroll dilakukan'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayrolls.map((payroll) => {
              const isExpanded = expandedId === payroll.id
              const isPaid = payroll.payment_status === 'paid'

              return (
                <div
                  key={payroll.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Payroll Header */}
                  <div
                    onClick={() => toggleExpand(payroll.id)}
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-gray-500" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {format(new Date(payroll.period_start), 'd MMM', { locale: id })} - {format(new Date(payroll.period_end), 'd MMM yyyy', { locale: id })}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Periode: {months.find(m => m.value === String(payroll.month))?.label || 'Unknown'} {payroll.year}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(payroll.net_salary)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {isPaid ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Dibayar
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payroll Details (Expanded) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-gray-900 uppercase">
                            Pendapatan
                          </h4>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                              <div className="flex items-center space-x-3">
                                <DollarSign className="h-5 w-5 text-gray-500" />
                                <span className="text-sm text-gray-700">Gaji Pokok</span>
                              </div>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(payroll.basic_salary)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Clock className="h-5 w-5 text-gray-500" />
                                <div>
                                  <p className="text-sm text-gray-700">Lembur</p>
                                  <p className="text-xs text-gray-500">
                                    {payroll.overtime_hours} jam
                                  </p>
                                </div>
                              </div>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(payroll.overtime_pay)}
                              </span>
                            </div>

                            {(payroll.bonus || 0) > 0 && (
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <TrendingUp className="h-5 w-5 text-green-500" />
                                  <span className="text-sm text-gray-700">Bonus</span>
                                </div>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(payroll.bonus || 0)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <span className="text-sm font-semibold text-blue-900">
                                Total Pendapatan
                              </span>
                              <span className="font-bold text-blue-900">
                                {formatCurrency(payroll.gross_salary)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-gray-900 uppercase">
                            Potongan & Net Salary
                          </h4>

                          <div className="space-y-3">
                            {(payroll.late_deduction || 0) > 0 && (
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                                <span className="text-sm text-gray-700">Potongan Terlambat</span>
                                <span className="font-medium text-red-600">
                                  -{formatCurrency(payroll.late_deduction || 0)}
                                </span>
                              </div>
                            )}
                            {(payroll.absence_deduction || 0) > 0 && (
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                                <span className="text-sm text-gray-700">Potongan Absen</span>
                                <span className="font-medium text-red-600">
                                  -{formatCurrency(payroll.absence_deduction || 0)}
                                </span>
                              </div>
                            )}

                            {payroll.total_deductions > 0 && (
                              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                <span className="text-sm font-semibold text-red-900">
                                  Total Potongan
                                </span>
                                <span className="font-bold text-red-900">
                                  -{formatCurrency(payroll.total_deductions)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
                              <span className="text-sm font-bold text-green-900">
                                Gaji Bersih (Take Home Pay)
                              </span>
                              <span className="text-xl font-bold text-green-900">
                                {formatCurrency(payroll.net_salary)}
                              </span>
                            </div>

                            {isPaid && payroll.payment_date && (
                              <div className="p-3 bg-white rounded-lg">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span>
                                    Dibayar pada {format(new Date(payroll.payment_date), 'd MMMM yyyy', { locale: id })}
                                  </span>
                                </div>
                              </div>
                            )}

                            {payroll.notes && (
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs font-semibold text-blue-900 mb-1">
                                  Catatan:
                                </p>
                                <p className="text-sm text-blue-800">{payroll.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-end space-x-3">
                        <Link
                          href={`/payslip/${payroll.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Lihat Detail & Cetak</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Informasi</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Slip gaji akan tersedia setelah proses payroll bulanan selesai</li>
            <li>• Klik pada slip gaji untuk melihat detail pendapatan dan potongan</li>
            <li>• Anda dapat mencetak atau download slip gaji untuk arsip pribadi</li>
            <li>• Hubungi HR jika ada pertanyaan mengenai perhitungan gaji</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
