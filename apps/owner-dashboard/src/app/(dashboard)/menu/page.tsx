'use client'

import { useEffect, useState } from 'react'
import {
  Search,
  Filter,
  Plus,
  Eye,
  EyeOff,
  Grid,
  List
} from '@/components/ui/icons'
import { useMenuStore } from '@/stores/menuStore'
import { MenuItem } from '@/services/menuService'
import MenuCard from './components/MenuCard'
import StatCard from '@/components/dashboard/StatCard'

export default function MenuPage() {
  const {
    items,
    categories,
    stats,
    selectedItems,
    isLoading,
    error,
    fetchMenuItems,
    fetchCategories,
    fetchStats,
    setFilters,
    clearFilters,
    toggleItemSelection,
    selectAllItems,
    clearSelection,
    bulkUpdateAvailability,
    deleteItem
  } = useMenuStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState<boolean | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showDeleteModal, setShowDeleteModal] = useState<MenuItem | null>(null)

  // Initial data fetch
  useEffect(() => {
    fetchMenuItems()
    fetchCategories()
    fetchStats()
  }, [fetchMenuItems, fetchCategories, fetchStats])

  // Apply filters when they change
  useEffect(() => {
    const filterObj: any = {}

    if (searchTerm) filterObj.search = searchTerm
    if (selectedCategory) filterObj.category_id = selectedCategory
    if (availabilityFilter !== undefined) filterObj.is_available = availabilityFilter

    setFilters(filterObj)
  }, [searchTerm, selectedCategory, availabilityFilter, setFilters])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleCategoryFilter = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? '' : categoryId)
  }

  const handleAvailabilityFilter = (availability: boolean | undefined) => {
    setAvailabilityFilter(availability === availabilityFilter ? undefined : availability)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setAvailabilityFilter(undefined)
    clearFilters()
  }

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      clearSelection()
    } else {
      selectAllItems()
    }
  }

  const handleBulkAvailability = async (isAvailable: boolean) => {
    if (selectedItems.length > 0) {
      await bulkUpdateAvailability(selectedItems, isAvailable)
    }
  }

  const handleEdit = (item: MenuItem) => {
    console.log('Edit item:', item)
    window.location.href = `/menu/${item.id}/edit`
  }

  const handleDelete = (item: MenuItem) => {
    setShowDeleteModal(item)
  }

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteItem(showDeleteModal.id)
        setShowDeleteModal(null)
      } catch (error) {
        console.error('Failed to delete item:', error)
      }
    }
  }

  const filteredItemsCount = items.length
  const selectedCount = selectedItems.length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600">
            Manage your menu items, availability, and categories
          </p>
        </div>
        <a href="/menu/add" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Menu Item</span>
        </a>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Items"
            value={stats.totalItems}
            icon={Grid}
            changeType="neutral"
          />
          <StatCard
            title="Available Items"
            value={stats.availableItems}
            change={`${Math.round((stats.availableItems / stats.totalItems) * 100)}%`}
            icon={Eye}
            changeType="positive"
          />
          <StatCard
            title="Unavailable Items"
            value={stats.unavailableItems}
            change={stats.unavailableItems > 0 ? 'Need attention' : 'All good'}
            icon={EyeOff}
            changeType={stats.unavailableItems > 0 ? 'negative' : 'positive'}
          />
          <StatCard
            title="Categories"
            value={stats.categories}
            icon={Filter}
            changeType="neutral"
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex-shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleAvailabilityFilter(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                availabilityFilter === true
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => handleAvailabilityFilter(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                availabilityFilter === false
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unavailable
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${
                viewMode === 'grid'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${
                viewMode === 'list'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedCategory || availabilityFilter !== undefined) && (
            <button
              onClick={handleClearFilters}
              className="btn-ghost text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Selection and Bulk Actions */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-900 font-medium">
              {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAvailability(true)}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
              >
                Mark Available
              </button>
              <button
                onClick={() => handleBulkAvailability(false)}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Mark Unavailable
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">
            {filteredItemsCount} item{filteredItemsCount !== 1 ? 's' : ''} found
          </span>
          {items.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      {/* Menu Items Grid/List */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className={`
          ${viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }
        `}>
          {items.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              isSelected={selectedItems.includes(item.id)}
              onSelect={toggleItemSelection}
              onEdit={handleEdit}
              onDelete={handleDelete}
              className={viewMode === 'list' ? 'flex' : ''}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Grid className="h-12 w-12 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedCategory || availabilityFilter !== undefined
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by adding your first menu item.'
            }
          </p>
          <button className="btn-primary">
            Add Menu Item
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Menu Item
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{showDeleteModal.name}"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
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
