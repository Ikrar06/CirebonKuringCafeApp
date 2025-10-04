'use client'

import { useRouter } from 'next/navigation'
import AddIngredientForm from '../../components/AddIngredientForm'

export default function AddIngredientPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <AddIngredientForm
        onClose={() => router.push('/inventory/ingredients')}
        onSuccess={() => router.push('/inventory/ingredients')}
      />
    </div>
  )
}