import { StockMovementType } from '../enums/index'
import { Ingredient } from './menu'

// Supplier information
export interface Supplier {
  id: string
  name: string
  contact_person: string
  phone: string
  email?: string
  address: string
  payment_terms: string
  delivery_days: number[]
  minimum_order_amount: number
  is_active: boolean
  rating: number
  notes?: string
  created_at: string
  updated_at: string
}

// Purchase order
export interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  order_date: string
  expected_delivery_date: string
  actual_delivery_date?: string
  status: 'draft' | 'sent' | 'confirmed' | 'partially_delivered' | 'delivered' | 'cancelled'
  subtotal: number
  tax_amount: number
  shipping_cost: number
  total_amount: number
  notes?: string
  created_by: string
  approved_by?: string
  received_by?: string
  created_at: string
  updated_at: string
  
  // Relations
  supplier?: Supplier
  items?: PurchaseOrderItem[]
}

// Purchase order item
export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  ingredient_id: string
  ingredient_name: string
  unit: string
  quantity_ordered: number
  quantity_received: number
  unit_price: number
  total_price: number
  expiry_date?: string
  batch_number?: string
  quality_notes?: string
  created_at: string
  updated_at: string
  
  // Relations
  ingredient?: Ingredient
}

// Stock movement (in/out transactions)
export interface StockMovement {
  id: string
  ingredient_id: string
  type: StockMovementType
  quantity: number
  unit_cost: number
  total_cost: number
  reference_type: 'purchase_order' | 'order_consumption' | 'waste' | 'adjustment' | 'transfer'
  reference_id?: string
  batch_number?: string
  expiry_date?: string
  reason?: string
  notes?: string
  performed_by: string
  created_at: string
  updated_at: string
  
  // Relations
  ingredient?: Ingredient
  performed_by_user?: {
    id: string
    name: string
  }
}

// Stock batch for FIFO tracking
export interface StockBatch {
  id: string
  ingredient_id: string
  batch_number: string
  quantity_received: number
  quantity_remaining: number
  unit_cost: number
  expiry_date?: string
  purchase_order_id?: string
  received_date: string
  status: 'active' | 'expired' | 'consumed'
  created_at: string
  updated_at: string
  
  // Relations
  ingredient?: Ingredient
  purchase_order?: PurchaseOrder
}

// Inventory valuation
export interface InventoryValuation {
  ingredient_id: string
  ingredient_name: string
  current_stock: number
  unit_cost: number
  total_value: number
  minimum_stock: number
  maximum_stock: number
  reorder_point: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock'
  days_until_expiry?: number
  last_movement_date?: string
}

// Stock alert
export interface StockAlert {
  id: string
  ingredient_id: string
  ingredient_name: string
  alert_type: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired'
  current_stock: number
  minimum_stock: number
  expiry_date?: string
  days_until_expiry?: number
  is_acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  created_at: string
  updated_at: string
}

// Stock opname (physical inventory count)
export interface StockOpname {
  id: string
  opname_number: string
  date: string
  status: 'draft' | 'in_progress' | 'completed' | 'approved'
  total_items: number
  items_counted: number
  total_variance: number
  total_value_variance: number
  notes?: string
  performed_by: string
  approved_by?: string
  created_at: string
  updated_at: string
  
  // Relations
  items?: StockOpnameItem[]
}

// Stock opname item
export interface StockOpnameItem {
  id: string
  stock_opname_id: string
  ingredient_id: string
  ingredient_name: string
  system_stock: number
  physical_stock: number
  variance: number
  unit_cost: number
  value_variance: number
  notes?: string
  counted_by: string
  created_at: string
  updated_at: string
  
  // Relations
  ingredient?: Ingredient
}

// Waste tracking
export interface WasteRecord {
  id: string
  ingredient_id: string
  ingredient_name: string
  quantity: number
  unit_cost: number
  total_value: number
  waste_type: 'expired' | 'damaged' | 'spoiled' | 'over_preparation' | 'accident'
  reason: string
  batch_number?: string
  expiry_date?: string
  reported_by: string
  approved_by?: string
  created_at: string
  updated_at: string
  
  // Relations
  ingredient?: Ingredient
}

// Recipe cost analysis
export interface RecipeCostAnalysis {
  menu_item_id: string
  menu_item_name: string
  recipe_ingredients: Array<{
    ingredient_id: string
    ingredient_name: string
    quantity: number
    unit: string
    unit_cost: number
    total_cost: number
  }>
  total_ingredient_cost: number
  labor_cost: number
  overhead_cost: number
  total_cost: number
  selling_price: number
  profit_amount: number
  profit_margin: number
  suggested_price: number
  cost_variance: number
}

// Inventory analytics
export interface InventoryAnalytics {
  total_value: number
  total_items: number
  low_stock_items: number
  out_of_stock_items: number
  expired_items: number
  expiring_soon_items: number
  inventory_turnover: number
  average_days_to_expire: number
  waste_percentage: number
  top_consumed_ingredients: Array<{
    ingredient_id: string
    name: string
    consumption_amount: number
  }>
}

// Supplier performance
export interface SupplierPerformance {
  supplier_id: string
  supplier_name: string
  total_orders: number
  total_value: number
  on_time_deliveries: number
  on_time_percentage: number
  average_delivery_days: number
  quality_rating: number
  price_competitiveness: number
  last_order_date: string
}

// Inventory filters
export interface InventoryFilters {
  supplier_id?: string
  category?: string
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock'
  expiry_status?: 'fresh' | 'expiring_soon' | 'expired'
  date_from?: string
  date_to?: string
  movement_type?: StockMovementType
  search_query?: string
}

// Stock prediction
export interface StockPrediction {
  ingredient_id: string
  ingredient_name: string
  current_stock: number
  predicted_consumption_7days: number
  predicted_consumption_30days: number
  suggested_reorder_date: string
  suggested_reorder_quantity: number
  confidence_score: number
  factors: Array<{
    factor: string
    weight: number
    impact: 'positive' | 'negative' | 'neutral'
  }>
}

// Automatic reorder suggestion
export interface ReorderSuggestion {
  ingredient_id: string
  ingredient_name: string
  current_stock: number
  minimum_stock: number
  suggested_quantity: number
  preferred_supplier_id?: string
  estimated_cost: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  created_at: string
}

// Inventory import/export
export interface InventoryImport {
  ingredients: Array<{
    name: string
    unit: string
    cost_per_unit: number
    current_stock: number
    minimum_stock: number
    maximum_stock: number
    expiry_date?: string
    supplier_name?: string
    barcode?: string
  }>
}

export interface InventoryImportResult {
  success: boolean
  imported_count: number
  updated_count: number
  failed_count: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}
