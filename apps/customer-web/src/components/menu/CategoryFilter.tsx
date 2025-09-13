'use client'

import { useState, useEffect } from 'react'
import { 
  Coffee, 
  ChefHat, 
  Utensils, 
  IceCream, 
  Sandwich, 
  Pizza,
  Soup,
  Cookie,
  Filter,
  X,
  Check,
  Clock,
  Leaf,
  Flame,
  DollarSign
} from 'lucide-react'

// Types
import type { MenuItem, MenuCategory } from '@/types/menu'

interface CategoryFilterProps {
  categories: MenuCategory[]
  selectedCategory: string
  onCategoryChange: (categoryId: string) => void
  menuItems: MenuItem[]
  className?: string
}

interface FilterOption {
  id: string
  label: string
  value: any
  icon?: React.ReactNode
  count?: number
}

export interface ActiveFilters {
  dietary: string[]
  priceRange: string[]
  prepTime: string[]
  spiceLevel: string[]
  availability: boolean
}

// Filter definitions
const DIETARY_FILTERS: FilterOption[] = [
  { id: 'halal', label: 'Halal', value: 'halal', icon: <Leaf className="h-4 w-4" /> },
  { id: 'vegetarian', label: 'Vegetarian', value: 'vegetarian', icon: <Leaf className="h-4 w-4" /> },
  { id: 'vegan', label: 'Vegan', value: 'vegan', icon: <Leaf className="h-4 w-4" /> },
]

const PRICE_RANGES: FilterOption[] = [
  { id: 'budget', label: 'Budget (< Rp 25k)', value: [0, 25000] },
  { id: 'mid', label: 'Sedang (Rp 25k - 50k)', value: [25000, 50000] },
  { id: 'premium', label: 'Premium (> Rp 50k)', value: [50000, Infinity] },
]

const PREP_TIME_FILTERS: FilterOption[] = [
  { id: 'quick', label: 'Cepat (< 10 mnt)', value: [0, 10], icon: <Clock className="h-4 w-4" /> },
  { id: 'medium', label: 'Sedang (10-20 mnt)', value: [10, 20], icon: <Clock className="h-4 w-4" /> },
  { id: 'slow', label: 'Lama (> 20 mnt)', value: [20, Infinity], icon: <Clock className="h-4 w-4" /> },
]

const SPICE_LEVELS: FilterOption[] = [
  { id: 'mild', label: 'Tidak Pedas', value: 0 },
  { id: 'low', label: 'Sedikit Pedas', value: 1, icon: <Flame className="h-4 w-4 text-yellow-500" /> },
  { id: 'medium', label: 'Pedas', value: 2, icon: <Flame className="h-4 w-4 text-orange-500" /> },
  { id: 'hot', label: 'Sangat Pedas', value: 3, icon: <Flame className="h-4 w-4 text-red-500" /> },
]

export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  menuItems,
  className = ''
}: CategoryFilterProps) {
  // State management
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    dietary: [],
    priceRange: [],
    prepTime: [],
    spiceLevel: [],
    availability: false
  })

  // Calculate item counts for each category
  const categoriesWithCounts = categories.map(category => ({
    ...category,
    item_count: menuItems.filter(item => 
      item.category_id === category.id && 
      item.is_available
    ).length
  }))

  // Get category icon
  const getCategoryIcon = (iconName: string) => {
    const iconClass = "h-5 w-5"
    
    switch (iconName.toLowerCase()) {
      case 'coffee': return <Coffee className={iconClass} />
      case 'chef-hat': 
      case 'chefhat': return <ChefHat className={iconClass} />
      case 'utensils': return <Utensils className={iconClass} />
      case 'ice-cream':
      case 'icecream': return <IceCream className={iconClass} />
      case 'sandwich': return <Sandwich className={iconClass} />
      case 'pizza': return <Pizza className={iconClass} />
      case 'soup': return <Soup className={iconClass} />
      case 'cookie': return <Cookie className={iconClass} />
      default: return <Utensils className={iconClass} />
    }
  }

  // Get category color
  const getCategoryColor = (category: MenuCategory & { color?: string }) => {
    if (category.color) return category.color
    
    // Default colors based on category type
    switch (category.icon.toLowerCase()) {
      case 'coffee': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'chef-hat':
      case 'chefhat': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'ice-cream':
      case 'icecream': return 'bg-pink-100 text-pink-700 border-pink-200'
      case 'pizza': return 'bg-red-100 text-red-700 border-red-200'
      case 'soup': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  // Handle filter change
  const handleFilterChange = (filterType: keyof ActiveFilters, value: any, checked: boolean) => {
    setActiveFilters(prev => {
      if (filterType === 'availability') {
        return { ...prev, availability: checked }
      }

      const currentValues = prev[filterType] as string[]
      
      if (checked) {
        return {
          ...prev,
          [filterType]: [...currentValues, value]
        }
      } else {
        return {
          ...prev,
          [filterType]: currentValues.filter(v => v !== value)
        }
      }
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({
      dietary: [],
      priceRange: [],
      prepTime: [],
      spiceLevel: [],
      availability: false
    })
  }

  // Count active filters
  const activeFilterCount = Object.values(activeFilters).reduce((count, filters) => {
    if (Array.isArray(filters)) {
      return count + filters.length
    }
    return count + (filters ? 1 : 0)
  }, 0)

  // Calculate filter counts
  const calculateFilterCounts = (filterType: keyof ActiveFilters) => {
    return DIETARY_FILTERS.map(filter => ({
      ...filter,
      count: menuItems.filter(item => {
        switch (filter.value) {
          case 'halal':
            return item.is_halal
          case 'vegetarian':
            return item.nutritional_info?.is_vegetarian
          case 'vegan':
            return item.nutritional_info?.is_vegan
          default:
            return false
        }
      }).length
    }))
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* Main Category Filter */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Kategori Menu</h3>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filter Lanjutan</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Category Buttons */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => onCategoryChange('all')}
            className={`
              flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <span>Semua Menu</span>
              <span className="text-xs opacity-75">
                ({menuItems.filter(item => item.is_available).length})
              </span>
            </div>
          </button>

          {categoriesWithCounts.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`
                flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
                ${selectedCategory === category.id
                  ? `${getCategoryColor(category)} shadow-lg scale-105`
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              {getCategoryIcon(category.icon)}
              <span>{category.name}</span>
              <span className="text-xs opacity-75">
                ({category.item_count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="px-4 py-4 space-y-4">
            {/* Header with clear all */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Filter Lanjutan</h4>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
                >
                  <X className="h-4 w-4" />
                  <span>Hapus Semua</span>
                </button>
              )}
            </div>

            {/* Availability Filter */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={activeFilters.availability}
                  onChange={(e) => handleFilterChange('availability', true, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Hanya yang tersedia</span>
              </label>
            </div>

            {/* Dietary Restrictions */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Pilihan Diet
              </h5>
              <div className="flex flex-wrap gap-2">
                {DIETARY_FILTERS.map((filter) => {
                  const isActive = activeFilters.dietary.includes(filter.id)
                  const count = menuItems.filter(item => {
                    switch (filter.value) {
                      case 'halal': return item.is_halal
                      case 'vegetarian': return item.nutritional_info?.is_vegetarian || false
                      case 'vegan': return item.nutritional_info?.is_vegan || false
                      default: return false
                    }
                  }).length

                  return (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterChange('dietary', filter.id, !isActive)}
                      className={`
                        flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                        ${isActive
                          ? 'bg-green-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200'
                        }
                      `}
                    >
                      {filter.icon}
                      <span>{filter.label}</span>
                      <span className="opacity-75">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Rentang Harga
              </h5>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map((range) => {
                  const isActive = activeFilters.priceRange.includes(range.id)
                  const [min, max] = range.value as [number, number]
                  const count = menuItems.filter(item => 
                    item.price >= min && (max === Infinity ? true : item.price < max)
                  ).length

                  return (
                    <button
                      key={range.id}
                      onClick={() => handleFilterChange('priceRange', range.id, !isActive)}
                      className={`
                        flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                        ${isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200'
                        }
                      `}
                    >
                      <DollarSign className="h-3 w-3" />
                      <span>{range.label}</span>
                      <span className="opacity-75">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preparation Time */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Waktu Persiapan
              </h5>
              <div className="flex flex-wrap gap-2">
                {PREP_TIME_FILTERS.map((timeFilter) => {
                  const isActive = activeFilters.prepTime.includes(timeFilter.id)
                  const [min, max] = timeFilter.value as [number, number]
                  const count = menuItems.filter(item => {
                    const prepTime = item.preparation_time || 0
                    return prepTime >= min && (max === Infinity ? true : prepTime <= max)
                  }).length

                  return (
                    <button
                      key={timeFilter.id}
                      onClick={() => handleFilterChange('prepTime', timeFilter.id, !isActive)}
                      className={`
                        flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                        ${isActive
                          ? 'bg-orange-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-200'
                        }
                      `}
                    >
                      {timeFilter.icon}
                      <span>{timeFilter.label}</span>
                      <span className="opacity-75">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Spice Level */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Level Kepedasan
              </h5>
              <div className="flex flex-wrap gap-2">
                {SPICE_LEVELS.map((spice) => {
                  const isActive = activeFilters.spiceLevel.includes(spice.id)
                  const count = menuItems.filter(item => 
                    (item.spice_level || 0) === spice.value
                  ).length

                  return (
                    <button
                      key={spice.id}
                      onClick={() => handleFilterChange('spiceLevel', spice.id, !isActive)}
                      className={`
                        flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                        ${isActive
                          ? 'bg-red-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200'
                        }
                      `}
                    >
                      {spice.icon || <Flame className="h-3 w-3" />}
                      <span>{spice.label}</span>
                      <span className="opacity-75">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {menuItems.filter(item => applyFilters(item, activeFilters)).length} menu ditemukan
                  </span>
                  <span className="text-blue-600 font-medium">
                    {activeFilterCount} filter aktif
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Filter Chips (when advanced panel is closed) */}
      {!showAdvancedFilters && activeFilterCount > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <span className="text-xs text-gray-500 flex-shrink-0">Filter aktif:</span>
            
            {/* Availability chip */}
            {activeFilters.availability && (
              <button
                onClick={() => handleFilterChange('availability', true, false)}
                className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs flex-shrink-0"
              >
                <Check className="h-3 w-3" />
                <span>Tersedia</span>
                <X className="h-3 w-3 hover:bg-blue-200 rounded-full" />
              </button>
            )}

            {/* Other filter chips */}
            {[...activeFilters.dietary, ...activeFilters.priceRange, ...activeFilters.prepTime, ...activeFilters.spiceLevel]
              .slice(0, 3) // Limit display
              .map((filterId) => (
                <button
                  key={filterId}
                  className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs flex-shrink-0"
                >
                  <span>{getFilterLabel(filterId)}</span>
                  <X className="h-3 w-3 hover:bg-gray-200 rounded-full" />
                </button>
              ))
            }

            {activeFilterCount > 4 && (
              <span className="text-xs text-gray-500 flex-shrink-0">
                +{activeFilterCount - 4} lagi
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to apply filters
export function applyFilters(item: MenuItem, filters: ActiveFilters): boolean {
  // Availability filter
  if (filters.availability && !item.is_available) {
    return false
  }

  // Dietary filters
  if (filters.dietary.length > 0) {
    const meetsDietary = filters.dietary.some(dietId => {
      switch (dietId) {
        case 'halal': return item.is_halal
        case 'vegetarian': return item.nutritional_info?.is_vegetarian || false
        case 'vegan': return item.nutritional_info?.is_vegan || false
        default: return false
      }
    })
    if (!meetsDietary) return false
  }

  // Price range filters
  if (filters.priceRange.length > 0) {
    const meetsPriceRange = filters.priceRange.some(rangeId => {
      const range = PRICE_RANGES.find(r => r.id === rangeId)
      if (!range) return false
      const [min, max] = range.value as [number, number]
      return item.price >= min && (max === Infinity ? true : item.price < max)
    })
    if (!meetsPriceRange) return false
  }

  // Prep time filters
  if (filters.prepTime.length > 0) {
    const meetsPrepTime = filters.prepTime.some(timeId => {
      const timeFilter = PREP_TIME_FILTERS.find(t => t.id === timeId)
      if (!timeFilter) return false
      const [min, max] = timeFilter.value as [number, number]
      const prepTime = item.preparation_time || 0
      return prepTime >= min && (max === Infinity ? true : prepTime <= max)
    })
    if (!meetsPrepTime) return false
  }

  // Spice level filters
  if (filters.spiceLevel.length > 0) {
    const meetsSpiceLevel = filters.spiceLevel.some(spiceId => {
      const spice = SPICE_LEVELS.find(s => s.id === spiceId)
      if (!spice) return false
      return (item.spice_level || 0) === spice.value
    })
    if (!meetsSpiceLevel) return false
  }

  return true
}

// Helper function to get filter label
function getFilterLabel(filterId: string): string {
  const allFilters = [...DIETARY_FILTERS, ...PRICE_RANGES, ...PREP_TIME_FILTERS, ...SPICE_LEVELS]
  const filter = allFilters.find(f => f.id === filterId)
  return filter?.label || filterId
}

