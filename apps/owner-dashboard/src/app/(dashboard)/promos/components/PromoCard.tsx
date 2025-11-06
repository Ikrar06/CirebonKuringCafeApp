'use client'

import { Eye, Edit, Trash2, Copy, ToggleLeft, ToggleRight, Tag, Calendar, Users } from 'lucide-react'
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

interface PromoCardProps {
  promo: Promo
  onToggleActive?: (id: string, currentStatus: boolean) => void
  onDelete?: (id: string) => void
  onDuplicate?: (promo: Promo) => void
}

export default function PromoCard({ promo, onToggleActive, onDelete, onDuplicate }: PromoCardProps) {
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

  const getDaysUntilExpiry = () => {
    if (!promo.valid_until) return null
    const daysUntil = Math.ceil((new Date(promo.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntil
  }

  const daysUntilExpiry = getDaysUntilExpiry()
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{promo.name}</h3>
            {onToggleActive && (
              <button
                onClick={() => onToggleActive(promo.id, promo.is_active)}
                className="p-1 hover:bg-gray-100 rounded"
                title={promo.is_active ? 'Active' : 'Inactive'}
              >
                {promo.is_active ? (
                  <ToggleRight className="h-5 w-5 text-green-600" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-gray-500" />
                )}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-3">{promo.description}</p>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPromoTypeColor(promo.promo_type)}`}>
              {getPromoTypeLabel(promo.promo_type)}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-mono">
              {promo.code}
            </span>
            {isExpiringSoon && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                Expiring Soon
              </span>
            )}
            {isExpired && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                Expired
              </span>
            )}
          </div>

          {/* Details */}
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

      {/* Actions */}
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
        {onDuplicate && (
          <button
            onClick={() => onDuplicate(promo)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(promo.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
