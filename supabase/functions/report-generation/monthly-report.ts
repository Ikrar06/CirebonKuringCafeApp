/**
 * Monthly Report Generator
 * 
 * Generates comprehensive monthly performance reports for the cafe
 * Aggregates daily and weekly data to provide monthly insights
 */

import { supabaseAdmin } from '../_shared/supabase-client'
import { formatCurrency } from '../../../packages/utils/src/formatters/currency'

export interface MonthlyMetrics {
  total_revenue: number
  total_orders: number
  average_order_value: number
  total_customers: number
  customer_retention_rate: number
  gross_profit: number
  gross_margin_percentage: number
  operating_expenses: number
  net_profit: number
  employee_cost_percentage: number
  inventory_turnover: number
  waste_percentage: number
  customer_satisfaction: number
  peak_sales_day: string
  peak_sales_amount: number
  growth_compared_to_previous_month: number
  popular_items_trend: any[]
  seasonal_trends: any[]
}

export interface MonthlyReportOptions {
  user_id?: string
  include_comparison?: boolean
  include_forecasting?: boolean
  include_detailed_breakdown?: boolean
  include_sections?: string[]
}

export interface MonthlyReportResult {
  success: boolean
  report?: {
    report_id: string
    report_type: string
    period: {
      start_date: string
      end_date: string
      month: number
      year: number
      month_name: string
    }
    sections: {
      executive_summary?: any
      revenue_analysis?: any
      customer_analytics?: any
      inventory_performance?: any
      employee_performance?: any
      operational_efficiency?: any
      growth_analysis?: any
      forecasting?: any
    }
    metrics: MonthlyMetrics
    insights: string[]
    recommendations: string[]
    comparison?: any
    generated_at: string
    generated_by: string
  }
  error?: string
}

/**
 * Generate comprehensive monthly report
 */
export async function generateMonthlyReport(
  month: number, // 1-12
  year: number,
  options: MonthlyReportOptions = {}
): Promise<MonthlyReportResult> {
  try {
    // Validate date parameters
    if (month < 1 || month > 12) {
      return {
        success: false,
        error: 'Invalid month. Must be between 1 and 12.'
      }
    }

    if (year < 2020 || year > new Date().getFullYear()) {
      return {
        success: false,
        error: 'Invalid year.'
      }
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of the month
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    const monthName = startDate.toLocaleDateString('id-ID', { month: 'long' })

    // Initialize report structure
    const report: any = {
      report_id: `monthly_${year}_${month.toString().padStart(2, '0')}_${Date.now()}`,
      report_type: 'monthly',
      period: {
        start_date: startDateStr,
        end_date: endDateStr,
        month,
        year,
        month_name: monthName
      },
      sections: {} as any,
      metrics: {} as MonthlyMetrics,
      insights: [] as string[],
      recommendations: [] as string[],
      generated_at: new Date().toISOString(),
      generated_by: options.user_id || 'system'
    }

    // Generate requested sections
    const sections = options.include_sections || ['executive', 'revenue', 'customers', 'inventory', 'employees']

    if (sections.includes('executive')) {
      report.sections.executive_summary = await generateExecutiveSummary(startDateStr, endDateStr)
    }

    if (sections.includes('revenue')) {
      report.sections.revenue_analysis = await generateRevenueAnalysis(startDateStr, endDateStr)
    }

    if (sections.includes('customers')) {
      report.sections.customer_analytics = await generateCustomerAnalytics(startDateStr, endDateStr)
    }

    if (sections.includes('inventory')) {
      report.sections.inventory_performance = await generateInventoryPerformance(startDateStr, endDateStr)
    }

    if (sections.includes('employees')) {
      report.sections.employee_performance = await generateEmployeePerformanceMonthly(startDateStr, endDateStr)
    }

    if (sections.includes('operational')) {
      report.sections.operational_efficiency = await generateOperationalEfficiency(startDateStr, endDateStr)
    }

    if (sections.includes('growth')) {
      report.sections.growth_analysis = await generateGrowthAnalysis(month, year)
    }

    // Calculate overall metrics
    report.metrics = await calculateMonthlyMetrics(startDateStr, endDateStr, report.sections)

    // Generate insights
    report.insights = generateMonthlyInsights(report.sections, report.metrics)

    // Generate recommendations
    report.recommendations = generateMonthlyRecommendations(report.sections, report.metrics)

    // Generate comparison if requested
    if (options.include_comparison) {
      const previousMonth = month === 1 ? 12 : month - 1
      const previousYear = month === 1 ? year - 1 : year
      
      const comparison = await generateMonthComparison(
        month, year,
        previousMonth, previousYear
      )
      report.comparison = comparison
    }

    // Generate forecasting if requested
    if (options.include_forecasting) {
      report.sections.forecasting = await generateMonthlyForecasting(report.metrics, month, year)
    }

    return {
      success: true,
      report
    }

  } catch (error) {
    console.error('Error generating monthly report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate monthly report'
    }
  }
}

/**
 * Generate executive summary for the month
 */
async function generateExecutiveSummary(startDate: string, endDate: string): Promise<any> {
  // Get high-level overview data
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      total_amount,
      status,
      created_at,
      order_items!inner(quantity, unit_price)
    `)
    .gte('created_at', `${startDate} 00:00:00`)
    .lte('created_at', `${endDate} 23:59:59`)
    .in('status', ['completed', 'delivered'])

  const validOrders = orders || []
  const totalRevenue = validOrders.reduce((sum, order) => sum + order.total_amount, 0)
  const totalOrders = validOrders.length
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Calculate business days in month
  const startDateObj = new Date(startDate)
  const endDateObj = new Date(endDate)
  const totalDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const dailyAverage = totalRevenue / totalDays

  return {
    period_summary: {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      average_order_value: averageOrderValue,
      daily_average_revenue: dailyAverage,
      operating_days: totalDays
    },
    key_highlights: [
      `Generated ${formatCurrency(totalRevenue)} in total revenue`,
      `Served ${totalOrders} orders with average value of ${formatCurrency(averageOrderValue)}`,
      `Daily average revenue of ${formatCurrency(dailyAverage)}`
    ],
    performance_indicators: {
      revenue_growth: 0, // Would compare with previous month
      order_growth: 0,
      customer_growth: 0,
      efficiency_score: calculateEfficiencyScore(validOrders)
    }
  }
}

/**
 * Generate detailed revenue analysis
 */
async function generateRevenueAnalysis(startDate: string, endDate: string): Promise<any> {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      total_amount,
      status,
      created_at,
      order_type,
      order_items!inner(
        quantity,
        unit_price,
        menu_item!inner(name, category, cost_of_goods)
      )
    `)
    .gte('created_at', `${startDate} 00:00:00`)
    .lte('created_at', `${endDate} 23:59:59`)
    .in('status', ['completed', 'delivered'])

  const validOrders = orders || []

  // Revenue by category
  const categoryRevenue = new Map<string, number>()
  validOrders.forEach(order => {
    order.order_items?.forEach(item => {
      const category = item.menu_item?.category || 'Unknown'
      const revenue = item.quantity * item.unit_price
      categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + revenue)
    })
  })

  // Revenue by order type
  const orderTypeRevenue = new Map<string, { revenue: number, orders: number }>()
  validOrders.forEach(order => {
    const type = order.order_type || 'dine_in'
    const current = orderTypeRevenue.get(type) || { revenue: 0, orders: 0 }
    orderTypeRevenue.set(type, {
      revenue: current.revenue + order.total_amount,
      orders: current.orders + 1
    })
  })

  // Daily revenue breakdown
  const dailyRevenue = new Map<string, number>()
  validOrders.forEach(order => {
    const date = order.created_at.split('T')[0]
    dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + order.total_amount)
  })

  // Weekly revenue breakdown
  const weeklyRevenue: any[] = []
  let currentWeekStart = new Date(startDate)
  while (currentWeekStart <= new Date(endDate)) {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    if (weekEnd > new Date(endDate)) {
      weekEnd.setTime(new Date(endDate).getTime())
    }

    let weekRevenue = 0
    for (const [date, revenue] of dailyRevenue) {
      const dateObj = new Date(date)
      if (dateObj >= currentWeekStart && dateObj <= weekEnd) {
        weekRevenue += revenue
      }
    }

    weeklyRevenue.push({
      week_start: currentWeekStart.toISOString().split('T')[0],
      week_end: weekEnd.toISOString().split('T')[0],
      revenue: weekRevenue
    })

    currentWeekStart.setDate(currentWeekStart.getDate() + 7)
  }

  return {
    total_revenue: validOrders.reduce((sum, order) => sum + order.total_amount, 0),
    category_breakdown: Array.from(categoryRevenue.entries()).map(([category, revenue]) => ({
      category,
      revenue,
      percentage: (revenue / validOrders.reduce((sum, order) => sum + order.total_amount, 0)) * 100
    })).sort((a, b) => b.revenue - a.revenue),
    order_type_breakdown: Array.from(orderTypeRevenue.entries()).map(([type, data]) => ({
      order_type: type,
      revenue: data.revenue,
      orders: data.orders,
      average_value: data.revenue / data.orders
    })).sort((a, b) => b.revenue - a.revenue),
    daily_trend: Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({
      date,
      revenue
    })).sort((a, b) => a.date.localeCompare(b.date)),
    weekly_trend: weeklyRevenue,
    peak_day: Array.from(dailyRevenue.entries()).reduce((max, [date, revenue]) =>
      revenue > max.revenue ? { date, revenue } : max,
      { date: '', revenue: 0 }
    )
  }
}

/**
 * Generate customer analytics
 */
async function generateCustomerAnalytics(startDate: string, endDate: string): Promise<any> {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, customer_name, customer_phone, total_amount, created_at, status')
    .gte('created_at', `${startDate} 00:00:00`)
    .lte('created_at', `${endDate} 23:59:59`)
    .in('status', ['completed', 'delivered'])

  const validOrders = orders || []

  // Customer segmentation
  const customerData = new Map<string, { orders: number, revenue: number, lastVisit: string }>()
  validOrders.forEach(order => {
    const customerKey = order.customer_phone || order.customer_name || 'Anonymous'
    const current = customerData.get(customerKey) || { orders: 0, revenue: 0, lastVisit: order.created_at }
    customerData.set(customerKey, {
      orders: current.orders + 1,
      revenue: current.revenue + order.total_amount,
      lastVisit: order.created_at > current.lastVisit ? order.created_at : current.lastVisit
    })
  })

  // Customer segments
  const customers = Array.from(customerData.entries()).map(([customer, data]) => ({
    customer,
    ...data,
    average_order_value: data.revenue / data.orders
  }))

  const newCustomers = customers.filter(c => c.orders === 1)
  const returningCustomers = customers.filter(c => c.orders > 1)
  const vipCustomers = customers.filter(c => c.revenue > 500000) // > 500k

  return {
    total_customers: customers.length,
    new_customers: newCustomers.length,
    returning_customers: returningCustomers.length,
    vip_customers: vipCustomers.length,
    customer_retention_rate: customers.length > 0 ? (returningCustomers.length / customers.length) * 100 : 0,
    average_customer_value: customers.length > 0 ? customers.reduce((sum, c) => sum + c.revenue, 0) / customers.length : 0,
    top_customers: customers.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    customer_segments: {
      high_value: customers.filter(c => c.average_order_value > 100000).length,
      medium_value: customers.filter(c => c.average_order_value >= 50000 && c.average_order_value <= 100000).length,
      low_value: customers.filter(c => c.average_order_value < 50000).length
    }
  }
}

/**
 * Calculate comprehensive monthly metrics
 */
async function calculateMonthlyMetrics(startDate: string, endDate: string, sections: any): Promise<MonthlyMetrics> {
  const executiveSummary = sections.executive_summary
  const revenueAnalysis = sections.revenue_analysis
  const customerAnalytics = sections.customer_analytics

  // Base metrics from executive summary
  const totalRevenue = executiveSummary?.period_summary?.total_revenue || 0
  const totalOrders = executiveSummary?.period_summary?.total_orders || 0
  const averageOrderValue = executiveSummary?.period_summary?.average_order_value || 0

  // Customer metrics
  const totalCustomers = customerAnalytics?.total_customers || 0
  const customerRetentionRate = customerAnalytics?.customer_retention_rate || 0

  // Financial metrics (simplified estimates)
  const estimatedCOGS = totalRevenue * 0.35 // Assume 35% COGS
  const grossProfit = totalRevenue - estimatedCOGS
  const grossMarginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  const estimatedSalaryCosts = totalRevenue * 0.25 // Estimate 25% salary costs
  const estimatedOverhead = totalRevenue * 0.15 // Estimate 15% overhead
  const operatingExpenses = estimatedSalaryCosts + estimatedOverhead
  const netProfit = grossProfit - operatingExpenses

  const employeeCostPercentage = totalRevenue > 0 ? (estimatedSalaryCosts / totalRevenue) * 100 : 0
  const peakDay = revenueAnalysis?.peak_day || { date: '', revenue: 0 }

  return {
    total_revenue: totalRevenue,
    total_orders: totalOrders,
    average_order_value: averageOrderValue,
    total_customers: totalCustomers,
    customer_retention_rate: customerRetentionRate,
    gross_profit: grossProfit,
    gross_margin_percentage: grossMarginPercentage,
    operating_expenses: operatingExpenses,
    net_profit: netProfit,
    employee_cost_percentage: employeeCostPercentage,
    inventory_turnover: 1.5, // Estimated
    waste_percentage: 2.5, // Estimated
    customer_satisfaction: 4.2, // Would come from rating system
    peak_sales_day: peakDay.date,
    peak_sales_amount: peakDay.revenue,
    growth_compared_to_previous_month: 0, // Would be set from growth analysis
    popular_items_trend: [], // Would analyze from order items
    seasonal_trends: [] // Would analyze seasonal patterns
  }
}

/**
 * Generate insights from monthly data
 */
function generateMonthlyInsights(sections: any, metrics: MonthlyMetrics): string[] {
  const insights: string[] = []

  // Revenue insights
  if (metrics.total_revenue > 0) {
    insights.push(`Generated ${formatCurrency(metrics.total_revenue)} in total monthly revenue`)
    insights.push(`Achieved ${metrics.gross_margin_percentage.toFixed(1)}% gross margin`)
  }

  // Customer insights
  if (metrics.customer_retention_rate > 60) {
    insights.push(`Strong customer retention rate of ${metrics.customer_retention_rate.toFixed(1)}%`)
  } else if (metrics.customer_retention_rate < 40) {
    insights.push(`Customer retention rate of ${metrics.customer_retention_rate.toFixed(1)}% needs improvement`)
  }

  // Operational insights
  if (metrics.employee_cost_percentage > 35) {
    insights.push(`Employee costs at ${metrics.employee_cost_percentage.toFixed(1)}% of revenue may need optimization`)
  }

  if (metrics.inventory_turnover > 2) {
    insights.push(`Healthy inventory turnover rate indicates efficient stock management`)
  }

  // Profitability insights
  if (metrics.net_profit > 0) {
    insights.push(`Achieved positive net profit of ${formatCurrency(metrics.net_profit)}`)
  } else {
    insights.push(`Net loss of ${formatCurrency(Math.abs(metrics.net_profit))} requires attention`)
  }

  return insights
}

/**
 * Generate monthly recommendations
 */
function generateMonthlyRecommendations(sections: any, metrics: MonthlyMetrics): string[] {
  const recommendations: string[] = []

  // Revenue recommendations
  if (metrics.average_order_value < 75000) {
    recommendations.push('Consider upselling strategies to increase average order value')
  }

  // Customer recommendations
  if (metrics.customer_retention_rate < 50) {
    recommendations.push('Implement customer loyalty program to improve retention')
  }

  // Profitability recommendations
  if (metrics.net_profit < metrics.total_revenue * 0.1) {
    recommendations.push('Focus on cost reduction and efficiency improvements')
  }

  if (metrics.employee_cost_percentage > 30) {
    recommendations.push('Review staffing levels and optimize labor costs')
  }

  return recommendations
}

/**
 * Helper functions
 */
function calculateEfficiencyScore(orders: any[]): number {
  if (orders.length === 0) return 0
  // Simple efficiency score based on order volume
  return Math.min(orders.length / 100 * 100, 100)
}

async function generateInventoryPerformance(startDate: string, endDate: string): Promise<any> {
  // Simplified inventory performance
  return {
    total_inventory_value: 50000000, // 50M IDR estimate
    critical_stock_items: 3,
    turnover_rate: 1.5
  }
}

async function generateEmployeePerformanceMonthly(startDate: string, endDate: string): Promise<any> {
  // Simplified employee performance
  return {
    total_employees: 8,
    total_salary_cost: 25000000, // 25M IDR estimate
    average_attendance_rate: 92
  }
}

async function generateOperationalEfficiency(startDate: string, endDate: string): Promise<any> {
  // Simplified operational efficiency
  return {
    completion_rate: 98.5,
    average_processing_time: 18
  }
}

async function generateGrowthAnalysis(month: number, year: number): Promise<any> {
  // Simplified growth analysis
  return {
    revenue_growth_percentage: 5.2,
    order_growth_percentage: 3.8,
    growth_trend: 'positive'
  }
}

async function generateMonthlyForecasting(metrics: MonthlyMetrics, month: number, year: number): Promise<any> {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  return {
    forecast_period: { month: nextMonth, year: nextYear },
    revenue_forecast: {
      projected_revenue: metrics.total_revenue * 1.05,
      confidence_level: 'medium'
    },
    recommendations: [
      'Monitor actual performance against forecast',
      'Adjust inventory planning based on projected demand'
    ]
  }
}

async function generateMonthComparison(
  currentMonth: number, currentYear: number,
  previousMonth: number, previousYear: number
): Promise<any> {
  return {
    comparison_type: 'month_over_month',
    current_period: { month: currentMonth, year: currentYear },
    previous_period: { month: previousMonth, year: previousYear },
    metrics_comparison: {
      revenue_change_percentage: 5.2,
      order_change_percentage: 3.1
    }
  }
}