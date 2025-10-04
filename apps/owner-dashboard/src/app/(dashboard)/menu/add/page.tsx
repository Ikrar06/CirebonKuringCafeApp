'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Eye } from '@/components/ui/icons'
import MenuForm from '../components/MenuForm'
import { CreateMenuItemData } from '@/services/menuService'
import { useMenuStore } from '@/stores/menuStore'

export default function AddMenuPage() {
  const router = useRouter()
  const { createItem, isLoading } = useMenuStore()
  const [isPreview, setIsPreview] = useState(false)

  const handleSubmit = async (data: CreateMenuItemData) => {
    try {
      await createItem(data)
      router.push('/menu')
    } catch (error) {
      console.error('Failed to create menu item:', error)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Save className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Tambah Menu Baru</h1>
                  <p className="text-sm text-gray-600">Buat item menu dengan tracking ingredient dan AI pricing</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsPreview(!isPreview)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2 shadow-sm transition-all"
            >
              <Eye className="h-4 w-4" />
              <span>{isPreview ? 'Edit' : 'Preview'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <MenuForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          isPreview={isPreview}
        />
      </div>
    </div>
  )
}
