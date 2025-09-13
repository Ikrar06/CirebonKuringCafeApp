// Base API response interface
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errors?: ValidationError[]
  meta?: {
    page?: number
    limit?: number
    total?: number
    pages?: number
  }
}

// Validation error interface
export interface ValidationError {
  field: string
  message: string
  code?: string
  value?: any
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    pages: number
    has_next: boolean
    has_prev: boolean
  }
}

// Supabase realtime payload
export interface RealtimePayload<T = any> {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: T
  old?: T
  errors?: string[]
}

// API error response
export interface ApiError {
  code: string
  message: string
  details?: any
  status: number
  timestamp: string
}

// File upload response
export interface FileUploadResponse {
  success: boolean
  file_url?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  error?: string
}

// Bulk operation response
export interface BulkOperationResponse {
  success: boolean
  total: number
  processed: number
  successful: number
  failed: number
  errors: Array<{
    index: number
    error: string
    item?: any
  }>
}

// Search response
export interface SearchResponse<T> {
  query: string
  results: T[]
  total: number
  took: number // milliseconds
  suggestions?: string[]
  filters_applied?: Record<string, any>
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    database: 'up' | 'down'
    storage: 'up' | 'down' 
    realtime: 'up' | 'down'
    external_apis: 'up' | 'down'
  }
  response_time: number
}

// Statistics response
export interface StatsResponse {
  period: string
  stats: Record<string, number | string>
  comparison?: {
    previous_period: Record<string, number>
    percentage_change: Record<string, number>
  }
}

// Export response
export interface ExportResponse {
  export_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  download_url?: string
  expires_at?: string
  file_format: 'csv' | 'excel' | 'pdf' | 'json'
  created_at: string
}

// Webhook payload
export interface WebhookPayload {
  event: string
  data: any
  timestamp: string
  source: string
  webhook_id: string
  signature: string
}
