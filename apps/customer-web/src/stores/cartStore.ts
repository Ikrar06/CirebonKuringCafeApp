import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { toast } from 'sonner'

// Types
interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string
  customizations: Record<string, string[]>
  preparation_time: number
  table_id: string
  notes?: string
  added_at: string
}

interface PromoData {
  code: string
  name: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_amount: number
  minimum_order: number
  maximum_discount?: number
  valid_until: string
  terms_conditions?: string[]
}

interface CartStore {
  // State
  items: CartItem[]
  isCartOpen: boolean
  lastActivity: string
  tableId: string | null
  appliedPromo: PromoData | null

  // Computed values (deprecated - use selectors instead)
  totalItems: number
  totalAmount: number
  totalWeight: number // for delivery calculations
  estimatedPrepTime: number

  // Actions
  addItem: (item: Omit<CartItem, 'added_at'>) => void
  updateQuantity: (itemId: string, customizations: Record<string, string[]>, quantity: number) => void
  removeItem: (itemId: string, customizations: Record<string, string[]>) => void
  clearCart: () => void
  setIsCartOpen: (isOpen: boolean) => void
  setTableId: (tableId: string) => void

  // Promo actions
  applyPromo: (promo: PromoData) => void
  removePromo: () => void

  // Utilities
  getItemQuantity: (itemId: string, customizations: Record<string, string[]>) => number
  findCartItem: (itemId: string, customizations: Record<string, string[]>) => CartItem | undefined
  getCartSummary: () => CartSummary
  validateCart: () => CartValidation

  // Session management
  updateActivity: () => void
  isSessionValid: () => boolean
  getSessionAge: () => number

  // Real-time sync
  syncFromStorage: (tableId: string) => void
}

interface CartSummary {
  subtotal: number
  tax: number
  service_fee: number
  discount?: number
  total: number
  item_count: number
  estimated_time: number
}

interface CartValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Constants
const TAX_RATE = 0.11 // 11% PPN
const SERVICE_FEE_RATE = 0.05 // 5% service fee
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const MAX_ITEMS_PER_PRODUCT = 10
const MAX_TOTAL_ITEMS = 50

// Helper function to create unique item key
const createItemKey = (itemId: string, customizations: Record<string, string[]>): string => {
  const customizationKey = Object.entries(customizations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => `${key}:${values.sort().join(',')}`)
    .join('|')
  
  return `${itemId}#${customizationKey}`
}

// Helper function to check if customizations match
const customizationsMatch = (
  a: Record<string, string[]>, 
  b: Record<string, string[]>
): boolean => {
  const keysA = Object.keys(a).sort()
  const keysB = Object.keys(b).sort()
  
  if (keysA.length !== keysB.length) return false
  if (!keysA.every((key, index) => key === keysB[index])) return false
  
  return keysA.every(key => {
    const valuesA = a[key].sort()
    const valuesB = b[key].sort()
    
    if (valuesA.length !== valuesB.length) return false
    return valuesA.every((value, index) => value === valuesB[index])
  })
}

// Create a function to generate table-specific storage key
const getStorageKey = (tableId?: string) => {
  return tableId ? `cart-storage-table-${tableId}` : 'cart-storage-global'
}

// Custom storage that's table-aware
const createTableAwareStorage = () => {
  return {
    getItem: (name: string) => {
      // Check if we're in the browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null
      }

      // First try to get current table from URL
      const tableId = window.location.pathname.match(/\/(\d+)/)?.[1]

      const key = tableId ? getStorageKey(tableId) : name

      try {
        const item = localStorage.getItem(key)
        return item
      } catch (error) {
        console.error('Error getting item from localStorage:', error)
        return null
      }
    },
    setItem: (name: string, value: string) => {
      // Check if we're in the browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return
      }

      // First try to get current table from URL or from the stored state
      const tableId = window.location.pathname.match(/\/(\d+)/)?.[1]

      const key = tableId ? getStorageKey(tableId) : name

      try {
        localStorage.setItem(key, value)
      } catch (error) {
        console.error('Error setting item in localStorage:', error)
      }
    },
    removeItem: (name: string) => {
      // Check if we're in the browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return
      }

      // First try to get current table from URL
      const tableId = window.location.pathname.match(/\/(\d+)/)?.[1]

      const key = tableId ? getStorageKey(tableId) : name

      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error('Error removing item from localStorage:', error)
      }
    }
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      isCartOpen: false,
      lastActivity: new Date().toISOString(),
      tableId: null,
      appliedPromo: null,
      
      // Computed values (deprecated - computed dynamically via selectors)
      totalItems: 0,
      totalAmount: 0,
      totalWeight: 0,
      estimatedPrepTime: 0,
      
      // Actions
      addItem: (item) => {
        const state = get()
        
        // Validate session
        if (!state.isSessionValid()) {
          toast.error('Sesi berakhir. Silakan scan QR code meja lagi.')
          return
        }
        
        // Check if cart is for the same table
        if (state.tableId && item.table_id !== state.tableId) {
          toast.error('Tidak bisa menambah item dari meja berbeda')
          return
        }
        
        // Check maximum items limit
        const currentTotal = state.items.reduce((total, item) => total + item.quantity, 0)
        if (currentTotal >= MAX_TOTAL_ITEMS) {
          toast.error(`Maksimal ${MAX_TOTAL_ITEMS} item per pesanan`)
          return
        }
        
        // Find existing item with same customizations
        const existingItem = state.findCartItem(item.id, item.customizations)
        
        if (existingItem) {
          // Update quantity of existing item
          const newQuantity = existingItem.quantity + item.quantity
          
          if (newQuantity > MAX_ITEMS_PER_PRODUCT) {
            toast.error(`Maksimal ${MAX_ITEMS_PER_PRODUCT} item per menu`)
            return
          }
          
          state.updateQuantity(item.id, item.customizations, newQuantity)
        } else {
          // Add new item
          const newItem: CartItem = {
            ...item,
            added_at: new Date().toISOString()
          }
          
          set({
            items: [...state.items, newItem],
            tableId: item.table_id,
            lastActivity: new Date().toISOString()
          })
        }
        
        state.updateActivity()
      },
      
      updateQuantity: (itemId, customizations, quantity) => {
        const state = get()
        
        if (quantity < 0) {
          toast.error('Jumlah tidak valid')
          return
        }
        
        if (quantity > MAX_ITEMS_PER_PRODUCT) {
          toast.error(`Maksimal ${MAX_ITEMS_PER_PRODUCT} item per menu`)
          return
        }
        
        set({
          items: quantity === 0 
            ? state.items.filter(item => 
                !(item.id === itemId && customizationsMatch(item.customizations, customizations))
              )
            : state.items.map(item => 
                item.id === itemId && customizationsMatch(item.customizations, customizations)
                  ? { ...item, quantity }
                  : item
              ),
          lastActivity: new Date().toISOString()
        })
        
        state.updateActivity()
      },
      
      removeItem: (itemId, customizations) => {
        const state = get()
        
        set({
          items: state.items.filter(item => 
            !(item.id === itemId && customizationsMatch(item.customizations, customizations))
          ),
          lastActivity: new Date().toISOString()
        })
        
        state.updateActivity()
      },
      
      clearCart: () => {
        set({
          items: [],
          isCartOpen: false,
          lastActivity: new Date().toISOString()
        })

        // Removed notification - no need to notify user when cart is cleared after payment
      },
      
      setIsCartOpen: (isOpen) => {
        set({ isCartOpen: isOpen })
        if (isOpen) {
          get().updateActivity()
        }
      },
      
      setTableId: (tableId) => {
        const state = get()

        // If changing table, clear current cart and load cart for new table
        if (state.tableId && state.tableId !== tableId) {

          // Clear current state first
          set({
            items: [],
            isCartOpen: false,
            tableId,
            lastActivity: new Date().toISOString(),
            appliedPromo: null
          })

          // Try to load existing cart for the new table
          try {
            const existingCartKey = `cart-storage-table-${tableId}`
            const existingCart = localStorage.getItem(existingCartKey)
            if (existingCart) {
              const parsed = JSON.parse(existingCart)
              if (parsed.state && parsed.state.items) {
                set({
                  items: parsed.state.items,
                  appliedPromo: parsed.state.appliedPromo || null,
                  lastActivity: new Date().toISOString()
                })
              }
            }
          } catch (error) {
            console.error('Error loading existing cart:', error)
          }
        } else {
          set({
            tableId,
            lastActivity: new Date().toISOString()
          })
        }
      },

      // Promo actions
      applyPromo: (promo) => {
        set({
          appliedPromo: promo,
          lastActivity: new Date().toISOString()
        })

        // Save to localStorage as well
        try {
          localStorage.setItem('applied-promo', JSON.stringify(promo))
        } catch (error) {
          console.error('Error saving promo to localStorage:', error)
        }
      },

      removePromo: () => {
        set({
          appliedPromo: null,
          lastActivity: new Date().toISOString()
        })

        // Remove from localStorage
        try {
          localStorage.removeItem('applied-promo')
        } catch (error) {
          console.error('Error removing promo from localStorage:', error)
        }
      },
      
      // Utilities
      getItemQuantity: (itemId, customizations) => {
        const item = get().findCartItem(itemId, customizations)
        return item?.quantity || 0
      },
      
      findCartItem: (itemId, customizations) => {
        const items = get().items
        return items.find(item => 
          item.id === itemId && customizationsMatch(item.customizations, customizations)
        )
      },
      
      getCartSummary: () => {
        const state = get()
        const subtotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0)
        const tax = Math.round(subtotal * TAX_RATE)
        const service_fee = Math.round(subtotal * SERVICE_FEE_RATE)
        const discount = state.appliedPromo?.discount_amount || 0
        const total = Math.max(0, subtotal + tax + service_fee - discount)
        const item_count = state.items.reduce((total, item) => total + item.quantity, 0)
        const estimated_time = state.items.length > 0 ? Math.max(...state.items.map(item => item.preparation_time)) : 0

        return {
          subtotal,
          tax,
          service_fee,
          discount,
          total,
          item_count,
          estimated_time
        }
      },
      
      validateCart: () => {
        const state = get()
        const errors: string[] = []
        const warnings: string[] = []
        
        // Check if cart is empty
        if (state.items.length === 0) {
          errors.push('Keranjang kosong')
        }
        
        // Check session validity
        if (!state.isSessionValid()) {
          errors.push('Sesi sudah berakhir')
        }
        
        // Check table ID
        if (!state.tableId) {
          errors.push('Nomor meja tidak valid')
        }
        
        // Check item limits
        const totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
        if (totalItems > MAX_TOTAL_ITEMS) {
          errors.push(`Terlalu banyak item (maksimal ${MAX_TOTAL_ITEMS})`)
        }
        
        // Check individual item limits
        state.items.forEach(item => {
          if (item.quantity > MAX_ITEMS_PER_PRODUCT) {
            errors.push(`${item.name}: terlalu banyak (maksimal ${MAX_ITEMS_PER_PRODUCT})`)
          }
        })
        
        // Check preparation time
        const estimatedPrepTime = state.items.length > 0 ? Math.max(...state.items.map(item => item.preparation_time)) : 0
        if (estimatedPrepTime > 60) {
          warnings.push('Waktu persiapan lebih dari 1 jam')
        }
        
        // Check total amount
        const summary = state.getCartSummary()
        if (summary.total < 10000) {
          warnings.push('Minimum pemesanan Rp 10.000')
        }
        
        if (summary.total > 1000000) {
          warnings.push('Pemesanan sangat besar - konfirmasi diperlukan')
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings
        }
      },
      
      // Session management
      updateActivity: () => {
        set({ lastActivity: new Date().toISOString() })
      },
      
      isSessionValid: () => {
        const state = get()
        const lastActivity = new Date(state.lastActivity)
        const now = new Date()
        const timeDiff = now.getTime() - lastActivity.getTime()
        
        return timeDiff < SESSION_TIMEOUT
      },
      
      getSessionAge: () => {
        const state = get()
        const lastActivity = new Date(state.lastActivity)
        const now = new Date()

        return now.getTime() - lastActivity.getTime()
      },

      // Real-time sync methods
      syncFromStorage: (tableId: string) => {
        try {
          const storageKey = `cart-storage-table-${tableId}`
          const stored = localStorage.getItem(storageKey)
          if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.state) {
              set({
                items: parsed.state.items || [],
                appliedPromo: parsed.state.appliedPromo || null,
                lastActivity: parsed.state.lastActivity || new Date().toISOString()
              })
            }
          }
        } catch (error) {
          console.error('Error syncing from storage:', error)
        }
      }
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => createTableAwareStorage()),
      
      // Only persist certain fields
      partialize: (state) => ({
        items: state.items,
        tableId: state.tableId,
        lastActivity: state.lastActivity,
        appliedPromo: state.appliedPromo
      }),
      
      // Rehydration callback
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Check if session is still valid
          const lastActivity = new Date(state.lastActivity || 0)
          const now = new Date()
          const timeDiff = now.getTime() - lastActivity.getTime()
          
          if (timeDiff > SESSION_TIMEOUT) {
            // Session expired, clear cart
            state.clearCart()
            return
          }
          
          // Validate rehydrated state
          const validation = state.validateCart()
          
          if (!validation.isValid) {
            console.warn('Invalid cart state after rehydration:', validation.errors)
            
            // Clear invalid cart
            if (validation.errors.some(error => 
              error.includes('berakhir') || error.includes('meja')
            )) {
              state.clearCart()
            }
          }
          
          // Show warnings if any
          if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
              toast.warning(warning)
            })
          }
          
          // Update activity timestamp
          state.updateActivity()
        }
      }
    }
  )
)

// Helper function for initial state
const getInitialState = () => ({
  items: [],
  isCartOpen: false,
  lastActivity: new Date().toISOString(),
  tableId: null
})

// Custom hooks for specific cart operations
export const useCartSummary = () => {
  const items = useCartStore(state => state.items)
  const store = useCartStore()
  const totalItems = items.reduce((total, item) => total + item.quantity, 0)
  const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0)
  const estimatedPrepTime = items.length > 0 ? Math.max(...items.map(item => item.preparation_time)) : 0

  return {
    summary: store.getCartSummary(),
    validation: store.validateCart(),
    totalItems,
    totalAmount,
    estimatedPrepTime
  }
}

export const useCartValidation = () => {
  const store = useCartStore()
  return store.validateCart()
}

export const useCartSession = () => {
  const store = useCartStore()
  return {
    isValid: store.isSessionValid(),
    age: store.getSessionAge(),
    lastActivity: store.lastActivity,
    updateActivity: store.updateActivity
  }
}

// Cart item operations
export const useCartItem = (itemId: string, customizations: Record<string, string[]> = {}) => {
  const store = useCartStore()
  
  return {
    quantity: store.getItemQuantity(itemId, customizations),
    item: store.findCartItem(itemId, customizations),
    addItem: (item: Omit<CartItem, 'added_at'>) => store.addItem(item),
    updateQuantity: (quantity: number) => store.updateQuantity(itemId, customizations, quantity),
    removeItem: () => store.removeItem(itemId, customizations),
    increment: () => {
      const current = store.getItemQuantity(itemId, customizations)
      store.updateQuantity(itemId, customizations, current + 1)
    },
    decrement: () => {
      const current = store.getItemQuantity(itemId, customizations)
      store.updateQuantity(itemId, customizations, Math.max(0, current - 1))
    }
  }
}

// Export types for use in components
export type { CartItem, CartSummary, CartValidation, PromoData }