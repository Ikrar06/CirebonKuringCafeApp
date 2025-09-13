/**
 * Daily Report Analytics
 * 
 * Core business logic for generating comprehensive daily reports
 * Analyzes sales, inventory, employee performance, and customer metrics
 */

import { supabaseAdmin } from '../_shared/supabase-client'

// Report interfaces
interface DailyReportOptions {
  include_sections?: string[]
  user_id?: string
  compare_previous_day?: boolean
  include_predictions?: boolean
}

interface DailyMetrics {
  total_revenue: number
  total_orders: number
  average_order_value: number
  unique_customers: number
  customer_satisfaction: number
  operational_efficiency: number
  gross_profit: number
  net_profit: number
}

interface SalesSummary {
  total_revenue: number
  total_orders: number
  average_order_value: number
  payment_methods: {
    cash: { count: number; amount: number }
    qris: { count: number; amount: number }
    transfer: { count: number; amount: number }
  }
  hourly_breakdown: Array<{
    hour: number
    revenue: number
    orders: number
  }>
  top_selling_items: Array<{
    menu_item_id: string
    name: string
    quantity_sold: number
    revenue: number
  }>
  category_performance: Array<{
    category: string
    revenue: number
    orders: number
    profit_margin: number
  }>
}

interface InventoryStatus {
  total_ingredients: number
  low_stock_items: number
  out_of_stock_items: number
  critical_alerts: Array<{
    ingredient_id: string
    name: string
    current_stock: number
    minimum_stock: number
    days_remaining: number
  }>
  waste_summary: {
    total_waste_value: number
    waste_percentage: number
    top_waste_items: Array<{
      ingredient_name: string
      waste_amount: number
      waste_value: number
    }>
  }
}

interface EmployeePerformance {
  total_staff_on_duty: number
  attendance_rate: number
  overtime_hours: number
  performance_metrics: Array<{
    employee_id: string
    name: string
    position: string
    hours_worked: number
    orders_handled?: number
    efficiency_score: number
  }>
  shift_coverage: {
    morning: number
    afternoon: number
    evening: number
  }
}

interface CustomerAnalytics {
  unique_customers: number
  new_customers: number
  repeat_customers: number
  average_rating: number
  satisfaction_distribution: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  peak_hours: Array<{
    hour: number
    customer_count: number
  }>
  table_turnover: {
    average_duration: number
    total_seatings: number
    peak_occupancy: number
  }
}

// ===========================================
// MAIN REPORT GENERATION FUNCTION
// ===========================================

/**
 * Generate comprehensive daily report
 */
export async function generateDailyReport(
  reportDate: string,
  options: DailyReportOptions = {}
): Promise<{
  success: boolean
  report?: any
  error?: string
}> {
  try {
    const startDate = `${reportDate} 00:00:00`
    const endDate = `${reportDate} 23:59:59`

    // Initialize report structure
    const report: any = {
      report_id: `daily_${reportDate}_${Date.now()}`,
      report_type: 'daily',
      period: {
        start_date: reportDate,
        end_date: reportDate
      },
      sections: {} as any,
      metrics: {} as DailyMetrics,
      insights: [] as string[],
      recommendations: [] as string[],
      generated_at: new Date().toISOString(),
      generated_by: options.user_id || 'system'
    }

    // Generate requested sections
    const sections = options.include_sections || ['sales', 'inventory', 'employees']

    if (sections.includes('sales')) {
      report.sections.sales_summary = await generateSalesSummary(startDate, endDate)
    }

    if (sections.includes('inventory')) {
      report.sections.inventory_status = await generateInventoryStatus(reportDate)
    }

    if (sections.includes('employees')) {
      report.sections.employee_performance = await generateEmployeePerformance(startDate, endDate)
    }

    if (sections.includes('customers')) {
      report.sections.customer_analytics = await generateCustomerAnalytics(startDate, endDate)
    }

    // Calculate overall metrics
    report.metrics = await calculateDailyMetrics(
      report.sections.sales_summary,
      report.sections.inventory_status,
      report.sections.employee_performance,
      report.sections.customer_analytics
    )

    // Generate insights and recommendations
    report.insights = generateInsights(report.sections, report.metrics)
    report.recommendations = generateRecommendations(report.sections, report.metrics)

    // Add comparison with previous day if requested
    if (options.compare_previous_day) {
      const previousDate = new Date(reportDate)
      previousDate.setDate(previousDate.getDate() - 1)
      const comparison = await generateDayComparison(
        reportDate,
        previousDate.toISOString().split('T')[0]
      )
      report.comparison = comparison
    }

    return {
      success: true,
      report
    }

  } catch (error) {
    console.error('Error generating daily report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Report generation failed'
    }
  }
}

// ===========================================
// SECTION GENERATORS
// ===========================================

/**
 * Generate sales summary section
 */
async function generateSalesSummary(startDate: string, endDate: string): Promise<SalesSummary> {
  // Get all orders for the day
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select(`
      id, total_amount, created_at, payment_method, status,
      order_items (
        quantity, unit_price, 
        menu_item:menu_items (id, name, category)
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .in('status', ['completed', 'served'])

  if (ordersError) {
    throw new Error('Failed to fetch orders: ' + ordersError.message)
  }

  const validOrders = orders || []

  // Calculate basic metrics
  const totalRevenue = validOrders.reduce((sum, order) => sum + order.total_amount, 0)
  const totalOrders = validOrders.length
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Payment method breakdown
  const paymentMethods = {
    cash: { count: 0, amount: 0 },
    qris: { count: 0, amount: 0 },
    transfer: { count: 0, amount: 0 }
  }

  validOrders.forEach(order => {
    const method = order.payment_method || 'cash'
    if (paymentMethods[method as keyof typeof paymentMethods]) {
      paymentMethods[method as keyof typeof paymentMethods].count++
      paymentMethods[method as keyof typeof paymentMethods].amount += order.total_amount
    }
  })

  // Hourly breakdown
  const hourlyData = new Array(24).fill(0).map((_, hour) => ({
    hour,
    revenue: 0,
    orders: 0
  }))

  validOrders.forEach(order => {
    const hour = new Date(order.created_at).getHours()
    hourlyData[hour].revenue += order.total_amount
    hourlyData[hour].orders++
  })

  // Top selling items
  const itemSales = new Map<string, {
    name: string
    quantity_sold: number
    revenue: number
  }>()

  validOrders.forEach(order => {
    order.order_items?.forEach(item => {
      if (!item.menu_item) return
      
      const key = item.menu_item.id
      const existing = itemSales.get(key) || {
        name: item.menu_item.name,
        quantity_sold: 0,
        revenue: 0
      }
      
      existing.quantity_sold += item.quantity
      existing.revenue += item.quantity * item.unit_price
      itemSales.set(key, existing)
    })
  })

  const topSellingItems = Array.from(itemSales.entries())
    .map(([id, data]) => ({ menu_item_id: id, ...data }))
    .sort((a, b) => b.quantity_sold - a.quantity_sold)
    .slice(0, 10)

  // Category performance
  const categoryData = new Map<string, {
    revenue: number
    orders: number
    items_sold: number
  }>()

  validOrders.forEach(order => {
    order.order_items?.forEach(item => {
      if (!item.menu_item) return
      
      const category = item.menu_item.category
      const existing = categoryData.get(category) || {
        revenue: 0,
        orders: 0,
        items_sold: 0
      }
      
      existing.revenue += item.quantity * item.unit_price
      existing.items_sold += item.quantity
      categoryData.set(category, existing)
    })
  })

  // Count unique orders per category
  validOrders.forEach(order => {
    const categories = new Set(
      order.order_items?.map(item => item.menu_item?.category).filter(Boolean) as string[] || []
    )
    categories.forEach((category: string) => {
      if (categoryData.has(category)) {
        categoryData.get(category)!.orders++
      }
    })
  })

  const categoryPerformance = Array.from(categoryData.entries()).map(([category, data]) => ({
    category,
    revenue: data.revenue,
    orders: data.orders,
    profit_margin: 65 // Default margin - could be calculated from actual costs
  }))

  return {
    total_revenue: totalRevenue,
    total_orders: totalOrders,
    average_order_value: averageOrderValue,
    payment_methods: paymentMethods,
    hourly_breakdown: hourlyData,
    top_selling_items: topSellingItems,
    category_performance: categoryPerformance
  }
}

/**
 * Generate inventory status section
 */
async function generateInventoryStatus(reportDate: string): Promise<InventoryStatus> {
  // Get current inventory status
  const { data: ingredients, error: ingredientsError } = await supabaseAdmin
    .from('ingredients')
    .select('id, name, current_stock, minimum_stock, cost_per_unit, unit')
    .eq('is_active', true)

  if (ingredientsError) {
    throw new Error('Failed to fetch ingredients: ' + ingredientsError.message)
  }

  const allIngredients = ingredients || []
  const lowStockItems = allIngredients.filter(ing => ing.current_stock <= ing.minimum_stock)
  const outOfStockItems = allIngredients.filter(ing => ing.current_stock <= 0)

  // Critical alerts (items that will run out soon)
  const criticalAlerts = allIngredients
    .filter(ing => {
      const daysRemaining = calculateDaysRemaining(ing.id, ing.current_stock)
      return daysRemaining <= 7 && daysRemaining > 0
    })
    .map(ing => ({
      ingredient_id: ing.id,
      name: ing.name,
      current_stock: ing.current_stock,
      minimum_stock: ing.minimum_stock,
      days_remaining: calculateDaysRemaining(ing.id, ing.current_stock)
    }))

  // Waste data would come from inventory adjustments if available
  const wasteData: any[] = []
  const totalWasteValue = wasteData.reduce((sum, waste) => sum + waste.total_value, 0)
  const totalInventoryValue = allIngredients.reduce(
    (sum, ing) => sum + (ing.current_stock * ing.cost_per_unit), 0
  )
  const wastePercentage = totalInventoryValue > 0 ? (totalWasteValue / totalInventoryValue) * 100 : 0

  const topWasteItems = wasteData
    .map(waste => ({
      ingredient_name: waste.ingredient_name,
      waste_amount: waste.quantity,
      waste_value: waste.total_value
    }))
    .sort((a, b) => b.waste_value - a.waste_value)
    .slice(0, 5)

  return {
    total_ingredients: allIngredients.length,
    low_stock_items: lowStockItems.length,
    out_of_stock_items: outOfStockItems.length,
    critical_alerts: criticalAlerts,
    waste_summary: {
      total_waste_value: totalWasteValue,
      waste_percentage: wastePercentage,
      top_waste_items: topWasteItems
    }
  }
}

/**
 * Generate employee performance section
 */
async function generateEmployeePerformance(startDate: string, endDate: string): Promise<EmployeePerformance> {
  // Get attendance records for the day
  const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
    .from('attendance')
    .select(`
      employee_id, clock_in_time, clock_out_time, overtime_hours,
      employee:employees (id, full_name, position)
    `)
    .gte('date', startDate.split(' ')[0])
    .lte('date', endDate.split(' ')[0])

  if (attendanceError) {
    throw new Error('Failed to fetch attendance: ' + attendanceError.message)
  }

  const attendance = attendanceRecords || []
  const totalStaff = attendance.length
  const totalOvertimeHours = attendance.reduce((sum, record) => sum + (record.overtime_hours || 0), 0)

  // Calculate shift coverage
  const shiftCoverage = {
    morning: 0, // 06:00 - 14:00
    afternoon: 0, // 14:00 - 22:00  
    evening: 0 // 22:00 - 06:00
  }

  attendance.forEach(record => {
    if (record.clock_in_time) {
      const clockInHour = new Date(`${startDate.split(' ')[0]}T${record.clock_in_time}`).getHours()
      if (clockInHour >= 6 && clockInHour < 14) shiftCoverage.morning++
      else if (clockInHour >= 14 && clockInHour < 22) shiftCoverage.afternoon++
      else shiftCoverage.evening++
    }
  })

  // Performance metrics per employee
  const performanceMetrics = await Promise.all(
    attendance.map(async record => {
      const hoursWorked = calculateHoursWorked(record.clock_in_time, record.clock_out_time)
      
      // Get orders handled (for kasir positions)
      const ordersHandled = record.employee?.position === 'kasir' 
        ? await getOrdersHandledByEmployee(record.employee_id, startDate, endDate)
        : undefined

      const efficiencyScore = calculateEfficiencyScore(
        record.employee?.position || '',
        hoursWorked,
        ordersHandled
      )

      return {
        employee_id: record.employee_id,
        name: record.employee?.full_name || 'Unknown',
        position: record.employee?.position || 'Unknown',
        hours_worked: hoursWorked,
        orders_handled: ordersHandled,
        efficiency_score: efficiencyScore
      }
    })
  )

  const attendanceRate = totalStaff > 0 ? 
    (attendance.filter(r => r.clock_in_time).length / totalStaff) * 100 : 0

  return {
    total_staff_on_duty: totalStaff,
    attendance_rate: attendanceRate,
    overtime_hours: totalOvertimeHours,
    performance_metrics: performanceMetrics,
    shift_coverage: shiftCoverage
  }
}

/**
 * Generate customer analytics section
 */
async function generateCustomerAnalytics(startDate: string, endDate: string): Promise<CustomerAnalytics> {
  // Get orders with customer information
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id, customer_name, table_number, created_at, completed_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .in('status', ['completed', 'served'])

  if (ordersError) {
    throw new Error('Failed to fetch customer orders: ' + ordersError.message)
  }

  const validOrders = orders || []
  
  // Unique customers (based on customer_name - simplified)
  const uniqueCustomers = new Set(
    validOrders.map(order => order.customer_name).filter(Boolean)
  ).size

  // Peak hours analysis
  const hourlyCustomers = new Array(24).fill(0)
  validOrders.forEach(order => {
    const hour = new Date(order.created_at).getHours()
    hourlyCustomers[hour]++
  })

  const peakHours = hourlyCustomers
    .map((count, hour) => ({ hour, customer_count: count }))
    .filter(item => item.customer_count > 0)
    .sort((a, b) => b.customer_count - a.customer_count)
    .slice(0, 3)

  // Table turnover calculations
  const tableOrders = validOrders.filter(order => order.table_number && order.completed_at)
  const totalDuration = tableOrders.reduce((sum, order) => {
    const start = new Date(order.created_at).getTime()
    const end = new Date(order.completed_at!).getTime()
    return sum + (end - start)
  }, 0)

  const averageDuration = tableOrders.length > 0 
    ? Math.round(totalDuration / tableOrders.length / (1000 * 60)) // minutes
    : 0

  // Customer ratings would be handled by application if available
  const validRatings: any[] = []
  const averageRating = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length
    : 0

  const satisfactionDistribution = {
    excellent: validRatings.filter(r => r.rating >= 4.5).length,
    good: validRatings.filter(r => r.rating >= 3.5 && r.rating < 4.5).length,
    fair: validRatings.filter(r => r.rating >= 2.5 && r.rating < 3.5).length,
    poor: validRatings.filter(r => r.rating < 2.5).length
  }

  return {
    unique_customers: uniqueCustomers,
    new_customers: 0, // Would need customer tracking system
    repeat_customers: 0, // Would need customer tracking system
    average_rating: averageRating,
    satisfaction_distribution: satisfactionDistribution,
    peak_hours: peakHours,
    table_turnover: {
      average_duration: averageDuration,
      total_seatings: tableOrders.length,
      peak_occupancy: Math.max(...hourlyCustomers)
    }
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Calculate overall daily metrics
 */
async function calculateDailyMetrics(
  salesSummary: SalesSummary,
  inventoryStatus: InventoryStatus,
  employeePerformance: EmployeePerformance,
  customerAnalytics: CustomerAnalytics
): Promise<DailyMetrics> {
  // Calculate gross profit (simplified - using average 65% margin)
  const grossProfit = salesSummary.total_revenue * 0.35 // 35% cost of goods

  // Calculate operational efficiency
  const operationalEfficiency = calculateOperationalEfficiency(
    employeePerformance,
    inventoryStatus,
    salesSummary
  )

  return {
    total_revenue: salesSummary.total_revenue,
    total_orders: salesSummary.total_orders,
    average_order_value: salesSummary.average_order_value,
    unique_customers: customerAnalytics.unique_customers,
    customer_satisfaction: customerAnalytics.average_rating,
    operational_efficiency: operationalEfficiency,
    gross_profit: grossProfit,
    net_profit: grossProfit - (employeePerformance.overtime_hours * 50000) // Simplified labor cost
  }
}

/**
 * Generate insights from report data
 */
function generateInsights(sections: any, metrics: DailyMetrics): string[] {
  const insights: string[] = []

  // Revenue insights
  if (metrics.total_revenue > 0) {
    insights.push(`Generated ${formatCurrency(metrics.total_revenue)} in revenue from ${metrics.total_orders} orders`)
    
    if (metrics.average_order_value > 50000) {
      insights.push('Above-average order value indicates successful upselling')
    }
  }

  // Inventory insights
  if (sections.inventory_status) {
    const inventory = sections.inventory_status
    if (inventory.critical_alerts.length > 0) {
      insights.push(`${inventory.critical_alerts.length} ingredients need immediate reordering`)
    }
    
    if (inventory.waste_summary.waste_percentage > 5) {
      insights.push('Waste percentage is above optimal threshold (5%)')
    }
  }

  // Employee insights
  if (sections.employee_performance) {
    const employees = sections.employee_performance
    if (employees.attendance_rate < 90) {
      insights.push('Employee attendance rate below target (90%)')
    }
    
    if (employees.overtime_hours > employees.total_staff_on_duty * 2) {
      insights.push('High overtime hours may indicate understaffing')
    }
  }

  return insights
}

/**
 * Generate recommendations based on report data
 */
function generateRecommendations(sections: any, metrics: DailyMetrics): string[] {
  const recommendations: string[] = []

  // Sales recommendations
  if (sections.sales_summary) {
    const sales = sections.sales_summary
    const peakHour = sales.hourly_breakdown.reduce((max, hour) => 
      hour.revenue > max.revenue ? hour : max
    )
    
    recommendations.push(`Peak sales at ${peakHour.hour}:00 - consider promotional activities during slow hours`)
    
    if (sales.top_selling_items.length > 0) {
      recommendations.push(`Ensure adequate stock for top seller: ${sales.top_selling_items[0].name}`)
    }
  }

  // Inventory recommendations
  if (sections.inventory_status?.critical_alerts.length > 0) {
    recommendations.push('Process urgent ingredient reorders to prevent stockouts')
  }

  // Customer satisfaction recommendations
  if (metrics.customer_satisfaction < 4.0) {
    recommendations.push('Investigate and address factors affecting customer satisfaction')
  }

  return recommendations
}

// Utility functions
function calculateDaysRemaining(ingredientId: string, currentStock: number): number {
  // Simplified calculation - would use consumption rate from historical data
  return Math.floor(currentStock / 10) // Assume 10 units consumed per day
}

function calculateHoursWorked(clockIn?: string, clockOut?: string): number {
  if (!clockIn || !clockOut) return 0
  
  const start = new Date(`2000-01-01T${clockIn}`)
  const end = new Date(`2000-01-01T${clockOut}`)
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

async function getOrdersHandledByEmployee(employeeId: string, startDate: string, endDate: string): Promise<number> {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('processed_by', employeeId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
  
  return orders?.length || 0
}

function calculateEfficiencyScore(position: string, hoursWorked: number, ordersHandled?: number): number {
  // Simplified efficiency calculation
  switch (position) {
    case 'kasir':
      return ordersHandled && hoursWorked > 0 ? Math.min(100, (ordersHandled / hoursWorked) * 5) : 50
    case 'dapur':
      return hoursWorked >= 8 ? 85 : hoursWorked * 10
    default:
      return 75 // Default score
  }
}

function calculateOperationalEfficiency(
  employeePerformance: EmployeePerformance,
  inventoryStatus: InventoryStatus,
  salesSummary: SalesSummary
): number {
  // Composite efficiency score (0-100)
  const attendanceScore = employeePerformance.attendance_rate
  const inventoryScore = Math.max(0, 100 - (inventoryStatus.low_stock_items * 10))
  const salesScore = salesSummary.total_orders > 0 ? Math.min(100, salesSummary.total_orders * 2) : 0
  
  return Math.round((attendanceScore + inventoryScore + salesScore) / 3)
}

async function generateDayComparison(currentDate: string, previousDate: string): Promise<any> {
  // Generate comparison with previous day
  const previousReport = await generateDailyReport(previousDate, { include_sections: ['sales'] })
  
  if (!previousReport.success || !previousReport.report) {
    return { comparison_available: false }
  }
  
  return {
    comparison_available: true,
    revenue_change: 0, // Calculate percentage change
    orders_change: 0,
    efficiency_change: 0
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}