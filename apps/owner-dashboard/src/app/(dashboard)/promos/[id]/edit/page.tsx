'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import PromoBuilder from '../../components/PromoBuilder'

export default function EditPromoPage() {
  const params = useParams()
  const router = useRouter()
  const [promo, setPromo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPromo()
  }, [params.id])

  const loadPromo = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/promos/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch promo')
      }

      const { data } = await response.json()
      setPromo(data)
    } catch (error) {
      console.error('Error loading promo:', error)
      alert('Failed to load promo')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/promos/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update promo')
      }

      router.push(`/promos/${params.id}`)
    } catch (error: any) {
      console.error('Error updating promo:', error)
      alert(error.message || 'Failed to update promo')
      throw error
    }
  }

  const handleCancel = () => {
    router.push(`/promos/${params.id}`)
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!promo) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p className="text-gray-600">Promo not found</p>
        <Link href="/promos" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Promos
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/promos/${params.id}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Promo</h1>
          <p className="text-gray-600">Update promotional campaign details</p>
        </div>
      </div>

      {/* Form */}
      <PromoBuilder
        initialData={promo}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEdit={true}
      />
    </div>
  )
}
