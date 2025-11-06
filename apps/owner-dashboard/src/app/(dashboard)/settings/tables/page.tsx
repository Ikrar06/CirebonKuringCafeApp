'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Armchair,
  MapPin,
  Users,
  QrCode,
  Loader2
} from 'lucide-react'

interface Table {
  id: string
  table_number: string
  qr_code_id: string
  capacity: string
  zone: string
  floor: string
  position_x?: number | null
  position_y?: number | null
  status: string
  is_active: boolean
  notes?: string
}

export default function TablesManagementPage() {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [formData, setFormData] = useState({
    table_number: '',
    capacity: '',
    zone: 'indoor',
    floor: '1',
    notes: ''
  })

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/tables')
      const { data } = await response.json()
      setTables(data || [])
    } catch (error) {
      console.error('Error fetching tables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchTables()
        setShowAddModal(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error adding table:', error)
      alert('Gagal menambah meja')
    }
  }

  const handleUpdate = async () => {
    if (!editingTable) return

    try {
      const response = await fetch(`/api/tables/${editingTable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchTables()
        setEditingTable(null)
        resetForm()
      }
    } catch (error) {
      console.error('Error updating table:', error)
      alert('Gagal update meja')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus meja ini?')) return

    try {
      const response = await fetch(`/api/tables/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTables()
      }
    } catch (error) {
      console.error('Error deleting table:', error)
      alert('Gagal menghapus meja')
    }
  }

  const openEditModal = (table: Table) => {
    setEditingTable(table)
    setFormData({
      table_number: table.table_number,
      capacity: table.capacity,
      zone: table.zone,
      floor: table.floor,
      notes: table.notes || ''
    })
  }

  const resetForm = () => {
    setFormData({
      table_number: '',
      capacity: '',
      zone: 'indoor',
      floor: '1',
      notes: ''
    })
  }

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'indoor':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'outdoor':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'vip':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500'
      case 'occupied':
        return 'bg-red-500'
      case 'reserved':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Armchair className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Manajemen Meja</h1>
                  <p className="text-sm text-gray-600">Kelola meja, kapasitas, dan zone</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center space-x-2 shadow-sm"
            >
              <Plus className="h-5 w-5" />
              <span>Tambah Meja</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-600 mb-1">Total Meja</p>
            <p className="text-3xl font-bold text-gray-900">{tables.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-600 mb-1">Indoor</p>
            <p className="text-3xl font-bold text-blue-600">
              {tables.filter(t => t.zone === 'indoor').length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-600 mb-1">Outdoor</p>
            <p className="text-3xl font-bold text-green-600">
              {tables.filter(t => t.zone === 'outdoor').length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-600 mb-1">VIP</p>
            <p className="text-3xl font-bold text-purple-600">
              {tables.filter(t => t.zone === 'vip').length}
            </p>
          </div>
        </div>

        {/* Tables Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading tables...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Armchair className="h-7 w-7 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Meja {table.table_number}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(table.status)}`}></div>
                        <span className="text-xs text-gray-600 capitalize">{table.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(table)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(table.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Kapasitas</span>
                    </div>
                    <span className="font-semibold text-gray-900">{table.capacity} orang</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Zone</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getZoneColor(table.zone)}`}>
                      {table.zone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <QrCode className="h-4 w-4" />
                      <span className="text-sm">QR Code</span>
                    </div>
                    <span className="font-mono text-sm text-gray-900">{table.qr_code_id}</span>
                  </div>

                  {table.notes && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">{table.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingTable) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTable ? 'Edit Meja' : 'Tambah Meja Baru'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingTable(null)
                    resetForm()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Meja *
                </label>
                <input
                  type="text"
                  value={formData.table_number}
                  onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-600"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kapasitas *
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-600"
                  placeholder="4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone *
                </label>
                <select
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lantai *
                </label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-600"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-600"
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingTable(null)
                  resetForm()
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Batal
              </button>
              <button
                onClick={editingTable ? handleUpdate : handleAdd}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{editingTable ? 'Update' : 'Simpan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
