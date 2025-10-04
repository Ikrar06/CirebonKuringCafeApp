'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  TrendingUp,
  Package,
  DollarSign,
  FileText,
  AlertCircle
} from 'lucide-react'
import { supplierService, type Supplier } from '@/services/supplierService'

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supplierId = params?.id as string

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (supplierId) {
      loadSupplier()
    }
  }, [supplierId])

  const loadSupplier = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await supplierService.getSupplier(supplierId)
      setSupplier(data)
    } catch (error) {
      console.error('Error loading supplier:', error)
      setError('Failed to load supplier details')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Supplier</h3>
          <p className="text-red-700 mb-4">{error || 'Supplier not found'}</p>
          <button
            onClick={() => router.push('/inventory/suppliers')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Suppliers
          </button>
        </div>
      </div>
    )
  }

  const avgRating = ((supplier.delivery_rating || 0) + (supplier.quality_rating || 0) + (supplier.price_rating || 0)) / 3

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/inventory/suppliers')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{supplier.company_name}</h1>
              {supplier.is_preferred && (
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
              )}
            </div>
            <p className="text-gray-600">{supplier.business_type || 'Supplier'}</p>
          </div>
        </div>
        <button
          onClick={() => alert('Edit supplier feature coming soon!')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
        >
          <Edit className="h-4 w-4" />
          <span>Edit</span>
        </button>
      </div>

      {/* Status Badge */}
      <div>
        <span
          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            supplier.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {supplier.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Contact Person</label>
              <p className="text-gray-900 mt-1">{supplier.contact_person || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tax ID</label>
              <p className="text-gray-900 mt-1">{supplier.tax_id || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Primary Phone</span>
              </label>
              <a href={`tel:${supplier.phone_primary}`} className="text-blue-600 hover:text-blue-800 mt-1 block">
                {supplier.phone_primary}
              </a>
            </div>
            {supplier.phone_secondary && (
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>Secondary Phone</span>
                </label>
                <a href={`tel:${supplier.phone_secondary}`} className="text-blue-600 hover:text-blue-800 mt-1 block">
                  {supplier.phone_secondary}
                </a>
              </div>
            )}
            {supplier.email && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </label>
                <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:text-blue-800 mt-1 block">
                  {supplier.email}
                </a>
              </div>
            )}
            {supplier.address && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Address</span>
                </label>
                <p className="text-gray-900 mt-1">{supplier.address}</p>
                {supplier.city && (
                  <p className="text-gray-600 text-sm">{supplier.city}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ratings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Performance Ratings</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall</span>
                <div className="flex items-center space-x-1">
                  <Star className={`h-5 w-5 ${getRatingColor(avgRating)} fill-current`} />
                  <span className={`text-lg font-bold ${getRatingColor(avgRating)}`}>
                    {avgRating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${avgRating >= 4 ? 'bg-green-600' : avgRating >= 3 ? 'bg-yellow-600' : 'bg-red-600'}`}
                  style={{ width: `${(avgRating / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Delivery</span>
                <span className="text-sm font-semibold text-gray-900">
                  {supplier.delivery_rating || 0}/5
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Quality</span>
                <span className="text-sm font-semibold text-gray-900">
                  {supplier.quality_rating || 0}/5
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Price</span>
                <span className="text-sm font-semibold text-gray-900">
                  {supplier.price_rating || 0}/5
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Payment Terms</label>
            <p className="text-gray-900 mt-1 capitalize">{supplier.payment_terms?.replace('_', ' ') || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Payment Methods</label>
            <div className="mt-1">
              {supplier.payment_methods && supplier.payment_methods.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {supplier.payment_methods.map((method, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {method}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">-</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Bank Account</label>
            <p className="text-gray-900 mt-1">{supplier.bank_account || '-'}</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <Package className="h-8 w-8 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase">Total Orders</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-600 mt-1">Purchase Orders</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Total Spent</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(0)}</p>
          <p className="text-sm text-gray-600 mt-1">All time</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <span className="text-xs text-gray-500 uppercase">Last Order</span>
          </div>
          <p className="text-xl font-bold text-gray-900">-</p>
          <p className="text-sm text-gray-600 mt-1">No orders yet</p>
        </div>
      </div>

      {/* Notes */}
      {supplier.notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{supplier.notes}</p>
        </div>
      )}

      {/* Recent Orders - Placeholder */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h2>
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p>No orders from this supplier yet</p>
        </div>
      </div>
    </div>
  )
}