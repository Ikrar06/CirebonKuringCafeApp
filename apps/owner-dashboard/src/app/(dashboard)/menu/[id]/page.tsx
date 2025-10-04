'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function MenuDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)

  useEffect(() => {
    // Redirect to edit page
    router.replace(`/menu/${id}/edit`)
  }, [id, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to edit page...</p>
      </div>
    </div>
  )
}
