// User role enum
export enum UserRole {
  OWNER = 'owner',
  EMPLOYEE = 'employee',
  DEVICE_KASIR = 'device_kasir',
  DEVICE_DAPUR = 'device_dapur',
  DEVICE_PELAYAN = 'device_pelayan',
  DEVICE_STOK = 'device_stok'
}

// Employee status enum
export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave'
}

// Menu category enum
export enum MenuCategory {
  COFFEE = 'coffee',
  NON_COFFEE = 'non_coffee',
  FOOD = 'food',
  SNACK = 'snack',
  DESSERT = 'dessert',
  BEVERAGE = 'beverage'
}

// Menu status enum
export enum MenuStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

// Customization type enum
export enum CustomizationType {
  SINGLE_SELECT = 'single_select',
  MULTI_SELECT = 'multi_select',
  TEXT_INPUT = 'text_input',
  NUMBER_INPUT = 'number_input'
}

// Order status enum
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Payment method enum
export enum PaymentMethod {
  CASH = 'cash',
  QRIS = 'qris',
  BANK_TRANSFER = 'bank_transfer',
  DEBIT_CARD = 'debit_card',
  CREDIT_CARD = 'credit_card'
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  REFUNDED = 'refunded'
}

// Promo type enum
export enum PromoType {
  PERCENTAGE_DISCOUNT = 'percentage_discount',
  FIXED_DISCOUNT = 'fixed_discount',
  BUY_ONE_GET_ONE = 'buy_one_get_one',
  BUNDLE_DEAL = 'bundle_deal',
  HAPPY_HOUR = 'happy_hour',
  MEMBER_DISCOUNT = 'member_discount'
}

// Stock movement type enum
export enum StockMovementType {
  STOCK_IN = 'stock_in',
  STOCK_OUT = 'stock_out',
  WASTE = 'waste',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer'
}

// Notification type enum
export enum NotificationType {
  ORDER_RECEIVED = 'order_received',
  ORDER_READY = 'order_ready',
  PAYMENT_RECEIVED = 'payment_received',
  STOCK_LOW = 'stock_low',
  STOCK_OUT = 'stock_out',
  ITEM_EXPIRED = 'item_expired',
  EMPLOYEE_CLOCKIN = 'employee_clockin',
  EMPLOYEE_OVERTIME = 'employee_overtime',
  SYSTEM_ALERT = 'system_alert'
}

// Notification channel enum
export enum NotificationChannel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  IN_APP = 'in_app',
  SMS = 'sms'
}

// Table status enum - included in order.ts as literal type for consistency
// export enum TableStatus {
//   AVAILABLE = 'available',
//   OCCUPIED = 'occupied',
//   RESERVED = 'reserved',
//   CLEANING = 'cleaning'
// }

// Attendance status enum - included in user.ts as literal type
// export enum AttendanceStatus {
//   PRESENT = 'present',
//   LATE = 'late',
//   ABSENT = 'absent',
//   HALF_DAY = 'half_day'
// }

// Leave type enum - included in user.ts as literal type
// export enum LeaveType {
//   ANNUAL = 'annual',
//   SICK = 'sick',
//   EMERGENCY = 'emergency',
//   MATERNITY = 'maternity',
//   UNPAID = 'unpaid'
// }

// Device roles as const for strict typing
export const DEVICE_ROLES = ['kasir', 'dapur', 'pelayan', 'stok'] as const
export type DeviceRole = typeof DEVICE_ROLES[number]

// Order types as const
export const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery'] as const  
export type OrderType = typeof ORDER_TYPES[number]

// Priority levels as const
export const PRIORITY_LEVELS = ['low', 'normal', 'high', 'urgent'] as const
export type PriorityLevel = typeof PRIORITY_LEVELS[number]

// Stock status levels as const
export const STOCK_STATUS_LEVELS = ['in_stock', 'low_stock', 'out_of_stock', 'overstock'] as const
export type StockStatus = typeof STOCK_STATUS_LEVELS[number]

// Urgency levels as const
export const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export type UrgencyLevel = typeof URGENCY_LEVELS[number]

// Indonesian currency symbol
export const CURRENCY_SYMBOL = 'Rp'

// Tax rate (PPN 11%)
export const TAX_RATE = 0.11

// Default GPS accuracy in meters
export const GPS_ACCURACY_THRESHOLD = 100

// Default pagination limit
export const DEFAULT_PAGE_SIZE = 20