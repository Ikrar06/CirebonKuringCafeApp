'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Download, Calendar, DollarSign, ShoppingCart, Package,
  Users, TrendingUp, BarChart3
} from 'lucide-react'

type ReportType = 'sales' | 'inventory' | 'employee' | 'financial'

interface DateRange {
  start: string
  end: string
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales')
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadReport()
  }, [reportType, dateRange])

  const loadReport = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/reports/${reportType}?start=${dateRange.start}&end=${dateRange.end}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch report')
      }

      const { data } = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      const response = await fetch(
        `/api/reports/${reportType}/export?format=${format}&start=${dateRange.start}&end=${dateRange.end}`
      )

      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}_report_${dateRange.start}_${dateRange.end}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report')
    }
  }

  const reportTypes = [
    {
      id: 'sales' as ReportType,
      label: 'Sales Report',
      icon: ShoppingCart,
      description: 'Revenue, orders, and payment analysis',
      color: 'blue'
    },
    {
      id: 'inventory' as ReportType,
      label: 'Inventory Report',
      icon: Package,
      description: 'Stock levels, movements, and wastage',
      color: 'green'
    },
    {
      id: 'employee' as ReportType,
      label: 'Employee Report',
      icon: Users,
      description: 'Performance, attendance, and payroll',
      color: 'purple'
    },
    {
      id: 'financial' as ReportType,
      label: 'Financial Report',
      icon: DollarSign,
      description: 'Cash flow, expenses, and profit',
      color: 'orange'
    }
  ]

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
          <p className="text-gray-600">Generate and export comprehensive business reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-gray-600" />
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Last 7 days
            </button>
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Last 30 days
            </button>
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              This month
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((type) => {
          const Icon = type.icon
          const colors = colorClasses[type.color]
          const isSelected = reportType === type.id

          return (
            <button
              key={type.id}
              onClick={() => setReportType(type.id)}
              className={`p-4 border-2 rounded-xl text-left transition-all ${
                isSelected
                  ? `${colors.border} ${colors.bg} ring-2 ring-offset-2`
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? colors.bg : 'bg-gray-100'} ${isSelected ? colors.text : 'text-gray-600'}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${isSelected ? colors.text : 'text-gray-900'}`}>
                    {type.label}
                  </h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      ) : !reportData ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Select a date range and report type to view data</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          {reportData.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {reportData.summary.map((item: any, index: number) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${item.bgColor || 'bg-blue-100'}`}>
                      {item.icon || <TrendingUp className={`h-6 w-6 ${item.color || 'text-blue-600'}`} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{item.label}</p>
                      <p className={`text-2xl font-bold ${item.color || 'text-gray-900'}`}>
                        {item.format === 'currency' ? formatCurrency(item.value) : item.value}
                      </p>
                      {item.change && (
                        <p className={`text-xs mt-1 ${item.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.change > 0 ? '+' : ''}{item.change}% from previous period
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          {reportData.table && reportData.table.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {reportType === 'sales' && 'Sales Transactions'}
                {reportType === 'inventory' && 'Inventory Movements'}
                {reportType === 'employee' && 'Employee Performance'}
                {reportType === 'financial' && 'Financial Transactions'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {reportData.columns?.map((col: string, index: number) => (
                        <th key={index} className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.table.map((row: any, rowIndex: number) => (
                      <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                        {Object.values(row).map((cell: any, cellIndex: number) => (
                          <td key={cellIndex} className="py-3 px-4 text-sm text-gray-900">
                            {typeof cell === 'number' && reportData.columns?.[cellIndex]?.includes('Amount')
                              ? formatCurrency(cell)
                              : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts */}
          {reportData.chart && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
              {/* Placeholder for chart - implement with chart library */}
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Chart visualization (integrate chart library)</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
