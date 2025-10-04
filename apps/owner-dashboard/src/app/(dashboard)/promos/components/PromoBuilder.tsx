'use client'

import { useState } from 'react'
import { Save, X, AlertCircle } from 'lucide-react'

interface PromoBuilderProps {
  initialData?: any
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
}

export default function PromoBuilder({ initialData, onSubmit, onCancel, isEdit = false }: PromoBuilderProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || '',
    description: initialData?.description || '',
    promo_type: initialData?.promo_type || 'percentage',
    discount_value: initialData?.discount_value || 0,
    max_discount_amount: initialData?.max_discount_amount || '',
    min_purchase_amount: initialData?.min_purchase_amount || '',
    valid_from: initialData?.valid_from?.split('T')[0] || '',
    valid_until: initialData?.valid_until?.split('T')[0] || '',
    max_uses_total: initialData?.max_uses_total || '',
    max_uses_per_customer: initialData?.max_uses_per_customer || '',
    is_active: initialData?.is_active ?? true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.promo_type || !formData.discount_value) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const submitData = {
        ...formData,
        discount_value: parseFloat(formData.discount_value.toString()),
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount.toString()) : null,
        min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount.toString()) : null,
        max_uses_total: formData.max_uses_total ? parseInt(formData.max_uses_total.toString()) : null,
        max_uses_per_customer: formData.max_uses_per_customer ? parseInt(formData.max_uses_per_customer.toString()) : null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
      }

      await onSubmit(submitData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Promo Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Grand Opening Sale"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Promo Code
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g., OPENING20"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">Optional - Leave empty for auto-generated code</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Describe this promotion..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Discount Configuration */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Discount Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Promo Type <span className="text-red-500">*</span>
            </label>
            <select
              name="promo_type"
              value={formData.promo_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="percentage">Percentage Discount</option>
              <option value="fixed_amount">Fixed Amount Discount</option>
              <option value="buy_get">Buy X Get Y</option>
              <option value="bundle">Bundle Price</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Value <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="discount_value"
                value={formData.discount_value}
                onChange={handleChange}
                required
                min="0"
                step={formData.promo_type === 'percentage' ? '1' : '1000'}
                placeholder={formData.promo_type === 'percentage' ? '20' : '10000'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                {formData.promo_type === 'percentage' ? '%' : 'Rp'}
              </span>
            </div>
            {formData.promo_type === 'percentage' && formData.discount_value > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                {formData.discount_value}% discount
              </p>
            )}
            {formData.promo_type === 'fixed_amount' && formData.discount_value > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                {formatCurrency(parseFloat(formData.discount_value.toString()))} off
              </p>
            )}
          </div>
        </div>

        {formData.promo_type === 'percentage' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Discount Amount
            </label>
            <input
              type="number"
              name="max_discount_amount"
              value={formData.max_discount_amount}
              onChange={handleChange}
              min="0"
              step="1000"
              placeholder="e.g., 50000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional - Cap the maximum discount amount
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Purchase Amount
          </label>
          <input
            type="number"
            name="min_purchase_amount"
            value={formData.min_purchase_amount}
            onChange={handleChange}
            min="0"
            step="1000"
            placeholder="e.g., 50000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional - Minimum order amount to use this promo
          </p>
        </div>
      </div>

      {/* Validity Period */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Validity Period</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid From
            </label>
            <input
              type="date"
              name="valid_from"
              value={formData.valid_from}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid Until
            </label>
            <input
              type="date"
              name="valid_until"
              value={formData.valid_until}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Usage Limits */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Limits</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Total Uses
            </label>
            <input
              type="number"
              name="max_uses_total"
              value={formData.max_uses_total}
              onChange={handleChange}
              min="0"
              placeholder="e.g., 100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional - Limit total number of uses
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Uses Per Customer
            </label>
            <input
              type="number"
              name="max_uses_per_customer"
              value={formData.max_uses_per_customer}
              onChange={handleChange}
              min="0"
              placeholder="e.g., 1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional - Limit uses per customer
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <label className="text-sm font-medium text-gray-900">
              Active
            </label>
            <p className="text-xs text-gray-500">
              Enable this promo to make it available for customers
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      {formData.name && formData.discount_value > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Preview</h3>
              <div className="text-sm text-blue-800">
                <p className="font-semibold text-lg mb-1">{formData.name}</p>
                <p className="mb-2">{formData.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="px-2 py-1 bg-blue-100 rounded font-mono">
                    {formData.code || 'NO-CODE'}
                  </span>
                  <span className="font-semibold">
                    {formData.promo_type === 'percentage'
                      ? `${formData.discount_value}% OFF`
                      : `${formatCurrency(parseFloat(formData.discount_value.toString()))} OFF`}
                  </span>
                  {formData.min_purchase_amount && (
                    <span>
                      Min: {formatCurrency(parseFloat(formData.min_purchase_amount.toString()))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Promo' : 'Create Promo'}
        </button>
      </div>
    </form>
  )
}
