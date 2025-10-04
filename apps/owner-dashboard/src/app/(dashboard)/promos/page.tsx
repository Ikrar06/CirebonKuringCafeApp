'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Tag, Calendar, TrendingUp, Eye, Edit, Trash2, Copy, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'

interface Promo {
  id: string
  name: string
  code: string
  description: string
  promo_type: 'percentage' | 'fixed_amount' | 'buy_get' | 'bundle'
  discount_value: number
  min_purchase_amount?: number
  max_discount_amount?: number
  valid_from?: string
  valid_until?: string
  max_uses_total?: number
  current_uses: number
  is_active: boolean
  created_at: string
}

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  useEffect(() => {
    loadPromos()
  }, [])

  const loadPromos = async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/promos')
      if (!response.ok) {
        throw new Error('Failed to fetch promos')
      }

      const { data } = await response.json()
      setPromos(data || [])

      console.log('Loaded promos:', data?.length || 0)
    } catch (error) {
      console.error('Error loading promos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/promos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle promo status')
      }

      setPromos(prev => prev.map(p =>
        p.id === id ? { ...p, is_active: !currentStatus } : p
      ))
    } catch (error) {
      console.error('Error toggling promo:', error)
      alert('Failed to toggle promo status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo?')) return

    try {
      const response = await fetch(`/api/promos/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete promo')
      }

      setPromos(prev => prev.filter(p => p.id !== id))
    } catch (error: any) {
      console.error('Error deleting promo:', error)
      alert(error.message || 'Failed to delete promo')
    }
  }

  const handleDuplicate = async (promo: Promo) => {
    try {
      // Create duplicate with modified code
      const duplicateData = {
        ...promo,
        name: `${promo.name} (Copy)`,
        code: promo.code ? `${promo.code}_COPY` : null,
        current_uses: 0,
        is_active: false
      }

      delete (duplicateData as any).id
      delete (duplicateData as any).created_at

      const response = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData)
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate promo')
      }

      // Reload promos
      loadPromos()
    } catch (error) {
      console.error('Error duplicating promo:', error)
      alert('Failed to duplicate promo')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getPromoTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      percentage: 'Percentage',
      fixed_amount: 'Fixed Amount',
      buy_get: 'Buy X Get Y',
      bundle: 'Bundle'
    }
    return labels[type] || type
  }

  const getPromoTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      percentage: 'bg-blue-100 text-blue-800',
      fixed_amount: 'bg-green-100 text-green-800',
      buy_get: 'bg-purple-100 text-purple-800',
      bundle: 'bg-orange-100 text-orange-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const filteredPromos = promos.filter(promo => {
    const matchesSearch = !searchQuery ||
      promo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = !filterType || promo.promo_type === filterType
    const matchesStatus = !filterStatus ||
      (filterStatus === 'active' && promo.is_active) ||
      (filterStatus === 'inactive' && !promo.is_active)

    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions & Discounts</h1>
          <p className="text-gray-600">Manage promotional campaigns and discount codes</p>
        </div>
        <Link
          href="/promos/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Promo
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Tag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Promos</p>
              <p className="text-2xl font-bold text-gray-900">{promos.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <ToggleRight className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {promos.filter(p => p.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Uses</p>
              <p className="text-2xl font-bold text-gray-900">
                {promos.reduce((sum, p) => sum + p.current_uses, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600">
                {promos.filter(p => {
                  if (!p.valid_until) return false
                  const daysUntil = Math.ceil((new Date(p.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  return daysUntil <= 7 && daysUntil >= 0
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search promos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed Amount</option>
            <option value="buy_get">Buy X Get Y</option>
            <option value="bundle">Bundle</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Promos List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))
        ) : filteredPromos.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Promos Found</h3>
            <p className="text-gray-600 mb-6">Create your first promotional campaign</p>
            <Link
              href="/promos/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="h-5 w-5" />
              Create Promo
            </Link>
          </div>
        ) : (
          filteredPromos.map((promo) => (
            <div key={promo.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{promo.name}</h3>
                    <button
                      onClick={() => handleToggleActive(promo.id, promo.is_active)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {promo.is_active ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{promo.description}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPromoTypeColor(promo.promo_type)}`}>
                      {getPromoTypeLabel(promo.promo_type)}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-mono">
                      {promo.code}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-semibold text-gray-900">
                        {promo.promo_type === 'percentage'
                          ? `${promo.discount_value}%`
                          : formatCurrency(promo.discount_value)}
                      </span>
                    </div>
                    {promo.min_purchase_amount && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Min. Purchase:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(promo.min_purchase_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Usage:</span>
                      <span className="font-semibold text-gray-900">
                        {promo.current_uses}{promo.max_uses_total ? ` / ${promo.max_uses_total}` : ''}
                      </span>
                    </div>
                    {promo.valid_until && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Valid Until:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(promo.valid_until).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <Link
                  href={`/promos/${promo.id}`}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Link>
                <Link
                  href={`/promos/${promo.id}/edit`}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  onClick={() => handleDuplicate(promo)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
