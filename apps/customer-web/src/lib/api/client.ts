/**
 * API Client for Customer Web Application
 * 
 * Centralized API client with Supabase integration, error handling,
 * retry logic, and offline support for customer ordering system
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Environment configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// API Configuration
interface ApiConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelayMs: number
  enableOfflineQueue: boolean
}

const defaultConfig: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelayMs: 1000,
  enableOfflineQueue: true,
}

// Error types
interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

// Request types
interface ApiRequest {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: any
  params?: Record<string, string>
  headers?: Record<string, string>
}

// Response types
interface ApiResponse<T = any> {
  data: T | null
  error: ApiError | null
  status: number
  fromCache?: boolean
}

// Offline queue item
interface QueuedRequest extends ApiRequest {
  id: string
  timestamp: number
  retryCount: number
}

/**
 * API Client Class
 */
class CustomerApiClient {
  private supabase: SupabaseClient<Database>
  private config: ApiConfig
  private offlineQueue: QueuedRequest[] = []
  private isOnline: boolean = true

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    
    // Initialize Supabase client with customer-specific configuration
    this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'customer-session',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'x-application-name': 'cafe-customer-web',
          'x-client-version': '1.0.0',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 2, // Rate limit for customer app
        },
      },
    })

    this.initializeNetworkMonitoring()
    this.loadOfflineQueue()
  }

  /**
   * Initialize network status monitoring
   */
  private initializeNetworkMonitoring() {
    if (typeof window === 'undefined') return

    this.isOnline = navigator.onLine

    window.addEventListener('online', () => {
      this.isOnline = true
      this.processOfflineQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  /**
   * Load offline queue from localStorage
   */
  private loadOfflineQueue() {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('api-offline-queue')
      if (stored) {
        this.offlineQueue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error loading offline queue:', error)
      this.offlineQueue = []
    }
  }

  /**
   * Save offline queue to localStorage
   */
  private saveOfflineQueue() {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem('api-offline-queue', JSON.stringify(this.offlineQueue))
    } catch (error) {
      console.error('Error saving offline queue:', error)
    }
  }

  /**
   * Process queued requests when back online
   */
  private async processOfflineQueue() {
    if (!this.isOnline || this.offlineQueue.length === 0) return

    const queue = [...this.offlineQueue]
    this.offlineQueue = []
    this.saveOfflineQueue()

    for (const queuedRequest of queue) {
      try {
        await this.executeRequest(queuedRequest)
      } catch (error) {
        console.error('Error processing queued request:', error)
        
        // Re-queue if still failing
        if (queuedRequest.retryCount < this.config.retryAttempts) {
          queuedRequest.retryCount++
          this.offlineQueue.push(queuedRequest)
        }
      }
    }

    this.saveOfflineQueue()
  }

  /**
   * Add request to offline queue
   */
  private addToOfflineQueue(request: ApiRequest) {
    if (!this.config.enableOfflineQueue) return

    const queuedRequest: QueuedRequest = {
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    }

    this.offlineQueue.push(queuedRequest)
    this.saveOfflineQueue()
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest(request: ApiRequest): Promise<ApiResponse> {
    const { endpoint, method, data, params, headers = {} } = request

    // Build URL with query parameters
    const url = new URL(endpoint, this.config.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    // Default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    }

    let lastError: any = null

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(url.toString(), {
          method,
          headers: defaultHeaders,
          body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        let responseData = null
        try {
          responseData = await response.json()
        } catch (e) {
          // Response might not be JSON
          responseData = await response.text()
        }

        if (!response.ok) {
          const error: ApiError = {
            message: responseData?.message || `HTTP ${response.status}`,
            code: responseData?.code,
            status: response.status,
            details: responseData,
          }

          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            return { data: null, error, status: response.status }
          }

          throw error
        }

        return {
          data: responseData,
          error: null,
          status: response.status,
        }

      } catch (error: any) {
        lastError = error

        if (error.name === 'AbortError') {
          lastError = { message: 'Request timeout', code: 'TIMEOUT' }
        }

        // Don't retry on last attempt
        if (attempt === this.config.retryAttempts) break

        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, this.config.retryDelayMs * attempt)
        )
      }
    }

    return {
      data: null,
      error: {
        message: lastError?.message || 'Network error',
        code: lastError?.code || 'NETWORK_ERROR',
        details: lastError,
      },
      status: lastError?.status || 0,
    }
  }

  /**
   * Main request method
   */
  async request<T = any>(request: ApiRequest): Promise<ApiResponse<T>> {
    // If offline and request is not GET, queue it
    if (!this.isOnline && request.method !== 'GET') {
      this.addToOfflineQueue(request)
      return {
        data: null,
        error: {
          message: 'Request queued for when online',
          code: 'OFFLINE_QUEUED',
        },
        status: 0,
      }
    }

    // Try to get from cache for GET requests when offline
    if (!this.isOnline && request.method === 'GET') {
      const cached = this.getCachedResponse<T>(request.endpoint)
      if (cached) {
        return { ...cached, fromCache: true }
      }
    }

    const response = await this.executeRequest(request)

    // Cache successful GET responses
    if (response.data && request.method === 'GET' && response.status === 200) {
      this.cacheResponse(request.endpoint, response)
    }

    return response as ApiResponse<T>
  }

  /**
   * Cache response data
   */
  private cacheResponse(endpoint: string, response: ApiResponse) {
    if (typeof window === 'undefined') return

    try {
      const cacheKey = `api-cache-${endpoint}`
      const cacheData = {
        ...response,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error caching response:', error)
    }
  }

  /**
   * Get cached response
   */
  private getCachedResponse<T>(endpoint: string): ApiResponse<T> | null {
    if (typeof window === 'undefined') return null

    try {
      const cacheKey = `api-cache-${endpoint}`
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) return null

      const cacheData = JSON.parse(cached)
      
      // Check if expired
      if (Date.now() > cacheData.expiresAt) {
        localStorage.removeItem(cacheKey)
        return null
      }

      return {
        data: cacheData.data,
        error: cacheData.error,
        status: cacheData.status,
      }
    } catch (error) {
      console.error('Error getting cached response:', error)
      return null
    }
  }

  /**
   * Get Supabase client instance
   */
  getSupabase(): SupabaseClient<Database> {
    return this.supabase
  }

  /**
   * API Methods for Customer Operations
   */

  // Table operations
  async getTable(tableId: string) {
    return this.request<Database['public']['Tables']['tables']['Row']>({
      endpoint: `/tables/${tableId}`,
      method: 'GET',
    })
  }

  async getTableByNumber(tableNumber: string) {
    try {
      const { data, error } = await this.supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNumber)
        .single()

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: error.code },
          status: error.code === 'PGRST116' ? 404 : 500
        }
      }

      return {
        data,
        error: null,
        status: 200
      }
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Failed to find table' },
        status: 500
      }
    }
  }

  async updateTableStatus(tableId: string, status: string) {
    return this.request({
      endpoint: `/tables/${tableId}/status`,
      method: 'PATCH',
      data: { status },
    })
  }

  // Menu operations
  async getMenu(tableId?: string) {
    const params = tableId ? { table_id: tableId } : undefined
    return this.request<Database['public']['Tables']['menu_items']['Row'][]>({
      endpoint: '/menu',
      method: 'GET',
      params,
    })
  }

  async getMenuCategories() {
    return this.request<Database['public']['Tables']['menu_categories']['Row'][]>({
      endpoint: '/menu/categories',
      method: 'GET',
    })
  }

  async getMenuItem(itemId: string) {
    return this.request<Database['public']['Tables']['menu_items']['Row']>({
      endpoint: `/menu/${itemId}`,
      method: 'GET',
    })
  }

  async getMenuCustomizations(itemId: string) {
    return this.request<Database['public']['Tables']['menu_customizations']['Row'][]>({
      endpoint: `/menu/${itemId}/customizations`,
      method: 'GET',
    })
  }

  // Order operations
  async createOrder(orderData: {
    table_id: string
    customer_name: string
    customer_phone?: string
    items: Array<{
      menu_item_id: string
      quantity: number
      customizations?: Record<string, any>
      notes?: string
    }>
    promo_code?: string
  }) {
    return this.request<{ order_id: string; total_amount: number }>({
      endpoint: '/orders',
      method: 'POST',
      data: orderData,
    })
  }

  async getOrder(orderId: string) {
    return this.request<Database['public']['Tables']['orders']['Row']>({
      endpoint: `/orders/${orderId}`,
      method: 'GET',
    })
  }

  async getOrderStatus(orderId: string) {
    return this.request<{ 
      status: string
      estimated_completion: string | null
      progress_steps: Array<{
        step: string
        completed: boolean
        timestamp?: string
      }>
    }>({
      endpoint: `/orders/${orderId}/status`,
      method: 'GET',
    })
  }

  // Payment operations
  async createPayment(paymentData: {
    order_id: string
    method: 'cash' | 'card' | 'qris' | 'bank_transfer'
    amount: number
    customer_phone?: string
  }) {
    return this.request<{ 
      payment_id: string
      qr_code?: string
      bank_details?: {
        bank_name: string
        account_number: string
        account_name: string
      }
    }>({
      endpoint: '/payments',
      method: 'POST',
      data: paymentData,
    })
  }

  async uploadPaymentProof(paymentId: string, file: File) {
    const formData = new FormData()
    formData.append('proof', file)

    return this.request({
      endpoint: `/payments/${paymentId}/proof`,
      method: 'POST',
      data: formData,
      headers: {
        // Don't set Content-Type, let browser set it for FormData
      },
    })
  }

  async getPaymentStatus(paymentId: string) {
    return this.request<{
      status: 'pending' | 'completed' | 'failed' | 'cancelled'
      verified_at?: string
      verified_by?: string
    }>({
      endpoint: `/payments/${paymentId}/status`,
      method: 'GET',
    })
  }

  // Promo operations
  async validatePromoCode(code: string, orderTotal: number) {
    return this.request<{
      valid: boolean
      discount_amount: number
      discount_percentage?: number
      final_total: number
      message?: string
    }>({
      endpoint: '/promo/validate',
      method: 'POST',
      data: { code, order_total: orderTotal },
    })
  }

  // Rating operations
  async submitRating(orderData: {
    order_id: string
    rating: number
    review?: string
    service_rating?: number
    food_rating?: number
  }) {
    return this.request({
      endpoint: '/ratings',
      method: 'POST',
      data: orderData,
    })
  }

  // Real-time subscriptions
  subscribeToOrderUpdates(orderId: string, callback: (update: any) => void) {
    return this.supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        callback
      )
      .subscribe()
  }

  subscribeToTableUpdates(tableId: string, callback: (update: any) => void) {
    return this.supabase
      .channel(`table-${tableId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tables',
          filter: `id=eq.${tableId}`,
        },
        callback
      )
      .subscribe()
  }

  // Utility methods
  async ping() {
    return this.request({
      endpoint: '/health',
      method: 'GET',
    })
  }

  clearCache() {
    if (typeof window === 'undefined') return

    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('api-cache-')) {
        localStorage.removeItem(key)
      }
    })
  }

  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      queuedRequests: this.offlineQueue.length,
    }
  }
}

// Create singleton instance
const apiClient = new CustomerApiClient()

export default apiClient
export { CustomerApiClient }
export type { ApiResponse, ApiError, ApiRequest }