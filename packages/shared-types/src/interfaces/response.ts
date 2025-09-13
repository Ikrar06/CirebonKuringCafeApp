import { ApiResponse, PaginatedResponse } from './api'
import { 
  User, Employee, Attendance, Payroll,
  MenuItem, MenuCategoryType, Ingredient,
  Order, OrderItem, Payment, Table,
  Supplier, StockMovement, StockAlert,
  Promo, CashReconciliation
} from '../models'

// Auth responses
export interface LoginResponse extends ApiResponse<{
  user: User
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}> {}

export interface DeviceLoginResponse extends ApiResponse<{
  device: {
    id: string
    name: string
    role: string
  }
  access_token: string
}> {}

// User & Employee responses
export interface UserResponse extends ApiResponse<User> {}
export interface UsersResponse extends ApiResponse<PaginatedResponse<User>> {}
export interface EmployeeResponse extends ApiResponse<Employee> {}
export interface EmployeesResponse extends ApiResponse<PaginatedResponse<Employee>> {}
export interface AttendanceResponse extends ApiResponse<Attendance> {}
export interface PayrollResponse extends ApiResponse<Payroll> {}

// Menu responses
export interface MenuItemResponse extends ApiResponse<MenuItem> {}
export interface MenuItemsResponse extends ApiResponse<PaginatedResponse<MenuItem>> {}
export interface MenuCategoryResponse extends ApiResponse<MenuCategoryType> {}
export interface MenuCategoriesResponse extends ApiResponse<MenuCategoryType[]> {}
export interface IngredientResponse extends ApiResponse<Ingredient> {}
export interface IngredientsResponse extends ApiResponse<PaginatedResponse<Ingredient>> {}

// Order responses
export interface OrderResponse extends ApiResponse<Order> {}
export interface OrdersResponse extends ApiResponse<PaginatedResponse<Order>> {}
export interface OrderItemResponse extends ApiResponse<OrderItem> {}
export interface PaymentResponse extends ApiResponse<Payment> {}
export interface TableResponse extends ApiResponse<Table> {}
export interface TablesResponse extends ApiResponse<Table[]> {}

// Inventory responses
export interface SupplierResponse extends ApiResponse<Supplier> {}
export interface SuppliersResponse extends ApiResponse<PaginatedResponse<Supplier>> {}
export interface StockMovementResponse extends ApiResponse<StockMovement> {}
export interface StockMovementsResponse extends ApiResponse<PaginatedResponse<StockMovement>> {}
export interface StockAlertResponse extends ApiResponse<StockAlert> {}
export interface StockAlertsResponse extends ApiResponse<StockAlert[]> {}

// Promo responses
export interface PromoResponse extends ApiResponse<Promo> {}
export interface PromosResponse extends ApiResponse<PaginatedResponse<Promo>> {}

// Analytics & Reports responses
export interface DailySalesResponse extends ApiResponse<{
  date: string
  total_orders: number
  total_revenue: number
  top_items: Array<{
    name: string
    quantity: number
    revenue: number
  }>
}> {}

export interface InventoryReportResponse extends ApiResponse<{
  total_value: number
  low_stock_count: number
  expired_items: number
  top_consumed: Array<{
    name: string
    consumption: number
  }>
}> {}

// Cash reconciliation response
export interface CashReconciliationResponse extends ApiResponse<CashReconciliation> {}

// Dashboard responses
export interface OwnerDashboardResponse extends ApiResponse<{
  today_stats: {
    orders: number
    revenue: number
    customers: number
    avg_order_value: number
  }
  recent_orders: Order[]
  low_stock_alerts: StockAlert[]
  pending_payments: Payment[]
}> {}

export interface KitchenDashboardResponse extends ApiResponse<{
  pending_orders: Order[]
  preparing_orders: Order[]
  ready_orders: Order[]
  average_prep_time: number
}> {}

export interface CashierDashboardResponse extends ApiResponse<{
  pending_payments: Payment[]
  today_sales: number
  cash_on_hand: number
  tables_status: Table[]
}> {}
