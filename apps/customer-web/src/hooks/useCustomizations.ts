import { useState, useEffect, useCallback } from 'react'
import apiClient from '@/lib/api/client'
import type { MenuCustomization } from '@/types/menu'

interface CustomizationOption {
  id: string
  name: string
  price_modifier: number
}

interface CustomizationGroup {
  id: string
  name: string
  type: 'single' | 'multiple'
  required: boolean
  options: CustomizationOption[]
}

// Global cache for customizations
const customizationCache = new Map<string, CustomizationGroup[]>()
const optionNameCache = new Map<string, string>()

export function useCustomizations(menuItemId?: string) {
  const [customizations, setCustomizations] = useState<CustomizationGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomizations = useCallback(async (itemId: string) => {
    if (customizationCache.has(itemId)) {
      setCustomizations(customizationCache.get(itemId)!)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.getMenuCustomizations(itemId)

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch customizations')
      }

      const groups = response.data || []

      // Cache the groups
      customizationCache.set(itemId, groups)

      // Cache individual option names for quick lookup
      groups.forEach(group => {
        group.options.forEach(option => {
          optionNameCache.set(option.id, option.name)
        })
      })

      setCustomizations(groups)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching customizations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (menuItemId) {
      fetchCustomizations(menuItemId)
    }
  }, [menuItemId, fetchCustomizations])

  return {
    customizations,
    loading,
    error,
    refetch: menuItemId ? () => fetchCustomizations(menuItemId) : undefined
  }
}

// Utility function to get option name by ID
export function getOptionName(optionId: string): string {
  return optionNameCache.get(optionId) || optionId
}

// Utility function to format customizations for display
export function formatCustomizationsReadable(customizations: Record<string, string[]>): string | null {
  if (!customizations || Object.keys(customizations).length === 0) {
    return null
  }


  const customizationTexts = Object.entries(customizations)
    .filter(([_, optionIds]) => optionIds.length > 0)
    .map(([groupId, optionIds]) => {
      // Try to get readable names for each option
      const optionNames = optionIds.map(optionId => {
        const optionName = getOptionName(optionId)
        return optionName
      })
      return optionNames.join(', ')
    })
    .filter(text => text.length > 0)

  return customizationTexts.length > 0 ? customizationTexts.join(' • ') : null
}

// Function to preload customizations for multiple items
export async function preloadCustomizations(menuItemIds: string[]) {
  const promises = menuItemIds
    .filter(id => !customizationCache.has(id))
    .map(async (itemId) => {
      try {
        const response = await apiClient.getMenuCustomizations(itemId)
        if (response.data) {
          customizationCache.set(itemId, response.data)

          // Cache option names
          response.data.forEach(group => {
            group.options.forEach(option => {
              optionNameCache.set(option.id, option.name)
            })
          })
        }
      } catch (error) {
        console.error(`Failed to preload customizations for item ${itemId}:`, error)
      }
    })

  await Promise.allSettled(promises)
}

// Function to clear cache (useful for testing or when data changes)
export function clearCustomizationCache() {
  customizationCache.clear()
  optionNameCache.clear()
}