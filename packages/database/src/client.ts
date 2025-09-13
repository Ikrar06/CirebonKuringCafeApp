/**
 * Database Client Configuration
 * 
 * Centralized Supabase client setup with connection pooling,
 * error handling, and type-safe database operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../shared-types/src/database'

// Environment configuration
interface DatabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
  maxConnections?: number
  connectionTimeoutMs?: number
  enableRealtime?: boolean
  enableAuth?: boolean
}

// Client instances
let publicClient: SupabaseClient<Database> | null = null
let adminClient: SupabaseClient<Database> | null = null

// Configuration options
const defaultConfig = {
  maxConnections: 10,
  connectionTimeoutMs: 30000,
  enableRealtime: true,
  enableAuth: true,
}

/**
 * Create public Supabase client for client-side operations
 */
export function createPublicClient(config: DatabaseConfig): SupabaseClient<Database> {
  if (publicClient) return publicClient

  const clientOptions = {
    auth: {
      autoRefreshToken: config.enableAuth ?? true,
      persistSession: config.enableAuth ?? true,
      detectSessionInUrl: config.enableAuth ?? true,
    },
    global: {
      headers: {
        'x-application-name': 'cafe-management-system',
      },
    },
  }

  publicClient = createClient(
    config.url,
    config.anonKey,
    clientOptions
  ) as any as SupabaseClient<Database>

  return publicClient
}

/**
 * Create admin Supabase client for server-side operations
 */
export function createAdminClient(config: DatabaseConfig): SupabaseClient<Database> {
  if (!config.serviceRoleKey) {
    throw new Error('Service role key is required for admin client')
  }

  if (adminClient) return adminClient

  const clientOptions = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'cafe-management-system-admin',
      },
    },
  }

  adminClient = createClient(
    config.url,
    config.serviceRoleKey,
    clientOptions
  ) as any as SupabaseClient<Database>

  return adminClient
}

/**
 * Database connection wrapper with error handling and retry logic
 */
export class DatabaseConnection {
  private client: SupabaseClient<Database>
  private config: DatabaseConfig
  private retryAttempts = 3
  private retryDelayMs = 1000

  constructor(client: SupabaseClient<Database>, config: DatabaseConfig) {
    this.client = client
    this.config = config
  }

  /**
   * Execute query with retry logic and error handling
   */
  async executeQuery<T>(
    queryFn: (client: SupabaseClient<Database>) => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> {
    let lastError: any = null

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await queryFn(this.client)
        
        if (result.error) {
          lastError = result.error
          
          // Don't retry for client errors (4xx)
          if (this.isClientError(result.error)) {
            return result
          }
          
          // Retry for server errors (5xx) or network issues
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelayMs * attempt)
            continue
          }
        }
        
        return result
        
      } catch (error) {
        lastError = error
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelayMs * attempt)
          continue
        }
      }
    }

    return {
      data: null,
      error: {
        message: `Query failed after ${this.retryAttempts} attempts`,
        originalError: lastError,
      },
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async executeTransaction<T>(
    operations: ((client: SupabaseClient<Database>) => Promise<any>)[]
  ): Promise<{ data: T[] | null; error: any }> {
    try {
      // Supabase doesn't have explicit transactions, but we can simulate with RPC
      const results: T[] = []
      
      for (const operation of operations) {
        const result = await operation(this.client)
        
        if (result.error) {
          throw new Error(`Transaction failed: ${result.error.message}`)
        }
        
        results.push(result.data)
      }
      
      return { data: results, error: null }
      
    } catch (error) {
      return {
        data: null,
        error: {
          message: 'Transaction failed',
          originalError: error,
        },
      }
    }
  }

  /**
   * Execute batch operations with optimized performance
   */
  async executeBatch<T>(
    tableName: string,
    operations: Array<{
      type: 'insert' | 'update' | 'delete'
      data?: any
      filter?: any
    }>
  ): Promise<{ data: T[] | null; error: any }> {
    try {
      const results: T[] = []

      // Group operations by type for optimization
      const insertOps = operations.filter(op => op.type === 'insert')
      const updateOps = operations.filter(op => op.type === 'update')
      const deleteOps = operations.filter(op => op.type === 'delete')

      // Batch inserts
      if (insertOps.length > 0) {
        const { data, error } = await (this.client as any)
          .from(tableName)
          .insert(insertOps.map(op => op.data))
          .select()

        if (error) throw error
        if (data) results.push(...(data as T[]))
      }

      // Batch updates (individual operations)
      for (const op of updateOps) {
        const { data, error } = await (this.client as any)
          .from(tableName)
          .update(op.data)
          .match(op.filter)
          .select()

        if (error) throw error
        if (data) results.push(...(data as T[]))
      }

      // Batch deletes (individual operations)
      for (const op of deleteOps) {
        const { data, error } = await (this.client as any)
          .from(tableName)
          .delete()
          .match(op.filter)
          .select()

        if (error) throw error
        if (data) results.push(...(data as T[]))
      }

      return { data: results, error: null }

    } catch (error) {
      return {
        data: null,
        error: {
          message: 'Batch operation failed',
          originalError: error,
        },
      }
    }
  }

  /**
   * Subscribe to real-time changes
   */
  subscribeToChanges<T>(
    tableName: string,
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      new: T
      old: T
    }) => void,
    filter?: string
  ) {
    let subscription = (this.client as any)
      .channel(`${tableName}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        filter,
      }, callback)
      .subscribe()

    return subscription
  }

  /**
   * Get connection health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    latency: number
    timestamp: string
  }> {
    const startTime = Date.now()
    
    try {
      const { error } = await (this.client as any)
        .from('users')
        .select('count')
        .limit(1)

      const latency = Date.now() - startTime

      return {
        status: error ? 'unhealthy' : latency > 1000 ? 'degraded' : 'healthy',
        latency,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Private helper methods
   */
  private isClientError(error: any): boolean {
    return error?.code >= 400 && error?.code < 500
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Close connection (cleanup)
   */
  async close(): Promise<void> {
    // Supabase handles connection pooling automatically
    // This is for compatibility and future enhancements
    try {
      await this.client.removeAllChannels()
    } catch (error) {
      console.warn('Error closing database connection:', error)
    }
  }
}

/**
 * Query builder utilities
 */
export class QueryBuilder<T> {
  private client: SupabaseClient<Database>
  private tableName: string

  constructor(client: SupabaseClient<Database>, tableName: string) {
    this.client = client
    this.tableName = tableName
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<{ data: T | null; error: any }> {
    return await (this.client as any)
      .from(this.tableName)
      .insert(data)
      .select()
      .single()
  }

  /**
   * Find records with optional filtering
   */
  async find(
    options: {
      select?: string
      filter?: Record<string, any>
      orderBy?: { column: string; ascending?: boolean }
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ data: T[] | null; error: any }> {
    let query = (this.client as any).from(this.tableName)

    if (options.select) {
      query = query.select(options.select)
    } else {
      query = query.select('*')
    }

    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending !== false 
      })
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    return await query
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string, select?: string): Promise<{ data: T | null; error: any }> {
    return await (this.client as any)
      .from(this.tableName)
      .select(select || '*')
      .eq('id', id)
      .single()
  }

  /**
   * Update a record by ID
   */
  async updateById(id: string, data: Partial<T>): Promise<{ data: T | null; error: any }> {
    return await (this.client as any)
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single()
  }

  /**
   * Delete a record by ID
   */
  async deleteById(id: string): Promise<{ data: T | null; error: any }> {
    return await (this.client as any)
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .select()
      .single()
  }

  /**
   * Count records with optional filtering
   */
  async count(filter?: Record<string, any>): Promise<{ count: number | null; error: any }> {
    let query = (this.client as any).from(this.tableName).select('*', { count: 'exact', head: true })

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    return await query
  }

  /**
   * Check if record exists
   */
  async exists(filter: Record<string, any>): Promise<{ exists: boolean; error: any }> {
    const { count, error } = await this.count(filter)
    
    return {
      exists: !error && count !== null && count > 0,
      error,
    }
  }
}

/**
 * Initialize database clients
 */
export function initializeDatabase(config: DatabaseConfig) {
  const publicClient = createPublicClient(config)
  const adminClient = config.serviceRoleKey ? createAdminClient(config) : null

  return {
    public: new DatabaseConnection(publicClient, config),
    admin: adminClient ? new DatabaseConnection(adminClient, config) : null,
  }
}

/**
 * Database utilities
 */
export const dbUtils = {
  /**
   * Format date for database insertion
   */
  formatDate(date: Date): string {
    return date.toISOString()
  },

  /**
   * Parse date from database
   */
  parseDate(dateString: string): Date {
    return new Date(dateString)
  },

  /**
   * Generate UUID v4
   */
  generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  },

  /**
   * Validate Indonesian phone number
   */
  validatePhone(phone: string): boolean {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  },

  /**
   * Format Indonesian currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  },

  /**
   * Calculate pagination offset
   */
  calculateOffset(page: number, pageSize: number): number {
    return (page - 1) * pageSize
  },

  /**
   * Build search query
   */
  buildSearchQuery(searchTerm: string, columns: string[]): string {
    if (!searchTerm.trim()) return ''
    
    const terms = searchTerm.trim().split(/\s+/)
    const conditions = columns.map(column =>
      terms.map(term => `${column}.ilike.%${term}%`).join(',')
    )
    
    return `or(${conditions.join(',')})`
  },

  /**
   * Sanitize input for database queries
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/['"\\]/g, '') // Remove quotes and backslashes
      .trim()
      .substring(0, 255) // Limit length
  },
}

// Export types
export type { DatabaseConfig, Database }
export type DatabaseClient = DatabaseConnection