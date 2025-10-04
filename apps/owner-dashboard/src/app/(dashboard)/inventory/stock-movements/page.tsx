'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  RefreshCw,
  Search
} from 'lucide-react'
import { useInventoryStore } from '@/stores/inventoryStore'
import { inventoryService } from '@/services/inventoryService'
import StockMovementForm from '../components/StockMovementForm'

export default function StockMovementsPage() {
  const {
    stockMovements,
    isLoading,
    fetchStockMovements
  } = useInventoryStore()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })

  useEffect(() => {
    loadMovements()
  }, [filterType, dateRange])

  const loadMovements = () => {
    const filters: any = { limit: 100 }

    if (filterType) {
      filters.movement_type = filterType
    }

    if (dateRange.start) {
      filters.start_date = dateRange.start
    }

    if (dateRange.end) {
      filters.end_date = dateRange.end
    }

    fetchStockMovements(filters)
  }

  // Filter movements by search query
  const filteredMovements = stockMovements.filter(movement => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      movement.ingredient_name?.toLowerCase().includes(query) ||
      movement.supplier_name?.toLowerCase().includes(query) ||
      movement.notes?.toLowerCase().includes(query)
    )
  })

  // Calculate stats
  const stats = {
    totalPurchases: stockMovements.filter(m => m.movement_type === 'purchase').length,
    totalUsage: stockMovements.filter(m => m.movement_type === 'usage').length,
    totalWaste: stockMovements.filter(m => m.movement_type === 'waste').length,
    totalValue: stockMovements.reduce((sum, m) => sum + (m.total_cost || 0), 0)
  }

  const formatCurrency = (amount: number) => {
    return inventoryService.formatCurrency(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'usage':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'waste':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'return':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMovementTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Ingredient', 'Type', 'Quantity', 'Unit', 'Cost', 'Supplier', 'Notes']
    const rows = filteredMovements.map(m => [
      formatDate(m.created_at || ''),
      m.ingredient_name || '',
      getMovementTypeLabel(m.movement_type),
      m.quantity.toString(),
      m.unit || '',
      m.total_cost ? formatCurrency(m.total_cost) : '',
      m.supplier_name || '',
      m.notes || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `stock-movements-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-gray-600">Track all inventory movements and transactions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Record Movement</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Purchases</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
          <p className="text-xs text-gray-600 mt-1">Stock in</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="h-6 w-6 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase">Usage</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalUsage}</p>
          <p className="text-xs text-gray-600 mt-1">Stock out</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Package className="h-6 w-6 text-red-600" />
            <span className="text-xs text-gray-500 uppercase">Waste</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalWaste}</p>
          <p className="text-xs text-gray-600 mt-1">Lost items</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xl font-bold text-green-600">Rp</span>
            <span className="text-xs text-gray-500 uppercase">Total Value</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
          <p className="text-xs text-gray-600 mt-1">Transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ingredient, supplier, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Movement Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="usage">Usage</option>
              <option value="waste">Waste</option>
              <option value="adjustment">Adjustment</option>
              <option value="return">Return</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ingredient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock Level
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No stock movements found
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.created_at ? formatDate(movement.created_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full border ${getMovementTypeColor(
                          movement.movement_type
                        )}`}
                      >
                        {getMovementTypeLabel(movement.movement_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {movement.ingredient_name}
                      </div>
                      {movement.notes && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {movement.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-semibold ${
                          movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {movement.quantity >= 0 ? '+' : ''}
                        {movement.quantity.toFixed(1)} {movement.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.supplier_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.batch_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.total_cost ? formatCurrency(movement.total_cost) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {movement.stock_before?.toFixed(1)} → {movement.stock_after?.toFixed(1)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movement Form Modal */}
      {isFormOpen && (
        <StockMovementForm
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false)
            loadMovements()
          }}
        />
      )}
    </div>
  )
}