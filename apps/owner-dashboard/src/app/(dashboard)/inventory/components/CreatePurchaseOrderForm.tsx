'use client'

import { useState, useEffect } from 'react'
import { X, Save, Plus, Trash2, AlertCircle } from 'lucide-react'
import { useInventoryStore } from '@/stores/inventoryStore'

interface CreatePurchaseOrderFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface POItem {
  ingredient_id: string
  ingredient_name: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
}

export default function CreatePurchaseOrderForm({ onClose, onSuccess }: CreatePurchaseOrderFormProps) {
  const { suppliers, ingredients, fetchSuppliers, fetchIngredients } = useInventoryStore()

  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery: '',
    notes: ''
  })

  const [items, setItems] = useState<POItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchSuppliers()
    fetchIngredients()
  }, [])

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id)

  const addItem = () => {
    setItems([
      ...items,
      {
        ingredient_id: '',
        ingredient_name: '',
        quantity: 0,
        unit: '',
        unit_price: 0,
        total_price: 0
      }
    ])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-populate ingredient details when ingredient is selected
    if (field === 'ingredient_id') {
      const ingredient = ingredients.find(i => i.id === value)
      if (ingredient) {
        newItems[index].ingredient_name = ingredient.name
        newItems[index].unit = ingredient.unit
        newItems[index].unit_price = ingredient.unit_cost
      }
    }

    // Calculate total price
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price
    }

    setItems(newItems)
  }

  const calculateTotals = () => {
    const totalItems = items.length
    const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0)
    return { totalItems, totalAmount }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.supplier_id) {
      newErrors.supplier_id = 'Please select a supplier'
    }

    if (!formData.order_date) {
      newErrors.order_date = 'Order date is required'
    }

    if (!formData.expected_delivery) {
      newErrors.expected_delivery = 'Expected delivery date is required'
    } else if (new Date(formData.expected_delivery) < new Date(formData.order_date)) {
      newErrors.expected_delivery = 'Expected delivery must be after order date'
    }

    if (items.length === 0) {
      newErrors.items = 'Please add at least one item'
    }

    items.forEach((item, index) => {
      if (!item.ingredient_id) {
        newErrors[`item_${index}_ingredient`] = 'Please select an ingredient'
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0'
      }
      if (item.unit_price < 0) {
        newErrors[`item_${index}_price`] = 'Unit price cannot be negative'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const { totalItems, totalAmount } = calculateTotals()

      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supplier_id: formData.supplier_id,
          order_date: formData.order_date,
          expected_delivery: formData.expected_delivery,
          status: 'draft',
          total_items: totalItems,
          total_amount: totalAmount,
          notes: formData.notes,
          items: items.map(item => ({
            ingredient_id: item.ingredient_id,
            quantity_ordered: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          }))
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create purchase order')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error creating purchase order:', error)
      setErrors({ submit: error.message || 'Failed to create purchase order. Please try again.' })
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

  const { totalItems, totalAmount } = calculateTotals()

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Purchase Order</h2>
            <p className="text-sm text-gray-600">Order ingredients from supplier</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Order Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier *
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.supplier_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select supplier</option>
                  {suppliers.filter(s => s.is_active).map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.company_name} {supplier.is_preferred && '⭐'}
                    </option>
                  ))}
                </select>
                {errors.supplier_id && (
                  <p className="text-red-600 text-sm mt-1">{errors.supplier_id}</p>
                )}
                {selectedSupplier && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Contact: {selectedSupplier.phone_primary}</p>
                    {selectedSupplier.payment_terms && (
                      <p>Payment Terms: {selectedSupplier.payment_terms}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Date *
                </label>
                <input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.order_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.order_date && (
                  <p className="text-red-600 text-sm mt-1">{errors.order_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery *
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery}
                  onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.expected_delivery ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.expected_delivery && (
                  <p className="text-red-600 text-sm mt-1">{errors.expected_delivery}</p>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Order Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add Item</span>
              </button>
            </div>

            {errors.items && (
              <p className="text-red-600 text-sm mb-2">{errors.items}</p>
            )}

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Ingredient *
                      </label>
                      <select
                        value={item.ingredient_id}
                        onChange={(e) => updateItem(index, 'ingredient_id', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_ingredient`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select ingredient</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                      {errors[`item_${index}_ingredient`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`item_${index}_ingredient`]}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                          errors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`item_${index}_quantity`]}</p>
                      )}
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={item.unit}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                          errors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                      {errors[`item_${index}_price`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`item_${index}_price`]}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total
                      </label>
                      <div className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 font-medium">
                        {formatCurrency(item.total_price)}
                      </div>
                    </div>

                    <div className="col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No items added yet. Click "Add Item" to start.</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              placeholder="Additional notes or special instructions..."
            />
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Order Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-medium text-gray-900">{totalItems}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-blue-300 pt-2 mt-2">
                <span className="text-gray-900">Total Amount:</span>
                <span className="text-blue-600">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Purchase Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
