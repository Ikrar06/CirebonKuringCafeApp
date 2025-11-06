'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import {
  FileText,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Download,
  ArrowLeft,
  Loader2,
  User,
  Building
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

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

export default function PayslipDetailPage() {
  const { employee } = useAuth()
  const params = useParams()
  const router = useRouter()
  const monthId = params.month as string

  const [payroll, setPayroll] = useState<Payroll | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (monthId && employee) {
      fetchPayrollDetail()
    }
  }, [monthId, employee])

  const fetchPayrollDetail = async () => {
    try {
      setIsLoading(true)
      setError('')

      const token = localStorage.getItem('employee_auth_token')
      if (!token) {
        setError('Token tidak ditemukan. Silakan login ulang.')
        return
      }

      const response = await fetch('/api/payslip', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        const payrolls = data.payrolls || []
        const targetPayroll = payrolls.find((p: Payroll) => p.id === monthId)

        if (targetPayroll) {
          setPayroll(targetPayroll)
        } else {
          setError('Slip gaji tidak ditemukan')
        }
      } else {
        setError(data.error || 'Gagal memuat data slip gaji')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Memuat slip gaji...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !payroll) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              {error || 'Slip gaji tidak ditemukan'}
            </h2>
            <button
              onClick={() => router.push('/payslip')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Daftar Slip Gaji</span>
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const isPaid = payroll.payment_status === 'paid'
  const monthLabel = months.find(m => m.value === String(payroll.month))?.label || 'Unknown'

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Actions (No Print) */}
        <div className="print:hidden flex items-center justify-between">
          <button
            onClick={() => router.push('/payslip')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Kembali</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Cetak / Download PDF</span>
          </button>
        </div>

        {/* Payslip Document */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 print:shadow-none print:border-0">
          {/* Header */}
          <div className="text-center border-b-2 border-gray-900 pb-6 mb-6">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <Building className="h-8 w-8 text-gray-700" />
              <h1 className="text-3xl font-bold text-gray-900">Cirebon Kuring Cafe</h1>
            </div>
            <p className="text-gray-600 text-sm">Jl. Contoh Alamat No. 123, Cirebon</p>
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-gray-900">SLIP GAJI KARYAWAN</h2>
              <p className="text-gray-600 mt-1">
                Periode: {monthLabel} {payroll.year}
              </p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Nama Karyawan</p>
                  <p className="font-semibold text-gray-900">{employee?.full_name}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Posisi</p>
                  <p className="font-semibold text-gray-900">{employee?.position || '-'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-right">
              <div>
                <p className="text-sm text-gray-600">Periode Pembayaran</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(payroll.period_start), 'd MMM', { locale: id })} - {format(new Date(payroll.period_end), 'd MMM yyyy', { locale: id })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status Pembayaran</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isPaid ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Dibayar
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Earnings Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase border-b border-gray-300 pb-2">
              Pendapatan
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700">Gaji Pokok</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(payroll.basic_salary)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <span className="text-gray-700">Uang Lembur</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({payroll.overtime_hours} jam)
                    </span>
                  </div>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(payroll.overtime_pay)}
                </span>
              </div>

              {(payroll.bonus || 0) > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">Bonus</span>
                  </div>
                  <span className="font-medium text-green-600">
                    {formatCurrency(payroll.bonus || 0)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-3 bg-blue-50 rounded-lg px-4 border border-blue-200">
                <span className="font-bold text-blue-900">Total Pendapatan Kotor</span>
                <span className="font-bold text-blue-900 text-lg">
                  {formatCurrency(payroll.gross_salary)}
                </span>
              </div>
            </div>
          </div>

          {/* Deductions Section */}
          {payroll.total_deductions > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase border-b border-gray-300 pb-2">
                Potongan
              </h3>
              <div className="space-y-3">
                {(payroll.late_deduction || 0) > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-700">Potongan Keterlambatan</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(payroll.late_deduction || 0)}
                    </span>
                  </div>
                )}

                {(payroll.absence_deduction || 0) > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-700">Potongan Ketidakhadiran</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(payroll.absence_deduction || 0)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-3 bg-red-50 rounded-lg px-4 border border-red-200">
                  <span className="font-bold text-red-900">Total Potongan</span>
                  <span className="font-bold text-red-900 text-lg">
                    -{formatCurrency(payroll.total_deductions)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Net Salary */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm uppercase font-medium">
                  Gaji Bersih (Take Home Pay)
                </p>
                <p className="text-4xl font-bold mt-2">
                  {formatCurrency(payroll.net_salary)}
                </p>
              </div>
              <CheckCircle className="h-16 w-16 text-green-200 opacity-50" />
            </div>
          </div>

          {/* Payment Info */}
          {isPaid && payroll.payment_date && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Tanggal Pembayaran</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(payroll.payment_date), 'd MMMM yyyy', { locale: id })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {payroll.notes && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">Catatan:</p>
              <p className="text-sm text-blue-800">{payroll.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-gray-200 pt-6 mt-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-12">Diterima oleh,</p>
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-semibold text-gray-900">{employee?.full_name}</p>
                  <p className="text-sm text-gray-600">Karyawan</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-12">Diberikan oleh,</p>
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-semibold text-gray-900">Management</p>
                  <p className="text-sm text-gray-600">HR / Owner</p>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-gray-500 mt-8">
              Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah.
              <br />
              Dicetak pada: {format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })}
            </p>
          </div>
        </div>

        {/* Info (No Print) */}
        <div className="print:hidden bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Informasi</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Simpan slip gaji ini untuk keperluan administrasi pribadi</li>
            <li>• Klik tombol "Cetak / Download PDF" untuk menyimpan dalam format PDF</li>
            <li>• Hubungi HR jika terdapat perbedaan dalam perhitungan gaji</li>
          </ul>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </DashboardLayout>
  )
}
