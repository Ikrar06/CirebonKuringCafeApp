'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Edit,
  Trash2,
  Clock,
  Eye,
  EyeOff,
  ChefHat
} from '@/components/ui/icons'
import { MenuItem } from '@/services/menuService'
import { useMenuStore } from '@/stores/menuStore'

interface MenuCardProps {
  item: MenuItem
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  className?: string
}

export default function MenuCard({
  item,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  className = ''
}: MenuCardProps) {
  const [isToggling, setIsToggling] = useState(false)
  const { toggleItemAvailability } = useMenuStore()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }

  const handleToggleAvailability = async () => {
    setIsToggling(true)
    try {
      await toggleItemAvailability(item.id, !item.is_available)
    } catch (error) {
      console.error('Failed to toggle availability:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const handleSelect = (e: React.MouseEvent) => {
    // Prevent selection when clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    onSelect(item.id)
  }

  return (
    <div
      onClick={handleSelect}
      className={`
        bg-white rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-lg relative cursor-pointer
        ${isSelected ? 'ring-4 ring-blue-500 border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
        ${!item.is_available ? 'opacity-75' : ''}
        ${className}
      `}
    >
      {/* Selection indicator badge */}
      {isSelected && (
        <div className="absolute top-3 left-3 z-20">
          <span className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg font-medium shadow-lg flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Selected</span>
          </span>
        </div>
      )}

      {/* Availability toggle */}
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggleAvailability()
          }}
          disabled={isToggling}
          className={`
            p-2 rounded-full transition-colors
            ${item.is_available
              ? 'bg-green-100 hover:bg-green-200 text-green-600'
              : 'bg-red-100 hover:bg-red-200 text-red-600'
            }
            ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={item.is_available ? 'Mark as unavailable' : 'Mark as available'}
        >
          {item.is_available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Item image */}
      <div className="relative h-48 bg-gray-100">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="h-16 w-16 text-gray-500" />
          </div>
        )}

        {/* Availability overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Unavailable
            </div>
          </div>
        )}
      </div>

      {/* Item details */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {item.name}
            </h3>
            <p className="text-sm text-blue-600 font-medium">
              {item.category_name}
            </p>
          </div>
          <div className="ml-2">
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(item.base_price)}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {item.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(item.estimated_prep_time || 15)}</span>
          </div>
          {/* Allergen info would be added when allergen feature is implemented */}
        </div>

        {/* Dietary information */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {item.is_vegan && (
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                Vegan
              </span>
            )}
            {item.is_vegetarian && !item.is_vegan && (
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                Vegetarian
              </span>
            )}
            {item.is_spicy && item.spicy_level && item.spicy_level > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                🌶️ Spicy ({item.spicy_level}/5)
              </span>
            )}
            {item.is_gluten_free && (
              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full">
                Gluten Free
              </span>
            )}
          </div>
        </div>

        {/* Nutritional info */}
        {item.calories && item.calories > 0 && (
          <div className="mb-4 p-2 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Calories:</span>
              <span className="font-medium">{item.calories}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(item)
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit item"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item)
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${item.is_available
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
            }
          `}>
            {item.is_available ? 'Available' : 'Unavailable'}
          </div>
        </div>
      </div>
    </div>
  )
}
