'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
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
  Utensils
} from 'lucide-react'

// Components
import MenuCard from '@/components/menu/MenuCard'
import CartSummary from '@/components/cart/CartSummary'

// Hooks and stores
import useTable from '@/hooks/useTable'
import { useCartStore } from '@/stores/cartStore'
import apiClient from '@/lib/api/client'

// Types
import type { MenuItem, MenuCategory } from '@/types/menu'

export default function MenuPage() {
  const params = useParams()
  const tableId = params.tableId as string

  // Hooks
  const { 
    table, 
    initializeTable, 
    subscribeToUpdates, 
    isValidSession, 
    isLoading: tableLoading 
  } = useTable()
  
  const { 
    items: cartItems, 
    totalItems, 
    totalAmount,
    isCartOpen,
    setIsCartOpen 
  } = useCartStore()

  // State management
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Initialize table on component mount
  useEffect(() => {
    if (tableId) {
      initializeTable(tableId).then((success) => {
        if (success) {
          subscribeToUpdates()
          loadMenuData()
        }
      })
    }
  }, [tableId, initializeTable, subscribeToUpdates])

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

      // Load categories and menu items in parallel
      const [categoriesResponse, menuResponse] = await Promise.all([
        apiClient.getMenuCategories(),
        apiClient.getMenu(tableId)
      ])

      if (categoriesResponse.error) {
        throw new Error(categoriesResponse.error.message)
      }

      if (menuResponse.error) {
        throw new Error(menuResponse.error.message)
      }

      if (categoriesResponse.data) {
        setCategories(categoriesResponse.data.map(cat => ({
          ...cat,
          icon: cat.name.toLowerCase().includes('coffee') ? 'coffee' : 
                cat.name.toLowerCase().includes('makanan') ? 'chef-hat' : 'utensils'
        })).sort((a, b) => a.sort_order - b.sort_order))
      }

      if (menuResponse.data) {
        setMenuItems(menuResponse.data.map(item => ({
          ...item,
          description: item.description || '',
          preparation_time: item.preparation_time || 15,
          category_name: categoriesResponse.data?.find(cat => cat.id === item.category_id)?.name || 'Lainnya',
          is_available: item.status === 'available',
          is_halal: item.tags?.includes('halal') || true,
          ingredients_available: item.status === 'available',
        })))
      }

      setLastRefresh(new Date())

    } catch (error: any) {
      console.error('Error loading menu:', error)
      toast.error(error.message || 'Gagal memuat menu')
      
      // Try to load from cache
      loadCachedMenu()
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
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'coffee': return <Coffee className="h-5 w-5" />
      case 'chef-hat': return <ChefHat className="h-5 w-5" />
      case 'utensils': return <Utensils className="h-5 w-5" />
      default: return <Utensils className="h-5 w-5" />
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

          {/* Last Refresh Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>
                Terakhir diperbarui: {lastRefresh.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="h-3 w-3 text-green-600" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-600" />
              )}
              <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
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
                      {getCategoryIcon(category.icon)}
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
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <div onClick={() => setIsCartOpen(!isCartOpen)} className="cursor-pointer">
            <CartSummary 
              compact={true}
              showActions={false}
              showTaxBreakdown={false}
            />
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsCartOpen(false)}>
          <div 
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Keranjang ({totalItems} item)
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {/* Cart items will be rendered here */}
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={`${item.id}-${JSON.stringify(item.customizations)}`}>
                    {/* CartItem component will be implemented in next file */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        Qty: {item.quantity} × Rp {item.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}