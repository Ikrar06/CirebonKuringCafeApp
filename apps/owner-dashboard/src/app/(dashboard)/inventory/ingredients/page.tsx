'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  Plus,
  Package,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react'
import { useInventoryStore } from '@/stores/inventoryStore'
import { inventoryService } from '@/services/inventoryService'
import AddIngredientForm from '../components/AddIngredientForm'
import EditIngredientForm from '../components/EditIngredientForm'

export default function IngredientsPage() {
  const searchParams = useSearchParams()
  const statusFilter = searchParams?.get('status')

  const {
    ingredients,
    isLoading,
    fetchIngredients,
    setFilters
  } = useInventoryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [stockStatusFilter, setStockStatusFilter] = useState<string>(statusFilter || '')
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null)
  const [deletingIngredient, setDeletingIngredient] = useState<string | null>(null)

  useEffect(() => {
    const newFilters: any = {}

    if (searchQuery) {
      newFilters.search = searchQuery
    }

    if (categoryFilter) {
      newFilters.category = categoryFilter
    }

    if (stockStatusFilter) {
      newFilters.stock_status = stockStatusFilter as 'critical' | 'low' | 'optimal' | 'high'
    }

    setFilters(newFilters)
    fetchIngredients(newFilters)
  }, [searchQuery, categoryFilter, stockStatusFilter, fetchIngredients, setFilters])

  // Get unique categories
  const categories = Array.from(new Set(ingredients.map(i => i.category).filter(Boolean)))

  // Sort ingredients
  const sortedIngredients = [...ingredients].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'stock':
        comparison = (a.current_stock || 0) - (b.current_stock || 0)
        break
      case 'value':
        comparison = (a.current_stock * a.unit_cost) - (b.current_stock * b.unit_cost)
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: 'name' | 'stock' | 'value') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const formatCurrency = (amount: number) => {
    return inventoryService.formatCurrency(amount)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingredients Management</h1>
          <p className="text-gray-600">Manage your ingredient inventory and stock levels</p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Ingredient</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="critical">Critical</option>
              <option value="low">Low Stock</option>
              <option value="optimal">Optimal</option>
              <option value="high">Overstock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Ingredients</p>
              <p className="text-2xl font-bold text-gray-900">{ingredients.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {ingredients.filter(i => i.stock_status === 'critical').length}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">
                {ingredients.filter(i => i.stock_status === 'low').length}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(
                  ingredients.reduce((sum, i) => sum + (i.current_stock * i.unit_cost), 0)
                )}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Ingredient</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('stock')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Current Stock</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min / Reorder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Stock Value</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
              ) : sortedIngredients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No ingredients found
                  </td>
                </tr>
              ) : (
                sortedIngredients.map((ingredient) => (
                  <tr key={ingredient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {ingredient.name}
                        </div>
                        {ingredient.code && (
                          <div className="text-xs text-gray-500">{ingredient.code}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {ingredient.category || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {ingredient.current_stock.toFixed(1)}
                        </span>
                        <span className="text-gray-500 ml-1">{ingredient.unit}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ingredient.min_stock_level} / {ingredient.reorder_point || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(ingredient.unit_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(ingredient.current_stock * ingredient.unit_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                          inventoryService.getStockStatusColor(ingredient.stock_status || 'optimal')
                        }`}
                      >
                        {inventoryService.getStockStatusLabel(ingredient.stock_status || 'optimal')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingIngredient(ingredient.id)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title="Edit ingredient"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingIngredient(ingredient.id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                          title="Delete ingredient"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Ingredient Form Modal */}
      {isAddFormOpen && (
        <AddIngredientForm
          onClose={() => setIsAddFormOpen(false)}
          onSuccess={() => {
            setIsAddFormOpen(false)
            fetchIngredients()
          }}
        />
      )}

      {/* Edit Ingredient Modal */}
      {editingIngredient && (
        <EditIngredientForm
          ingredientId={editingIngredient}
          onClose={() => setEditingIngredient(null)}
          onSuccess={() => {
            setEditingIngredient(null)
            fetchIngredients()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingIngredient && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-red-900 mb-4">Delete Ingredient</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this ingredient? This action cannot be undone.</p>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDeletingIngredient(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch(`/api/ingredients/${deletingIngredient}`, { method: 'DELETE' })
                    setDeletingIngredient(null)
                    fetchIngredients()
                  } catch (error) {
                    console.error('Error deleting ingredient:', error)
                    alert('Failed to delete ingredient')
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}