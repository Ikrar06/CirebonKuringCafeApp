import { OrderStatus, PaymentMethod, PaymentStatus, PromoType } from '../enums/index'
import { CustomizedMenuItem, OrderCustomization } from './menu'

// Table management
export interface Table {
  id: string
  table_number: string
  capacity: number
  qr_code: string
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
  current_order_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Order base
export interface Order {
  id: string
  order_number: string
  table_id?: string
  customer_name?: string
  customer_phone?: string
  order_type: 'dine_in' | 'takeaway' | 'delivery'
  status: OrderStatus
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes?: string
  estimated_preparation_time: number // minutes
  actual_preparation_time?: number // minutes
  created_at: string
  updated_at: string
  
  // Relations
  table?: Table
  items?: OrderItem[]
  payments?: Payment[]
  applied_promos?: AppliedPromo[]
}

// Individual order item
export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  menu_item_name: string
  menu_item_image?: string
  quantity: number
  unit_price: number
  total_price: number
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  special_instructions?: string
  customizations: OrderCustomization[]
  started_preparing_at?: string
  ready_at?: string
  served_at?: string
  created_at: string
  updated_at: string
}

// Payment information
export interface Payment {
  id: string
  order_id: string
  payment_method: PaymentMethod
  amount: number
  status: PaymentStatus
  reference_number?: string
  proof_image_url?: string
  verified_by?: string
  verified_at?: string
  rejection_reason?: string
  external_transaction_id?: string
  created_at: string
  updated_at: string
}

// Promo/Discount system
export interface Promo {
  id: string
  name: string
  description: string
  type: PromoType
  discount_value: number
  minimum_order_amount: number
  maximum_discount_amount?: number
  applicable_categories: string[]
  applicable_menu_items: string[]
  start_date: string
  end_date: string
  usage_limit?: number
  usage_per_customer?: number
  current_usage: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Applied promo to order
export interface AppliedPromo {
  id: string
  order_id: string
  promo_id: string
  promo_name: string
  promo_type: PromoType
  discount_amount: number
  created_at: string
  updated_at: string
  
  // Relations
  promo?: Promo
}

// Order with all relations loaded
export interface OrderWithDetails extends Order {
  table: Table
  items: OrderItem[]
  payments: Payment[]
  applied_promos: AppliedPromo[]
}

// Cart item (before placing order)
export interface CartItem {
  menu_item_id: string
  menu_item_name: string
  menu_item_price: number
  menu_item_image?: string
  quantity: number
  customizations: OrderCustomization[]
  unit_price: number // Base price + customization modifiers
  total_price: number // unit_price * quantity
  special_instructions?: string
}

// Shopping cart
export interface Cart {
  table_id?: string
  items: CartItem[]
  subtotal: number
  applicable_promos: Promo[]
  selected_promo_id?: string
  discount_amount: number
  tax_amount: number
  total_amount: number
  estimated_prep_time: number
}

// Order summary for kitchen display
export interface KitchenOrder {
  order_id: string
  order_number: string
  table_number?: string
  customer_name?: string
  order_type: 'dine_in' | 'takeaway' | 'delivery'
  status: OrderStatus
  items: KitchenOrderItem[]
  total_prep_time: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  started_at?: string
  estimated_ready_at?: string
}

// Kitchen order item
export interface KitchenOrderItem {
  item_id: string
  menu_item_name: string
  quantity: number
  customizations: OrderCustomization[]
  special_instructions?: string
  status: 'pending' | 'preparing' | 'ready'
  prep_time: number
  started_preparing_at?: string
  ready_at?: string
}

// Order analytics
export interface OrderAnalytics {
  total_orders: number
  total_revenue: number
  average_order_value: number
  orders_by_status: Record<OrderStatus, number>
  orders_by_type: Record<'dine_in' | 'takeaway' | 'delivery', number>
  peak_hours: Array<{ hour: number; order_count: number }>
  popular_items: Array<{ menu_item_id: string; name: string; order_count: number }>
  average_preparation_time: number
}

// Daily sales summary
export interface DailySales {
  date: string
  total_orders: number
  total_revenue: number
  cash_sales: number
  digital_sales: number
  tax_collected: number
  discounts_given: number
  refunds_issued: number
  average_order_value: number
  peak_hour: string
  top_selling_item: string
}

// Order filters for listing
export interface OrderFilters {
  status?: OrderStatus
  order_type?: 'dine_in' | 'takeaway' | 'delivery'
  table_id?: string
  date_from?: string
  date_to?: string
  customer_name?: string
  order_number?: string
  payment_method?: PaymentMethod
  payment_status?: PaymentStatus
  min_amount?: number
  max_amount?: number
}

// Order creation request
export interface CreateOrderRequest {
  table_id?: string
  customer_name?: string
  customer_phone?: string
  order_type: 'dine_in' | 'takeaway' | 'delivery'
  items: Array<{
    menu_item_id: string
    quantity: number
    customizations: OrderCustomization[]
    special_instructions?: string
  }>
  promo_id?: string
  notes?: string
}

// Order status update
export interface OrderStatusUpdate {
  order_id: string
  status: OrderStatus
  notes?: string
  updated_by: string
}

// Payment verification
export interface PaymentVerification {
  payment_id: string
  is_verified: boolean
  verified_by: string
  rejection_reason?: string
  notes?: string
}

// Cash reconciliation
export interface CashReconciliation {
  id: string
  date: string
  opening_balance: number
  cash_sales: number
  cash_received: number
  cash_paid_out: number
  expected_closing_balance: number
  actual_closing_balance: number
  variance: number
  denominations: Record<string, number> // "50000": 5, "20000": 10, etc
  reconciled_by: string
  notes?: string
  created_at: string
  updated_at: string
}

// Real-time order updates
export interface OrderUpdate {
  type: 'order_created' | 'order_updated' | 'item_status_changed' | 'payment_received'
  order_id: string
  data: Partial<Order>
  timestamp: string
}
