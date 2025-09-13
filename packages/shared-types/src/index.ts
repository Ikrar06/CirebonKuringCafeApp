// =============================================================================
// SHARED TYPES INDEX - CAFE MANAGEMENT SYSTEM
// =============================================================================
// This file exports all TypeScript types used across the monorepo
// Ensures consistency between apps (owner-dashboard, employee-portal, customer-web, staff-tablet)

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================
export * from './enums/index'

// =============================================================================
// MODEL INTERFACES
// =============================================================================

// User & Employee types
export * from './models/user'

// Menu & Ingredient types  
export * from './models/menu'

// Order & Payment types
export * from './models/order'

// Inventory & Stock types
export * from './models/inventory'

// =============================================================================
// API INTERFACES
// =============================================================================
export * from './interfaces/api'
export * from './interfaces/response'

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Database utility types
export type DbTimestamps = {
  created_at: string
  updated_at: string
}

export type DbEntity<T = {}> = T & {
  id: string
} & DbTimestamps

// Form input types
export type FormData<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>
export type UpdateFormData<T> = Partial<FormData<T>>

// Selection types
export type SelectOption<T = string> = {
  label: string
  value: T
  disabled?: boolean
}

// Filter types
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'not'

export type Filter<T = any> = {
  field: string
  operator: FilterOperator
  value: T
}

// Sort types
export type SortDirection = 'asc' | 'desc'
export type SortBy = {
  field: string
  direction: SortDirection
}

// Pagination types
export type PaginationParams = {
  page: number
  limit: number
  sort_by?: string
  sort_direction?: SortDirection
}

// =============================================================================
// SUPABASE TYPES
// =============================================================================

// Supabase policy context
export type PolicyContext = {
  user_id?: string
  user_role?: string
  device_role?: string
}

// Realtime subscription options
export type RealtimeOptions = {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  table?: string
  filter?: string
}

// =============================================================================
// FORM VALIDATION TYPES
// =============================================================================

export type ValidationRule = {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule[]
}

export type ValidationErrors<T> = {
  [K in keyof T]?: string[]
}

// =============================================================================
// DASHBOARD WIDGET TYPES
// =============================================================================

export type WidgetSize = 'small' | 'medium' | 'large' | 'full'
export type WidgetType = 'chart' | 'table' | 'metric' | 'list' | 'custom'

export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  size: WidgetSize
  position: { x: number; y: number }
  config: Record<string, any>
  data?: any
  is_visible: boolean
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface NotificationPreference {
  user_id: string
  channel: 'telegram' | 'email' | 'in_app'
  event_type: string
  is_enabled: boolean
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  recipient_id: string
  channel: 'telegram' | 'email' | 'in_app'
  is_read: boolean
  data?: Record<string, any>
  created_at: string
}

// =============================================================================
// SYSTEM TYPES
// =============================================================================

export interface SystemSetting {
  key: string
  value: string | number | boolean
  description?: string
  is_public: boolean
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  user_id?: string
  timestamp: string
}

// =============================================================================
// INDONESIAN SPECIFIC TYPES
// =============================================================================

export interface IndonesianAddress {
  street: string
  kelurahan: string
  kecamatan: string
  city: string
  province: string
  postal_code: string
}

export type IndonesianPhoneNumber = string // Format: +62xxxxxxxxx

// =============================================================================
// MOBILE APP TYPES (Flutter Staff Tablet)
// =============================================================================

export interface DeviceInfo {
  device_id: string
  model: string
  os_version: string
  app_version: string
  last_seen: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'id' | 'en'
  sound_enabled: boolean
  vibration_enabled: boolean
  auto_logout_minutes: number
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export const isOrderStatus = (value: string): value is keyof typeof import('./enums/index').OrderStatus => {
  return Object.values(import('./enums/index').OrderStatus).includes(value as any)
}

export const isPaymentMethod = (value: string): value is keyof typeof import('./enums/index').PaymentMethod => {
  return Object.values(import('./enums/index').PaymentMethod).includes(value as any)
}

export const isUserRole = (value: string): value is keyof typeof import('./enums/index').UserRole => {
  return Object.values(import('./enums/index').UserRole).includes(value as any)
}
