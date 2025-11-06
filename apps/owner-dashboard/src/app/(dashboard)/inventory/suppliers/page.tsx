'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  Trash2,
  TrendingUp,
  Package,
  RefreshCw
} from 'lucide-react'
import { useInventoryStore } from '@/stores/inventoryStore'
import AddSupplierForm from '../components/AddSupplierForm'
import EditSupplierForm from '../components/EditSupplierForm'

export default function SuppliersPage() {
  const {
    suppliers,
    isLoading,
    fetchSuppliers
  } = useInventoryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPreferred, setFilterPreferred] = useState<string>('')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<string | null>(null)

  useEffect(() => {
    loadSuppliers()
  }, [filterStatus, filterPreferred])

  const loadSuppliers = () => {
    const filters: any = {}

    if (filterStatus === 'active') {
      filters.is_active = true
    } else if (filterStatus === 'inactive') {
      filters.is_active = false
    }

    if (filterPreferred === 'preferred') {
      filters.is_preferred = true
    }

    if (searchQuery) {
      filters.search = searchQuery
    }

    fetchSuppliers(filters)
  }

  // Filter suppliers by search query
  const filteredSuppliers = suppliers.filter(supplier => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      supplier.company_name.toLowerCase().includes(query) ||
      supplier.contact_person?.toLowerCase().includes(query) ||
      supplier.email?.toLowerCase().includes(query)
    )
  })

  // Calculate stats
  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.is_active).length,
    preferred: suppliers.filter(s => s.is_preferred).length,
    avgRating: suppliers.length > 0
      ? suppliers.reduce((sum, s) => sum + ((s.delivery_rating || 0) + (s.quality_rating || 0) + (s.price_rating || 0)) / 3, 0) / suppliers.length
      : 0
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-gray-600">Manage your ingredient suppliers and contacts</p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Package className="h-6 w-6 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-600 mt-1">Suppliers</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-gray-600 mt-1">Working with</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Star className="h-6 w-6 text-yellow-600" />
            <span className="text-xs text-gray-500 uppercase">Preferred</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.preferred}</p>
          <p className="text-xs text-gray-600 mt-1">Top suppliers</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Star className="h-6 w-6 text-blue-600 fill-current" />
            <span className="text-xs text-gray-500 uppercase">Avg Rating</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</p>
          <p className="text-xs text-gray-600 mt-1">Out of 5.0</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value) {
                    loadSuppliers()
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
            >
              <option value="">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Preferred Filter */}
          <div>
            <select
              value={filterPreferred}
              onChange={(e) => setFilterPreferred(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Suppliers</option>
              <option value="preferred">Preferred Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suppliers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-500 animate-spin" />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p>No suppliers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => {
            const avgRating = ((supplier.delivery_rating || 0) + (supplier.quality_rating || 0) + (supplier.price_rating || 0)) / 3

            return (
              <div
                key={supplier.id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {supplier.company_name}
                      </h3>
                      {supplier.is_preferred && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    {supplier.business_type && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {supplier.business_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setEditingSupplier(supplier.id)}
                      className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Edit supplier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingSupplier(supplier.id)}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete supplier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {supplier.contact_person && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className="font-medium">Contact:</span>
                      <span>{supplier.contact_person}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${supplier.phone_primary}`} className="hover:text-blue-600">
                      {supplier.phone_primary}
                    </a>
                  </div>
                  {supplier.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${supplier.email}`} className="hover:text-blue-600 truncate">
                        {supplier.email}
                      </a>
                    </div>
                  )}
                  {supplier.city && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{supplier.city}</span>
                    </div>
                  )}
                </div>

                {/* Ratings */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Ratings</span>
                    <div className="flex items-center space-x-1">
                      <Star className={`h-4 w-4 ${getRatingColor(avgRating)} fill-current`} />
                      <span className={`text-sm font-semibold ${getRatingColor(avgRating)}`}>
                        {avgRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span className="font-medium">{supplier.delivery_rating || 0}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality:</span>
                      <span className="font-medium">{supplier.quality_rating || 0}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-medium">{supplier.price_rating || 0}/5</span>
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                {supplier.payment_terms && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <span className="text-xs font-medium text-gray-700">Payment: </span>
                    <span className="text-xs text-gray-600">{supplier.payment_terms}</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="mt-4">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      supplier.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {supplier.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Supplier Form Modal */}
      {isAddFormOpen && (
        <AddSupplierForm
          onClose={() => setIsAddFormOpen(false)}
          onSuccess={() => {
            setIsAddFormOpen(false)
            fetchSuppliers()
          }}
        />
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <EditSupplierForm
          supplierId={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSuccess={() => {
            setEditingSupplier(null)
            fetchSuppliers()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingSupplier && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-red-900 mb-4">Delete Supplier</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this supplier? This action cannot be undone.</p>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDeletingSupplier(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch(`/api/suppliers/${deletingSupplier}`, { method: 'DELETE' })
                    setDeletingSupplier(null)
                    fetchSuppliers()
                  } catch (error) {
                    console.error('Error deleting supplier:', error)
                    alert('Failed to delete supplier')
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