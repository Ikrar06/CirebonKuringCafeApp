'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  ShoppingCart,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  ChefHat,
  Coffee,
  Utensils,
  Plus,
  Minus
} from 'lucide-react'

// Components
import MenuCard from '@/components/menu/MenuCard'
import CartSummary from '@/components/cart/CartSummary'

// Hooks and stores
import useTable from '@/hooks/useTable'
import { useCartStore } from '@/stores/cartStore'
import { preloadCustomizations, useCustomizations, clearCustomizationCache } from '@/hooks/useCustomizations'
import apiClient from '@/lib/api/client'

// Types
import type { MenuItem, MenuCategory } from '@/types/menu'
import type { CartItem } from '@/stores/cartStore'

export default function MenuPage() {
  const params = useParams()
  const router = useRouter()
  const tableId = params.tableId as string

  // Hooks
  const { 
    table, 
    initializeTable, 
    subscribeToUpdates, 
    isValidSession, 
    isLoading: tableLoading 
  } = useTable()
  
  const cartItems = useCartStore(state => state.items)
  const totalItems = useCartStore(state => state.items.reduce((total, item) => total + item.quantity, 0))
  const totalAmount = useCartStore(state => state.items.reduce((total, item) => total + (item.price * item.quantity), 0))
  const cartSummaryTotal = useCartStore(state => {
    const subtotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0)
    const tax = Math.round(subtotal * 0.11) // 11% PPN
    const service_fee = Math.round(subtotal * 0.05) // 5% service fee
    return subtotal + tax + service_fee
  })
  const isCartOpen = useCartStore(state => state.isCartOpen)
  const setIsCartOpen = useCartStore(state => state.setIsCartOpen)
  const { addItem, updateQuantity, removeItem, updateActivity, setTableId, syncFromStorage } = useCartStore()

  // Hide/show table footer based on cart items
  useEffect(() => {
    const footer = document.getElementById('table-footer')
    if (footer) {
      footer.style.display = totalItems > 0 ? 'none' : 'block'
    }
  }, [totalItems])

  // State management
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Edit cart item state
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editCustomizations, setEditCustomizations] = useState<Record<string, string[]>>({})
  const [editQuantity, setEditQuantity] = useState(1)

  // Get customizations for editing item
  const { customizations: editItemCustomizations } = useCustomizations(editingItem?.id)

  // Initialize table on component mount
  useEffect(() => {
    if (tableId) {
      initializeTable(tableId).then((success) => {
        if (success) {
          // Set table ID in cart store to isolate cart per table
          setTableId(tableId)
          subscribeToUpdates()
          loadMenuData()
        }
      })
    }
  }, [tableId, setTableId]) // Remove function dependencies to avoid infinite loop

  // Real-time cart synchronization across tabs/devices for the same table
  useEffect(() => {
    if (!tableId || !isValidSession) return

    const handleStorageChange = (e: StorageEvent) => {
      // Only sync if the storage key is for our current table
      if (e.key === `cart-storage-table-${tableId}` && e.newValue) {
        syncFromStorage(tableId)
      }
    }

    // Add storage event listener for real-time sync
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [tableId, isValidSession, syncFromStorage])

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Koneksi tersambung kembali')
      loadMenuData()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.error('Koneksi terputus - menggunakan data tersimpan')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load menu data
  const loadMenuData = async () => {
    try {
      setIsLoadingMenu(true)

      // Clear customization cache to force reload
      clearCustomizationCache()

      // Load menu with categories using new API

      // Also test direct fetch
      try {
        const directResponse = await fetch('/api/menu')
        const directData = await directResponse.json()
      } catch (err) {
        console.error('Direct fetch failed:', err)
      }

      const menuResponse = await apiClient.getMenu(tableId)

      if (menuResponse.error) {
        throw new Error(menuResponse.error.message)
      }

      if (menuResponse.data) {
        // Handle the nested data structure from API response
        const responseData = menuResponse.data.data || menuResponse.data
        const { categories: apiCategories, menu: menuByCategory } = responseData


        // Set categories
        if (apiCategories && Array.isArray(apiCategories)) {
          const processedCategories = apiCategories.map(cat => ({
            ...cat,
            slug: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
            icon: cat.name.toLowerCase().includes('coffee') ? 'coffee' :
                  cat.name.toLowerCase().includes('makanan') ? 'chef-hat' : 'utensils'
          }))
          setCategories(processedCategories)
        }

        // Flatten menu items from grouped format
        const allMenuItems: MenuItem[] = []
        if (menuByCategory && Array.isArray(menuByCategory)) {
          menuByCategory.forEach((category: any) => {
            if (category && category.items && Array.isArray(category.items)) {
              category.items.forEach((item: any) => {
                const menuItem = {
                  id: item.id,
                  name: item.name,
                  description: item.description || '',
                  price: item.price || 0,
                  image_url: item.image_url,
                  category_id: category.id,
                  category_name: category.name,
                  is_available: true, // Already filtered by API
                  preparation_time: item.estimated_prep_time || 15,
                  is_halal: item.allergens ? !item.allergens.includes('non-halal') : true,
                  spice_level: item.spicy_level,
                  tags: [],
                  ingredients_available: true,
                  rating: item.average_rating,
                  total_reviews: item.rating_count,
                }
                allMenuItems.push(menuItem)
              })
            } else {
            }
          })
        } else {
        }

        setMenuItems(allMenuItems)

        // Preload customizations for all menu items to improve cart display
        const menuItemIds = allMenuItems.map(item => item.id)
        preloadCustomizations(menuItemIds).catch(error => {
          console.error('Failed to preload customizations:', error)
        })
      }

      setLastRefresh(new Date())

    } catch (error: any) {
      console.error('Error loading menu:', error)
      toast.error(error.message || 'Gagal memuat menu')

      // Try to load from cache
      loadCachedMenu()

      // If still no data, show some demo data to help debug
      if (menuItems.length === 0 && categories.length === 0) {
        setCategories([
          { id: 'demo1', name: 'Coffee', slug: 'coffee', icon: 'coffee', description: 'Minuman kopi', sort_order: 1, is_active: true }
        ])
        setMenuItems([
          {
            id: 'demo-item-1',
            name: 'Cappuccino (Demo)',
            description: 'Demo cappuccino item',
            price: 20000,
            category_id: 'demo1',
            category_name: 'Coffee',
            is_available: true,
            preparation_time: 8,
            is_halal: true,
            tags: [],
            ingredients_available: true
          }
        ])
      }
    } finally {
      setIsLoadingMenu(false)
    }
  }

  // Load cached menu data
  const loadCachedMenu = () => {
    try {
      const cachedMenu = localStorage.getItem(`menu-cache-${tableId}`)
      const cachedCategories = localStorage.getItem('categories-cache')
      
      if (cachedMenu) {
        setMenuItems(JSON.parse(cachedMenu))
      }
      
      if (cachedCategories) {
        setCategories(JSON.parse(cachedCategories))
      }

      if (cachedMenu || cachedCategories) {
        toast.info('Menggunakan menu tersimpan')
      }
    } catch (error) {
      console.error('Error loading cached menu:', error)
    }
  }

  // Cache menu data
  useEffect(() => {
    if (menuItems.length > 0) {
      localStorage.setItem(`menu-cache-${tableId}`, JSON.stringify(menuItems))
    }
  }, [menuItems, tableId])

  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('categories-cache', JSON.stringify(categories))
    }
  }, [categories])

  // Filter menu items based on search and category
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      // Category filter
      const categoryMatch = selectedCategory === 'all' || item.category_id === selectedCategory
      
      // Search filter
      const searchMatch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      return categoryMatch && searchMatch
    })
  }, [menuItems, selectedCategory, searchQuery])

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {}
    
    filteredMenuItems.forEach(item => {
      if (!grouped[item.category_id]) {
        grouped[item.category_id] = []
      }
      grouped[item.category_id].push(item)
    })

    return grouped
  }, [filteredMenuItems])

  // Get category icon
  const getCategoryIcon = (iconName: string, variant: 'button' | 'header' = 'button') => {
    const baseClasses = variant === 'header'
      ? "h-5 w-5 text-blue-600"
      : "h-5 w-5"

    switch (iconName) {
      case 'coffee': return <Coffee className={baseClasses} />
      case 'chef-hat': return <ChefHat className={baseClasses} />
      case 'utensils': return <Utensils className={baseClasses} />
      default: return <Utensils className={baseClasses} />
    }
  }

  // Handle manual refresh
  const handleRefresh = () => {
    if (!isOnline) {
      toast.error('Tidak dapat memuat data - periksa koneksi internet')
      return
    }
    loadMenuData()
  }

  // Handle edit cart item
  const handleEditCartItem = (cartItem: CartItem) => {
    setEditingItem(cartItem)
    setEditCustomizations(cartItem.customizations)
    setEditQuantity(cartItem.quantity)
    setIsEditModalOpen(true)
  }

  // Handle customization change in edit modal
  const handleEditCustomizationChange = (customizationId: string, optionId: string, checked: boolean) => {
    setEditCustomizations(prev => {
      const customization = editItemCustomizations?.find(c => c.id === customizationId)
      if (!customization) return prev

      const currentOptions = prev[customizationId] || []

      if (customization.type === 'single') {
        // Single selection - replace
        return {
          ...prev,
          [customizationId]: checked ? [optionId] : []
        }
      } else {
        // Multiple selection - add/remove
        return {
          ...prev,
          [customizationId]: checked
            ? [...currentOptions, optionId]
            : currentOptions.filter(id => id !== optionId)
        }
      }
    })
  }

  // Save edited cart item
  const handleSaveEditedItem = () => {
    if (!editingItem) return

    // Remove the old item
    removeItem(editingItem.id, editingItem.customizations)

    // Calculate new price with customizations
    let newPrice = menuItems.find(item => item.id === editingItem.id)?.price || editingItem.price

    if (editItemCustomizations) {
      Object.entries(editCustomizations).forEach(([customizationId, optionIds]) => {
        const customization = editItemCustomizations.find(c => c.id === customizationId)
        if (customization) {
          optionIds.forEach(optionId => {
            const option = customization.options.find(o => o.id === optionId)
            if (option) {
              newPrice += option.price_modifier
            }
          })
        }
      })
    }

    // Add the updated item
    const updatedItem = {
      id: editingItem.id,
      name: editingItem.name,
      price: newPrice,
      image_url: editingItem.image_url,
      quantity: editQuantity,
      customizations: editCustomizations,
      preparation_time: editingItem.preparation_time,
      table_id: editingItem.table_id,
      notes: editingItem.notes
    }

    addItem(updatedItem)

    toast.success('Item berhasil diperbarui')
    setIsEditModalOpen(false)
    setEditingItem(null)
    setEditCustomizations({})
    setEditQuantity(1)
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setIsEditModalOpen(false)
    setEditingItem(null)
    setEditCustomizations({})
    setEditQuantity(1)
  }

  // Handle checkout navigation
  const handleCheckout = () => {
    if (totalItems === 0) {
      toast.error('Keranjang masih kosong')
      return
    }

    // Update activity to prevent session timeout
    updateActivity()

    // Close cart modal
    setIsCartOpen(false)

    // Navigate to checkout page
    router.push(`/${tableId}/checkout`)
  }

  // Loading state
  if (tableLoading || !isValidSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Memuat Menu
          </h2>
          <p className="text-sm text-gray-600">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        {/* Search and Filter */}
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari menu favorit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  w-full
                  pl-10
                  pr-4
                  py-3
                  border
                  border-gray-200
                  rounded-lg
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-transparent
                  text-sm
                  text-gray-900
                  placeholder-gray-500
                  bg-white
                "
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={!isOnline || isLoadingMenu}
              className={`
                p-3 
                rounded-lg 
                border 
                border-gray-200 
                ${isOnline && !isLoadingMenu 
                  ? 'hover:bg-gray-50 text-gray-600' 
                  : 'text-gray-400 cursor-not-allowed'
                }
                transition-colors
              `}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingMenu ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Network Status */}
          {!isOnline && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <WifiOff className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Mode offline - menampilkan menu tersimpan
                </p>
              </div>
            </div>
          )}

          {/* Removed duplicate status info - already shown in layout header */}
        </div>

        {/* Category Filter */}
        <div className="px-4 pb-4">
          <div className="flex space-x-3 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`
                flex-shrink-0 
                px-4 
                py-2 
                rounded-full 
                text-sm 
                font-medium 
                transition-colors
                ${selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              Semua Menu
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  flex-shrink-0 
                  flex 
                  items-center 
                  space-x-2 
                  px-4 
                  py-2 
                  rounded-full 
                  text-sm 
                  font-medium 
                  transition-colors
                  ${selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {getCategoryIcon(category.icon)}
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="px-4 py-6">
        {isLoadingMenu ? (
          // Loading skeleton
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="flex space-x-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Menu items by category
          <div className="space-y-8">
            {selectedCategory === 'all' ? (
              // Show all categories
              categories.map((category) => {
                const categoryItems = groupedItems[category.id] || []
                if (categoryItems.length === 0) return null

                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(category.icon, 'header')}
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {category.name}
                        </h2>
                        {category.description && (
                          <p className="text-sm text-gray-600">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-4">
                      {categoryItems.map((item) => (
                        <MenuCard 
                          key={item.id} 
                          item={item}
                          tableId={tableId}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
            ) : (
              // Show filtered items
              <div className="grid gap-4">
                {filteredMenuItems.length > 0 ? (
                  filteredMenuItems.map((item) => (
                    <MenuCard 
                      key={item.id} 
                      item={item}
                      tableId={tableId}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Tidak ada menu ditemukan
                    </h3>
                    <p className="text-gray-600">
                      Coba ubah pencarian atau pilih kategori lain
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Summary (Fixed Bottom) */}
      {totalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
          <div onClick={() => setIsCartOpen(!isCartOpen)} className="cursor-pointer p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center relative">
                  <ShoppingCart className="h-5 w-5 text-white" />
                  {totalItems > 0 && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {totalItems > 99 ? '99+' : totalItems}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-left">
                  <div className="font-medium text-gray-900">
                    {totalItems} item dalam keranjang
                  </div>
                  <div className="text-sm text-gray-600">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="text-blue-600 font-medium text-sm">
                Lihat Keranjang
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <>
          {/* Backdrop with blur effect */}
          <div
            className="fixed inset-0 z-50 bg-white/20 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Cart Content */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md rounded-t-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200/50">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Keranjang ({totalItems} item)
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-gray-200/80 rounded-lg transition-colors text-gray-700 hover:text-gray-900 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Cart Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <CartSummary
                showActions={true}
                compact={false}
                showTaxBreakdown={true}
                onItemEdit={handleEditCartItem}
                className="border-0"
              />
            </div>

            {/* Checkout Button - Fixed at bottom */}
            {totalItems > 0 && (
              <div className="p-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
                <button
                  onClick={handleCheckout}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <span className="font-bold">
                    Rp {cartSummaryTotal.toLocaleString('id-ID')}
                  </span>
                </button>
                <p className="text-xs text-gray-600 text-center mt-2">
                  Dengan melanjutkan, Anda menyetujui syarat dan ketentuan kami
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-white/20 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white rounded-t-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-lg">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit {editingItem.name}
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 hover:bg-gray-200/80 rounded-lg transition-colors text-gray-700 hover:text-gray-900 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[50vh] p-4">
              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <Minus className="h-4 w-4 text-gray-600" />
                  </button>

                  <span className="text-lg font-medium text-gray-900 min-w-[32px] text-center">
                    {editQuantity}
                  </span>

                  <button
                    onClick={() => setEditQuantity(editQuantity + 1)}
                    className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Customizations */}
              {editItemCustomizations?.map((customization) => (
                <div key={customization.id} className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      {customization.name}
                    </h4>
                    {customization.required && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                        Wajib
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {customization.options.map((option) => {
                      const isSelected = editCustomizations[customization.id]?.includes(option.id) || false

                      return (
                        <label
                          key={option.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type={customization.type === 'single' ? 'radio' : 'checkbox'}
                              name={`edit-customization-${customization.id}`}
                              checked={isSelected}
                              onChange={(e) => handleEditCustomizationChange(
                                customization.id,
                                option.id,
                                e.target.checked
                              )}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-900">
                              {option.name}
                            </span>
                          </div>

                          {option.price_modifier !== 0 && (
                            <span className={`text-sm font-medium ${
                              option.price_modifier > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {option.price_modifier > 0 ? '+' : ''}
                              Rp {option.price_modifier.toLocaleString('id-ID')}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEditedItem}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}