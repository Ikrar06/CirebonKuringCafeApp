// Storage utility functions for customer app

const STORAGE_KEYS = {
  CUSTOMER_INFO: 'customer-info',
  TABLE_SESSION: 'table-session',
  CART_DATA: 'cart-data',
  MENU_CACHE: 'menu-cache',
  CATEGORIES_CACHE: 'categories-cache',
  API_CACHE_PREFIX: 'api-cache-',
  API_OFFLINE_QUEUE: 'api-offline-queue',
  PAYMENT_DATA: 'payment-data',
  CURRENT_ORDER: 'current-order-id'
} as const

class StorageManager {
  private isLocalStorageAvailable(): boolean {
    if (typeof window === 'undefined') return false

    try {
      const testKey = '__test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  // Customer Info Storage
  saveCustomerInfo(info: {
    name: string
    phone: string
    email?: string
  }): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const infoWithTimestamp = {
        ...info,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_INFO, JSON.stringify(infoWithTimestamp))
    } catch (error) {
      console.error('Failed to save customer info:', error)
    }
  }

  // Save customer info for specific table with timestamp
  saveCustomerInfoForTable(tableId: string, info: {
    name: string
    phone: string
    email?: string
  }): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const customerInfoKey = `customer-info-${tableId}`
      const infoWithTimestamp = {
        ...info,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(customerInfoKey, JSON.stringify(infoWithTimestamp))
    } catch (error) {
      console.error('Failed to save customer info for table:', error)
    }
  }

  getCustomerInfo(): { name: string; phone: string; email?: string } | null {
    if (!this.isLocalStorageAvailable()) return null

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMER_INFO)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Failed to get customer info:', error)
      return null
    }
  }

  // Table Session Storage
  saveTableSession(tableId: string, sessionData: {
    startTime: string
    lastActivity: string
    tableNumber: string
  }): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const key = `${STORAGE_KEYS.TABLE_SESSION}-${tableId}`
      localStorage.setItem(key, JSON.stringify(sessionData))
    } catch (error) {
      console.error('Failed to save table session:', error)
    }
  }

  getTableSession(tableId: string): {
    startTime: string
    lastActivity: string
    tableNumber: string
  } | null {
    if (!this.isLocalStorageAvailable()) return null

    try {
      const key = `${STORAGE_KEYS.TABLE_SESSION}-${tableId}`
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Failed to get table session:', error)
      return null
    }
  }

  // Cart Data Storage
  saveCartData(tableId: string, cartData: any[]): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const key = `${STORAGE_KEYS.CART_DATA}-${tableId}`
      localStorage.setItem(key, JSON.stringify({
        items: cartData,
        savedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to save cart data:', error)
    }
  }

  getCartData(tableId: string): any[] {
    if (!this.isLocalStorageAvailable()) return []

    try {
      const key = `${STORAGE_KEYS.CART_DATA}-${tableId}`
      const stored = localStorage.getItem(key)

      if (!stored) return []

      const parsedData = JSON.parse(stored)
      const savedAt = new Date(parsedData.savedAt)
      const now = new Date()

      // Cart data expires after 24 hours
      const hoursElapsed = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60)
      if (hoursElapsed > 24) {
        this.clearCartData(tableId)
        return []
      }

      return parsedData.items || []
    } catch (error) {
      console.error('Failed to get cart data:', error)
      return []
    }
  }

  clearCartData(tableId: string): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const key = `${STORAGE_KEYS.CART_DATA}-${tableId}`
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to clear cart data:', error)
    }
  }

  // Menu Cache Storage
  saveMenuCache(tableId: string, menuData: any[]): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const key = `${STORAGE_KEYS.MENU_CACHE}-${tableId}`
      localStorage.setItem(key, JSON.stringify({
        menu: menuData,
        cachedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to save menu cache:', error)
    }
  }

  getMenuCache(tableId: string): any[] | null {
    if (!this.isLocalStorageAvailable()) return null

    try {
      const key = `${STORAGE_KEYS.MENU_CACHE}-${tableId}`
      const stored = localStorage.getItem(key)

      if (!stored) return null

      const parsedData = JSON.parse(stored)
      const cachedAt = new Date(parsedData.cachedAt)
      const now = new Date()

      // Menu cache expires after 1 hour
      const minutesElapsed = (now.getTime() - cachedAt.getTime()) / (1000 * 60)
      if (minutesElapsed > 60) {
        localStorage.removeItem(key)
        return null
      }

      return parsedData.menu || null
    } catch (error) {
      console.error('Failed to get menu cache:', error)
      return null
    }
  }

  // Categories Cache Storage
  saveCategoriesCache(categories: any[]): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES_CACHE, JSON.stringify({
        categories,
        cachedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to save categories cache:', error)
    }
  }

  getCategoriesCache(): any[] | null {
    if (!this.isLocalStorageAvailable()) return null

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES_CACHE)

      if (!stored) return null

      const parsedData = JSON.parse(stored)
      const cachedAt = new Date(parsedData.cachedAt)
      const now = new Date()

      // Categories cache expires after 1 hour
      const minutesElapsed = (now.getTime() - cachedAt.getTime()) / (1000 * 60)
      if (minutesElapsed > 60) {
        localStorage.removeItem(STORAGE_KEYS.CATEGORIES_CACHE)
        return null
      }

      return parsedData.categories || null
    } catch (error) {
      console.error('Failed to get categories cache:', error)
      return null
    }
  }

  // Current Order Storage
  saveCurrentOrder(orderId: string): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_ORDER, orderId)
    } catch (error) {
      console.error('Failed to save current order:', error)
    }
  }

  getCurrentOrder(): string | null {
    if (!this.isLocalStorageAvailable()) return null

    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_ORDER)
    } catch (error) {
      console.error('Failed to get current order:', error)
      return null
    }
  }

  clearCurrentOrder(): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_ORDER)
    } catch (error) {
      console.error('Failed to clear current order:', error)
    }
  }

  // Clear customer info
  clearCustomerInfo(): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      localStorage.removeItem(STORAGE_KEYS.CUSTOMER_INFO)
    } catch (error) {
      console.error('Failed to clear customer info:', error)
    }
  }

  // Clear customer info for specific table
  clearCustomerInfoForTable(tableId: string): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const customerInfoKey = `customer-info-${tableId}`
      localStorage.removeItem(customerInfoKey)
    } catch (error) {
      console.error('Failed to clear customer info for table:', error)
    }
  }

  // Generic API Cache
  setApiCache(key: string, data: any, ttlMinutes: number = 30): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const cacheKey = `${STORAGE_KEYS.API_CACHE_PREFIX}${key}`
      const cacheData = {
        data,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Failed to set API cache:', error)
    }
  }

  getApiCache(key: string): any | null {
    if (!this.isLocalStorageAvailable()) return null

    try {
      const cacheKey = `${STORAGE_KEYS.API_CACHE_PREFIX}${key}`
      const stored = localStorage.getItem(cacheKey)

      if (!stored) return null

      const parsedData = JSON.parse(stored)
      const expiresAt = new Date(parsedData.expiresAt)
      const now = new Date()

      if (now > expiresAt) {
        localStorage.removeItem(cacheKey)
        return null
      }

      return parsedData.data
    } catch (error) {
      console.error('Failed to get API cache:', error)
      return null
    }
  }

  // Clear all cache
  clearAllCache(): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('cache') || key.startsWith(STORAGE_KEYS.API_CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Failed to clear all cache:', error)
    }
  }

  // Clear expired items
  clearExpiredItems(): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEYS.API_CACHE_PREFIX)) {
          const stored = localStorage.getItem(key)
          if (stored) {
            try {
              const parsedData = JSON.parse(stored)
              if (parsedData.expiresAt) {
                const expiresAt = new Date(parsedData.expiresAt)
                if (new Date() > expiresAt) {
                  localStorage.removeItem(key)
                }
              }
            } catch {
              // Invalid data, remove it
              localStorage.removeItem(key)
            }
          }
        }
      })
    } catch (error) {
      console.error('Failed to clear expired items:', error)
    }
  }

  // Clear old customer data (older than 2 hours)
  clearOldCustomerData(): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const keys = Object.keys(localStorage)
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago

      keys.forEach(key => {
        // Clear table-specific customer info that might be old
        if (key.startsWith('customer-info-')) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const parsed = JSON.parse(stored)

              // Check if it has timestamp
              if (parsed.savedAt) {
                const savedTime = new Date(parsed.savedAt).getTime()
                if (savedTime < twoHoursAgo) {
                  localStorage.removeItem(key)
                  console.log('Removed old customer info:', key)
                }
              } else {
                // No timestamp, assume it's old and remove it
                localStorage.removeItem(key)
                console.log('Removed customer info without timestamp:', key)
              }
            }
          } catch (error) {
            // If we can't parse it, remove it
            localStorage.removeItem(key)
            console.log('Removed invalid customer info:', key)
          }
        }
      })
    } catch (error) {
      console.error('Failed to clear old customer data:', error)
    }
  }

  // Complete cleanup after successful payment
  clearSessionData(tableId: string): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      // Clear customer info for this table
      this.clearCustomerInfoForTable(tableId)

      // Clear current order
      this.clearCurrentOrder()

      // Clear cart data for this table
      this.clearCartData(tableId)

      // Clear any payment data
      localStorage.removeItem('payment-data')
      localStorage.removeItem('applied-promo')

      console.log('Session data cleared for table:', tableId)
    } catch (error) {
      console.error('Failed to clear session data:', error)
    }
  }

  // Get storage usage
  getStorageUsage(): { used: number; available: number; percentage: number } {
    if (!this.isLocalStorageAvailable()) {
      return { used: 0, available: 0, percentage: 0 }
    }

    try {
      let used = 0
      const keys = Object.keys(localStorage)

      keys.forEach(key => {
        const item = localStorage.getItem(key)
        if (item) {
          used += item.length + key.length
        }
      })

      // LocalStorage typically has 5-10MB limit, we'll assume 5MB
      const available = 5 * 1024 * 1024 // 5MB in bytes
      const percentage = (used / available) * 100

      return { used, available, percentage }
    } catch (error) {
      console.error('Failed to get storage usage:', error)
      return { used: 0, available: 0, percentage: 0 }
    }
  }
}

// Export singleton instance
export const storage = new StorageManager()
export default storage