'use client'

import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { useInventoryStore } from '@/stores/inventoryStore'
import { ingredientService } from '@/services/ingredientService'
import { Ingredient } from '@/services/ingredientService'

interface StockMovementFormProps {
  onClose: () => void
  onSuccess: () => void
}

export default function StockMovementForm({ onClose, onSuccess }: StockMovementFormProps) {
  const { createStockMovement, suppliers, fetchSuppliers } = useInventoryStore()

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [formData, setFormData] = useState({
    ingredient_id: '',
    movement_type: 'purchase' as 'purchase' | 'usage' | 'waste' | 'adjustment' | 'initial' | 'return',
    quantity: 0,
    unit: '',
    unit_cost: 0,
    supplier_id: '',
    batch_number: '',
    expiry_date: '',
    reason: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Load ingredients and suppliers
    loadIngredients()
    fetchSuppliers()
  }, [fetchSuppliers])

  const loadIngredients = async () => {
    try {
      const data = await ingredientService.getIngredients({ is_active: true })
      setIngredients(data)
    } catch (error) {
      console.error('Error loading ingredients:', error)
    }
  }

  const handleIngredientChange = (ingredientId: string) => {
    const ingredient = ingredients.find(i => i.id === ingredientId)
    if (ingredient) {
      setFormData({
        ...formData,
        ingredient_id: ingredientId,
        unit: ingredient.unit
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.ingredient_id) {
      newErrors.ingredient_id = 'Please select an ingredient'
    }

    if (formData.quantity === 0) {
      newErrors.quantity = 'Quantity must not be zero'
    }

    if (formData.movement_type === 'purchase' && !formData.supplier_id) {
      newErrors.supplier_id = 'Supplier is required for purchases'
    }

    if (formData.movement_type === 'purchase' && formData.unit_cost <= 0) {
      newErrors.unit_cost = 'Unit cost must be greater than zero'
    }

    if (formData.movement_type === 'waste' && !formData.reason) {
      newErrors.reason = 'Reason is required for waste'
    }

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
      // Adjust quantity sign based on movement type
      let adjustedQuantity = formData.quantity
      if (['usage', 'waste'].includes(formData.movement_type)) {
        adjustedQuantity = -Math.abs(formData.quantity) // Make it negative
      } else {
        adjustedQuantity = Math.abs(formData.quantity) // Make it positive
      }

      await createStockMovement({
        ingredient_id: formData.ingredient_id,
        movement_type: formData.movement_type,
        quantity: adjustedQuantity,
        unit: formData.unit,
        unit_cost: formData.unit_cost || undefined,
        supplier_id: formData.supplier_id || undefined,
        batch_number: formData.batch_number || undefined,
        expiry_date: formData.expiry_date || undefined,
        reason: formData.reason || undefined,
        notes: formData.notes || undefined
      })

      onSuccess()
    } catch (error) {
      console.error('Error creating stock movement:', error)
      setErrors({ submit: 'Failed to record stock movement. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Record Stock Movement</h2>
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

          {/* Movement Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Movement Type *
            </label>
            <select
              value={formData.movement_type}
              onChange={(e) => setFormData({ ...formData, movement_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="purchase">Purchase (Stock In)</option>
              <option value="usage">Usage (Stock Out)</option>
              <option value="waste">Waste / Spoilage</option>
              <option value="adjustment">Stock Adjustment</option>
              <option value="return">Return to Supplier</option>
              <option value="initial">Initial Stock</option>
            </select>
          </div>

          {/* Ingredient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredient *
            </label>
            <select
              value={formData.ingredient_id}
              onChange={(e) => handleIngredientChange(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.ingredient_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select ingredient</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} ({ingredient.category})
                </option>
              ))}
            </select>
            {errors.ingredient_id && (
              <p className="text-red-600 text-sm mt-1">{errors.ingredient_id}</p>
            )}
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.quantity && (
                <p className="text-red-600 text-sm mt-1">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-600"
                placeholder="kg, liter, pieces"
                readOnly
              />
            </div>
          </div>

          {/* Supplier (for purchases) */}
          {['purchase', 'return'].includes(formData.movement_type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier {formData.movement_type === 'purchase' && '*'}
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
                    {supplier.company_name}
                  </option>
                ))}
              </select>
              {errors.supplier_id && (
                <p className="text-red-600 text-sm mt-1">{errors.supplier_id}</p>
              )}
            </div>
          )}

          {/* Unit Cost (for purchases) */}
          {formData.movement_type === 'purchase' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Cost (IDR) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_cost || ''}
                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.unit_cost ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.unit_cost && (
                <p className="text-red-600 text-sm mt-1">{errors.unit_cost}</p>
              )}
              {formData.quantity > 0 && formData.unit_cost > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Total Cost: {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                  }).format(formData.quantity * formData.unit_cost)}
                </p>
              )}
            </div>
          )}

          {/* Batch Info (for purchases) */}
          {formData.movement_type === 'purchase' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  placeholder="BATCH-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Reason (for waste/adjustment) */}
          {['waste', 'adjustment'].includes(formData.movement_type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason {formData.movement_type === 'waste' && '*'}
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.reason ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Spoiled, Expired, Inventory count correction"
              />
              {errors.reason && (
                <p className="text-red-600 text-sm mt-1">{errors.reason}</p>
              )}
            </div>
          )}

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
              placeholder="Additional information..."
            />
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
              <span>{isSubmitting ? 'Recording...' : 'Record Movement'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}