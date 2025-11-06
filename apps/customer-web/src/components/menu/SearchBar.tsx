'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, Clock, TrendingUp, History, Filter } from 'lucide-react'
import { toast } from 'sonner'

// Types
import type { MenuItem } from '@/types/menu'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  menuItems: MenuItem[]
  onItemSelect?: (item: MenuItem) => void
  placeholder?: string
  className?: string
  showSuggestions?: boolean
  showHistory?: boolean
  showTrending?: boolean
}

interface SearchSuggestion {
  id: string
  text: string
  type: 'item' | 'category' | 'tag' | 'ingredient'
  item?: MenuItem
  count?: number
  icon?: React.ReactNode
}

interface SearchHistory {
  query: string
  timestamp: number
  resultCount: number
}

const SEARCH_HISTORY_KEY = 'menu_search_history'
const MAX_HISTORY_ITEMS = 10
const MAX_SUGGESTIONS = 8
const SEARCH_DEBOUNCE_MS = 300

export default function SearchBar({
  value,
  onChange,
  menuItems,
  onItemSelect,
  placeholder = "Cari menu favorit...",
  className = '',
  showSuggestions = true,
  showHistory = true,
  showTrending = true
}: SearchBarProps) {
  // State management
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory()
  }, [])

  // Generate suggestions when search value changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value.trim().length > 0) {
      setIsLoading(true)
      debounceRef.current = setTimeout(() => {
        generateSuggestions(value.trim())
        setIsLoading(false)
      }, SEARCH_DEBOUNCE_MS)
    } else {
      setSuggestions([])
      setSelectedSuggestionIndex(-1)
      setIsLoading(false)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, menuItems])

  // Generate search suggestions
  const generateSuggestions = (query: string) => {
    const normalizedQuery = query.toLowerCase()
    const suggestions: SearchSuggestion[] = []

    // 1. Direct menu item matches
    const itemMatches = menuItems
      .filter(item => {
        const searchText = `${item.name} ${item.description || ''} ${item.category_name}`.toLowerCase()
        const keywordMatch = item.tags?.some(keyword => 
          keyword.toLowerCase().includes(normalizedQuery)
        )
        const tagMatch = item.tags?.some(tag => 
          tag.toLowerCase().includes(normalizedQuery)
        )
        
        return searchText.includes(normalizedQuery) || keywordMatch || tagMatch
      })
      .slice(0, 5)
      .map(item => ({
        id: `item-${item.id}`,
        text: item.name,
        type: 'item' as const,
        item,
        icon: <Search className="h-4 w-4 text-blue-500" />
      }))

    suggestions.push(...itemMatches)

    // 2. Category suggestions
    const categories = [...new Set(menuItems.map(item => item.category_name))]
    const categoryMatches = categories
      .filter(category => category.toLowerCase().includes(normalizedQuery))
      .slice(0, 2)
      .map(category => {
        const count = menuItems.filter(item => 
          item.category_name === category && item.is_available
        ).length
        
        return {
          id: `category-${category}`,
          text: category,
          type: 'category' as const,
          count,
          icon: <Filter className="h-4 w-4 text-green-500" />
        }
      })

    suggestions.push(...categoryMatches)

    // 3. Tag suggestions
    const allTags = menuItems.flatMap(item => item.tags || [])
    const uniqueTags = [...new Set(allTags)]
    const tagMatches = uniqueTags
      .filter(tag => tag.toLowerCase().includes(normalizedQuery))
      .slice(0, 2)
      .map(tag => {
        const count = menuItems.filter(item => 
          item.tags?.includes(tag) && item.is_available
        ).length
        
        return {
          id: `tag-${tag}`,
          text: `#${tag}`,
          type: 'tag' as const,
          count,
          icon: <TrendingUp className="h-4 w-4 text-purple-500" />
        }
      })

    suggestions.push(...tagMatches)

    setSuggestions(suggestions.slice(0, MAX_SUGGESTIONS))
  }

  // Get trending searches (mock data - in real app this would come from analytics)
  const trendingSearches = useMemo(() => [
    { query: 'kopi', count: 45 },
    { query: 'nasi goreng', count: 32 },
    { query: 'ayam bakar', count: 28 },
    { query: 'es teh', count: 25 },
    { query: 'mie ayam', count: 22 }
  ], [])

  // Load search history from localStorage
  const loadSearchHistory = () => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (stored) {
        const history: SearchHistory[] = JSON.parse(stored)
        setSearchHistory(history.slice(0, MAX_HISTORY_ITEMS))
      }
    } catch (error) {
      console.error('Error loading search history:', error)
    }
  }

  // Save search to history
  const saveToHistory = (query: string, resultCount: number) => {
    if (query.trim().length < 2) return

    try {
      const newEntry: SearchHistory = {
        query: query.trim(),
        timestamp: Date.now(),
        resultCount
      }

      const updatedHistory = [
        newEntry,
        ...searchHistory.filter(entry => entry.query !== newEntry.query)
      ].slice(0, MAX_HISTORY_ITEMS)

      setSearchHistory(updatedHistory)
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory))
    } catch (error) {
      console.error('Error saving search history:', error)
    }
  }

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem(SEARCH_HISTORY_KEY)
    toast.success('Riwayat pencarian dihapus')
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedSuggestionIndex(-1)
  }

  // Handle input focus
  const handleInputFocus = () => {
    setIsFocused(true)
  }

  // Handle input blur
  const handleInputBlur = () => {
    // Delay to allow suggestion clicks
    setTimeout(() => {
      setIsFocused(false)
      setSelectedSuggestionIndex(-1)
    }, 150)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'item' && suggestion.item) {
      onChange(suggestion.item.name)
      onItemSelect?.(suggestion.item)
      saveToHistory(suggestion.item.name, 1)
    } else {
      onChange(suggestion.text.replace('#', '')) // Remove # from tags
      const resultCount = menuItems.filter(item => {
        const searchText = `${item.name} ${item.description || ''} ${item.category_name}`.toLowerCase()
        return searchText.includes(suggestion.text.toLowerCase())
      }).length
      saveToHistory(suggestion.text, resultCount)
    }
    
    setIsFocused(false)
  }

  // Handle history item click
  const handleHistoryClick = (historyItem: SearchHistory) => {
    onChange(historyItem.query)
    setIsFocused(false)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalSuggestions = suggestions.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < totalSuggestions - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
        break

      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex])
        } else if (value.trim()) {
          // Save search and close suggestions
          const resultCount = menuItems.filter(item => {
            const searchText = `${item.name} ${item.description || ''} ${item.category_name}`.toLowerCase()
            return searchText.includes(value.toLowerCase())
          }).length
          saveToHistory(value, resultCount)
          setIsFocused(false)
          inputRef.current?.blur()
        }
        break

      case 'Escape':
        setIsFocused(false)
        inputRef.current?.blur()
        break
    }
  }

  // Handle clear search
  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  // Show suggestions dropdown
  const showDropdown = isFocused && (
    suggestions.length > 0 || 
    (value.length === 0 && (searchHistory.length > 0 || showTrending))
  )

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={`h-4 w-4 transition-colors ${
            isFocused ? 'text-blue-500' : 'text-gray-500'
          }`} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            w-full 
            pl-10 
            pr-10 
            py-3 
            border 
            border-gray-200 
            rounded-lg 
            focus:ring-2 
            focus:ring-blue-500 
            focus:border-transparent
            text-sm
            transition-all
            duration-200
            ${isFocused ? 'shadow-lg' : 'shadow-sm'}
          `}
        />

        {/* Loading spinner or clear button */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          ) : value.length > 0 ? (
            <button
              onClick={handleClear}
              className="text-gray-500 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Saran Pencarian
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`
                    w-full 
                    flex 
                    items-center 
                    space-x-3 
                    px-3 
                    py-2 
                    text-left 
                    hover:bg-gray-50 
                    transition-colors
                    ${selectedSuggestionIndex === index ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  `}
                >
                  {suggestion.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{suggestion.text}</div>
                    {suggestion.count !== undefined && (
                      <div className="text-xs text-gray-500">
                        {suggestion.count} item
                      </div>
                    )}
                    {suggestion.item && (
                      <div className="text-xs text-gray-500 truncate">
                        {suggestion.item.category_name} • Rp {suggestion.item.price.toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search History */}
          {value.length === 0 && showHistory && searchHistory.length > 0 && (
            <div className="py-2 border-t border-gray-100">
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Pencarian Terakhir
                </span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Hapus
                </button>
              </div>
              {searchHistory.slice(0, 5).map((historyItem, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(historyItem)}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <History className="h-4 w-4 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-700 truncate">
                      {historyItem.query}
                    </div>
                    <div className="text-xs text-gray-500">
                      {historyItem.resultCount} hasil • {new Date(historyItem.timestamp).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {value.length === 0 && showTrending && trendingSearches.length > 0 && (
            <div className="py-2 border-t border-gray-100">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Pencarian Populer
              </div>
              {trendingSearches.slice(0, 5).map((trending, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onChange(trending.query)
                    setIsFocused(false)
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-700 truncate">
                      {trending.query}
                    </div>
                    <div className="text-xs text-gray-500">
                      {trending.count} pencarian hari ini
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {suggestions.length === 0 && value.length > 0 && !isLoading && (
            <div className="py-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Tidak ada hasil untuk "{value}"</p>
              <p className="text-xs mt-1">Coba kata kunci lain</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Advanced Search Modal Component
interface AdvancedSearchProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (filters: AdvancedSearchFilters) => void
  menuItems: MenuItem[]
}

interface AdvancedSearchFilters {
  query: string
  categories: string[]
  priceRange: [number, number]
  prepTimeRange: [number, number]
  spiceLevel: number[]
  dietary: string[]
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'prep_time' | 'name'
}

export function AdvancedSearchModal({ 
  isOpen, 
  onClose, 
  onSearch, 
  menuItems 
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    query: '',
    categories: [],
    priceRange: [0, 100000],
    prepTimeRange: [0, 60],
    spiceLevel: [],
    dietary: [],
    sortBy: 'relevance'
  })

  const handleSearch = () => {
    onSearch(filters)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Pencarian Lanjutan
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Search Query */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kata Kunci
            </label>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Masukkan kata kunci..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {[...new Set(menuItems.map(item => item.category_name))].map(category => (
                <label key={category} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({
                          ...prev,
                          categories: [...prev.categories, category]
                        }))
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          categories: prev.categories.filter(c => c !== category)
                        }))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rentang Harga
            </label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.priceRange[0]}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceRange: [Number(e.target.value), prev.priceRange[1]]
                  }))}
                  placeholder="Min"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="py-2 text-gray-500">-</span>
                <input
                  type="number"
                  value={filters.priceRange[1]}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceRange: [prev.priceRange[0], Number(e.target.value)]
                  }))}
                  placeholder="Max"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="text-xs text-gray-500">
                Rp {filters.priceRange[0].toLocaleString('id-ID')} - Rp {filters.priceRange[1].toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urutkan Berdasarkan
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                sortBy: e.target.value as AdvancedSearchFilters['sortBy']
              }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="relevance">Relevansi</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="price_desc">Harga Tertinggi</option>
              <option value="prep_time">Waktu Persiapan</option>
              <option value="name">Nama A-Z</option>
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSearch}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Cari
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export search utilities
export function searchMenuItems(items: MenuItem[], query: string): MenuItem[] {
  if (!query.trim()) return items

  const normalizedQuery = query.toLowerCase()
  
  return items.filter(item => {
    const searchableText = [
      item.name,
      item.description || '',
      item.category_name,
      ...(item.tags || [])
    ].join(' ').toLowerCase()

    return searchableText.includes(normalizedQuery)
  })
}

export function sortMenuItems(items: MenuItem[], sortBy: AdvancedSearchFilters['sortBy']): MenuItem[] {
  const sorted = [...items]

  switch (sortBy) {
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price)
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price)
    case 'prep_time':
      return sorted.sort((a, b) => (a.preparation_time || 0) - (b.preparation_time || 0))
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'id-ID'))
    case 'relevance':
    default:
      return sorted // Keep original order for relevance
  }
}

export type { SearchBarProps, AdvancedSearchFilters }