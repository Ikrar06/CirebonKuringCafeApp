'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import PromoBuilder from '../components/PromoBuilder'

export default function CreatePromoPage() {
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/promos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create promo')
      }

      router.push('/promos')
    } catch (error: any) {
      console.error('Error creating promo:', error)
      alert(error.message || 'Failed to create promo')
      throw error
    }
  }

  const handleCancel = () => {
    router.push('/promos')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/promos"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Promo</h1>
          <p className="text-gray-600">Set up a new promotional campaign</p>
        </div>
      </div>

      {/* Form */}
      <PromoBuilder onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  )
}
