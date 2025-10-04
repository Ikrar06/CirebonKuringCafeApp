'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, BarChart3, Tag, Calendar, Users, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'

export default function PromoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [promo, setPromo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPromo()
  }, [params.id])

  const loadPromo = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/promos/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch promo')
      }

      const { data } = await response.json()
      setPromo(data)
    } catch (error) {
      console.error('Error loading promo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      const response = await fetch(`/api/promos/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !promo.is_active })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle promo status')
      }

      loadPromo()
    } catch (error) {
      console.error('Error toggling promo:', error)
      alert('Failed to toggle promo status')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this promo?')) return

    try {
      const response = await fetch(`/api/promos/${params.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete promo')
      }

      router.push('/promos')
    } catch (error: any) {
      console.error('Error deleting promo:', error)
      alert(error.message || 'Failed to delete promo')
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
      percentage: 'Percentage Discount',
      fixed_amount: 'Fixed Amount Discount',
      buy_get: 'Buy X Get Y',
      bundle: 'Bundle Price'
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!promo) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p className="text-gray-600">Promo not found</p>
        <Link href="/promos" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Promos
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/promos"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{promo.name}</h1>
            <p className="text-gray-600">Promo Details</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
          >
            {promo.is_active ? (
              <>
                <ToggleRight className="h-4 w-4 text-green-600" />
                Active
              </>
            ) : (
              <>
                <ToggleLeft className="h-4 w-4 text-gray-400" />
                Inactive
              </>
            )}
          </button>
          <Link
            href={`/promos/${params.id}/analytics`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
          <Link
            href={`/promos/${params.id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Promo Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Tag className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-blue-900 mb-2">{promo.name}</h2>
            {promo.description && (
              <p className="text-blue-800 mb-3">{promo.description}</p>
            )}
            <div className="flex items-center gap-3">
              {promo.code && (
                <span className="px-3 py-1 bg-blue-100 rounded-lg text-blue-900 font-mono font-bold text-lg">
                  {promo.code}
                </span>
              )}
              <span className="text-3xl font-bold text-blue-900">
                {promo.promo_type === 'percentage'
                  ? `${promo.discount_value}% OFF`
                  : `${formatCurrency(promo.discount_value)} OFF`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Total Uses</p>
              <p className="text-2xl font-bold text-gray-900">{promo.current_uses || 0}</p>
              {promo.max_uses_total && (
                <p className="text-xs text-gray-500">of {promo.max_uses_total} max</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Valid Until</p>
              <p className="text-lg font-bold text-gray-900">
                {promo.valid_until
                  ? new Date(promo.valid_until).toLocaleDateString('id-ID')
                  : 'No expiry'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`text-lg font-bold ${promo.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                {promo.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Promo Details</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Promo Type</p>
              <p className="font-semibold text-gray-900">{getPromoTypeLabel(promo.promo_type)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Discount Value</p>
              <p className="font-semibold text-gray-900">
                {promo.promo_type === 'percentage'
                  ? `${promo.discount_value}%`
                  : formatCurrency(promo.discount_value)}
              </p>
            </div>
          </div>

          {promo.max_discount_amount && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Max Discount Amount</p>
                <p className="font-semibold text-gray-900">{formatCurrency(promo.max_discount_amount)}</p>
              </div>
            </div>
          )}

          {promo.min_purchase_amount && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Minimum Purchase</p>
                <p className="font-semibold text-gray-900">{formatCurrency(promo.min_purchase_amount)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {promo.valid_from && (
              <div>
                <p className="text-sm text-gray-600">Valid From</p>
                <p className="font-semibold text-gray-900">
                  {new Date(promo.valid_from).toLocaleDateString('id-ID')}
                </p>
              </div>
            )}
            {promo.valid_until && (
              <div>
                <p className="text-sm text-gray-600">Valid Until</p>
                <p className="font-semibold text-gray-900">
                  {new Date(promo.valid_until).toLocaleDateString('id-ID')}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {promo.max_uses_total && (
              <div>
                <p className="text-sm text-gray-600">Maximum Total Uses</p>
                <p className="font-semibold text-gray-900">{promo.max_uses_total}</p>
              </div>
            )}
            {promo.max_uses_per_customer && (
              <div>
                <p className="text-sm text-gray-600">Max Uses Per Customer</p>
                <p className="font-semibold text-gray-900">{promo.max_uses_per_customer}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
