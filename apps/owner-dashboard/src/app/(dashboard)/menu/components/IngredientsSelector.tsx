'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, X, Calculator } from '@/components/ui/icons'
import { IngredientCost } from '@/services/pricingService'
import { Ingredient, ingredientService } from '@/services/ingredientService'

interface IngredientsSelectorProps {
  selectedIngredients: IngredientCost[]
  onIngredientsChange: (ingredients: IngredientCost[]) => void
  className?: string
}

export default function IngredientsSelector({
  selectedIngredients,
  onIngredientsChange,
  className = ''
}: IngredientsSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch ingredients from database
  useEffect(() => {
    fetchIngredients()
  }, [])

  const fetchIngredients = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const ingredients = await ingredientService.getIngredients({
        is_active: true,
        search: searchTerm || undefined
      })
      setAvailableIngredients(ingredients)
    } catch (error) {
      console.error('Failed to fetch ingredients:', error)
      setError('Failed to load ingredients')
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIngredients()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const filteredIngredients = availableIngredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedIngredients.some(selected => selected.id === ingredient.id)
  )

  const addIngredient = (ingredient: Ingredient) => {
    const costPerUnit = ingredient.unit_cost || ingredient.last_purchase_price || ingredient.average_cost || 0
    const newIngredient: IngredientCost = {
      id: ingredient.id,
      name: ingredient.name,
      quantity: 1,
      unit: ingredient.unit,
      cost_per_unit: costPerUnit,
      total_cost: costPerUnit
    }

    onIngredientsChange([...selectedIngredients, newIngredient])
  }

  const removeIngredient = (ingredientId: string) => {
    onIngredientsChange(selectedIngredients.filter(ing => ing.id !== ingredientId))
  }

  const updateIngredientQuantity = (ingredientId: string, quantity: number) => {
    // Don't remove ingredient on zero/empty input, just update the value
    // User must explicitly click the X button to remove
    const updatedIngredients = selectedIngredients.map(ingredient => {
      if (ingredient.id === ingredientId) {
        const newQuantity = quantity || 0
        return {
          ...ingredient,
          quantity: newQuantity,
          total_cost: newQuantity * ingredient.cost_per_unit
        }
      }
      return ingredient
    })

    onIngredientsChange(updatedIngredients)
  }

  const formatCurrency = ingredientService.formatCurrency

  const totalCost = selectedIngredients.reduce((sum, ingredient) => sum + ingredient.total_cost, 0)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Ingredients</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calculator className="h-4 w-4" />
          <span>Total Cost: {formatCurrency(totalCost)}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search ingredients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Selected Ingredients */}
      {selectedIngredients.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Selected Ingredients</h4>
          <div className="space-y-2">
            {selectedIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{ingredient.name}</span>
                    <button
                      onClick={() => removeIngredient(ingredient.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Quantity:</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredientQuantity(ingredient.id, parseFloat(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-600">{ingredient.unit}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(ingredient.cost_per_unit)} / {ingredient.unit}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      = {formatCurrency(ingredient.total_cost)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Ingredients */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Available Ingredients</h4>
        {filteredIngredients.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{ingredient.name}</div>
                  <div className="text-sm text-gray-600">
                    {formatCurrency(ingredient.unit_cost || ingredient.last_purchase_price || ingredient.average_cost || 0)} / {ingredient.unit}
                  </div>
                  <div className="text-xs text-gray-500">{ingredient.category || 'Uncategorized'}</div>
                </div>
                <button
                  onClick={() => addIngredient(ingredient)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {error ? (
              <div className="text-red-600">
                <p>{error}</p>
                <button
                  onClick={fetchIngredients}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Try Again
                </button>
              </div>
            ) : searchTerm ? (
              <>No ingredients found for "{searchTerm}"</>
            ) : (
              <>All available ingredients have been selected</>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedIngredients.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {selectedIngredients.length} ingredient{selectedIngredients.length > 1 ? 's' : ''} selected
            </span>
            <span className="font-semibold text-gray-900">
              Total: {formatCurrency(totalCost)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
