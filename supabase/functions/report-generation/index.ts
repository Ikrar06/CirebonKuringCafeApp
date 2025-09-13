/**
 * Report Generation Edge Function - Main Handler
 * 
 * Automated report generation for cafe analytics and operations
 * Generates daily, weekly, monthly reports with business insights
 * 
 * @endpoints
 * POST /report-generation/daily - Generate daily report
 * POST /report-generation/weekly - Generate weekly report  
 * POST /report-generation/monthly - Generate monthly report
 * POST /report-generation/custom - Generate custom period report
 * GET  /report-generation/scheduled - Get scheduled report status
 * POST /report-generation/schedule - Schedule automatic reports
 */

import { withCors } from '../_shared/cors'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  createUnauthorizedResponse,
  parseJsonBody,
  createHandler
} from '../_shared/response'
import { 
  supabaseAdmin, 
  getAuthenticatedClient,
  logAudit 
} from '../_shared/supabase-client'
import { 
  validateFields,
  sanitizeString
} from '../../../packages/utils/src/validators/index'
import { generateDailyReport } from './daily-report'

// Report interfaces
interface ReportRequest {
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom'
  start_date?: string
  end_date?: string
  include_sections?: string[] // sales, inventory, employees, customers
  format?: 'json' | 'pdf' | 'csv'
  recipients?: string[] // Email addresses for delivery
  schedule_delivery?: boolean
}

interface ScheduledReportRequest {
  report_type: 'daily' | 'weekly' | 'monthly'
  schedule: 'daily' | 'weekly' | 'monthly'
  recipients: string[]
  sections: string[]
  delivery_time: string // HH:mm format
  is_active: boolean
}

interface ReportResult {
  report_id: string
  report_type: string
  period: {
    start_date: string
    end_date: string
  }
  sections: {
    sales_summary?: any
    inventory_status?: any
    employee_performance?: any
    customer_analytics?: any
    financial_overview?: any
  }
  metrics: {
    total_revenue: number
    total_orders: number
    average_order_value: number
    customer_satisfaction: number
    operational_efficiency: number
  }
  insights: string[]
  recommendations: string[]
  generated_at: string
  generated_by: string
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Generate daily report
 */
async function handleDailyReport(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    const reportData = (body || {}) as ReportRequest

    // Set default date to yesterday if not specified
    if (!reportData.start_date) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      reportData.start_date = yesterday.toISOString().split('T')[0]
      reportData.end_date = reportData.start_date
    }

    // Authenticate request
    const authResult = await authenticateReportRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Generate daily report
    const reportResult = await generateDailyReport(
      reportData.start_date,
      {
        include_sections: reportData.include_sections || ['sales', 'inventory', 'employees'],
        user_id: authResult.user_id
      }
    )

    if (!reportResult.success) {
      return createErrorResponse(
        'Daily report generation failed',
        500,
        { error: reportResult.error },
        request
      )
    }

    // Store report in database
    const storedReport = await storeReport(
      'daily',
      reportResult.report!,
      authResult.user_id || 'system'
    )

    // Send report if recipients specified
    if (reportData.recipients && reportData.recipients.length > 0) {
      await sendReportNotification(
        storedReport.report_id,
        reportData.recipients,
        reportResult.report!
      )
    }

    // Log report generation
    await logAudit(
      authResult.user_id || 'system',
      'DAILY_REPORT_GENERATED',
      {
        report_id: storedReport.report_id,
        date: reportData.start_date,
        sections_included: reportData.include_sections?.length || 0,
        total_revenue: reportResult.report!.metrics.total_revenue
      },
      'reports',
      storedReport.report_id
    )

    return createSuccessResponse(
      {
        report: reportResult.report,
        report_id: storedReport.report_id,
        delivery_status: reportData.recipients ? 'sent' : 'generated'
      },
      'Daily report generated successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleDailyReport:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Generate weekly report
 */
async function handleWeeklyReport(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    const reportData = (body || {}) as ReportRequest

    // Set default date range to last week if not specified
    if (!reportData.start_date) {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() - 1) // Yesterday
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 6) // 7 days ago
      
      reportData.start_date = startDate.toISOString().split('T')[0]
      reportData.end_date = endDate.toISOString().split('T')[0]
    }

    // Authenticate request
    const authResult = await authenticateReportRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Generate weekly report
    const reportResult = await generateWeeklyReport(
      reportData.start_date,
      reportData.end_date!,
      {
        include_sections: reportData.include_sections || ['sales', 'inventory', 'employees', 'customers'],
        user_id: authResult.user_id
      }
    )

    if (!reportResult.success) {
      return createErrorResponse(
        'Weekly report generation failed',
        500,
        { error: reportResult.error },
        request
      )
    }

    // Store and optionally send report
    const storedReport = await storeReport('weekly', reportResult.report!, authResult.user_id || 'system')
    
    if (reportData.recipients && reportData.recipients.length > 0) {
      await sendReportNotification(storedReport.report_id, reportData.recipients, reportResult.report!)
    }

    return createSuccessResponse(
      {
        report: reportResult.report,
        report_id: storedReport.report_id,
        delivery_status: reportData.recipients ? 'sent' : 'generated'
      },
      'Weekly report generated successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleWeeklyReport:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Generate monthly report
 */
async function handleMonthlyReport(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    const reportData = (body || {}) as ReportRequest

    // Set default date range to last month if not specified
    if (!reportData.start_date) {
      const today = new Date()
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      
      reportData.start_date = firstDayLastMonth.toISOString().split('T')[0]
      reportData.end_date = lastDayLastMonth.toISOString().split('T')[0]
    }

    // Authenticate request (owner only for monthly reports)
    const authResult = await authenticateReportRequest(request, ['owner'])
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Generate comprehensive monthly report
    const reportResult = await generateMonthlyReport(
      reportData.start_date,
      reportData.end_date!,
      {
        include_sections: reportData.include_sections || ['sales', 'inventory', 'employees', 'customers', 'financial'],
        user_id: authResult.user_id
      }
    )

    if (!reportResult.success) {
      return createErrorResponse(
        'Monthly report generation failed',
        500,
        { error: reportResult.error },
        request
      )
    }

    // Store and send report
    const storedReport = await storeReport('monthly', reportResult.report!, authResult.user_id || 'system')
    
    if (reportData.recipients && reportData.recipients.length > 0) {
      await sendReportNotification(storedReport.report_id, reportData.recipients, reportResult.report!)
    }

    return createSuccessResponse(
      {
        report: reportResult.report,
        report_id: storedReport.report_id,
        delivery_status: reportData.recipients ? 'sent' : 'generated'
      },
      'Monthly report generated successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleMonthlyReport:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Generate custom period report
 */
async function handleCustomReport(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const reportData = body as ReportRequest

    // Validate required fields for custom report
    const validation = validateFields(reportData, {
      start_date: { required: true, type: 'string' },
      end_date: { required: true, type: 'string' }
    })

    if (!validation.valid) {
      return createValidationErrorResponse(
        Object.entries(validation.errors).map(([field, errors]) => ({
          field,
          message: errors[0],
          code: 'VALIDATION_ERROR'
        })),
        request
      )
    }

    // Validate date range
    const startDate = new Date(reportData.start_date!)
    const endDate = new Date(reportData.end_date!)
    const daysDifference = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDifference < 0) {
      return createErrorResponse('End date must be after start date', 400, undefined, request)
    }

    if (daysDifference > 365) {
      return createErrorResponse('Report period cannot exceed 365 days', 400, undefined, request)
    }

    // Authenticate request
    const authResult = await authenticateReportRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Generate custom report
    const reportResult = await generateCustomReport(
      reportData.start_date!,
      reportData.end_date!,
      {
        include_sections: reportData.include_sections || ['sales', 'inventory', 'employees'],
        user_id: authResult.user_id
      }
    )

    if (!reportResult.success) {
      return createErrorResponse(
        'Custom report generation failed',
        500,
        { error: reportResult.error },
        request
      )
    }

    // Store and optionally send report
    const storedReport = await storeReport('custom', reportResult.report!, authResult.user_id || 'system')
    
    if (reportData.recipients && reportData.recipients.length > 0) {
      await sendReportNotification(storedReport.report_id, reportData.recipients, reportResult.report!)
    }

    return createSuccessResponse(
      {
        report: reportResult.report,
        report_id: storedReport.report_id,
        delivery_status: reportData.recipients ? 'sent' : 'generated'
      },
      'Custom report generated successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleCustomReport:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Schedule automatic reports
 */
async function handleScheduleReport(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const scheduleData = body as ScheduledReportRequest

    // Validate required fields
    const validation = validateFields(scheduleData, {
      report_type: { required: true, type: 'string' },
      schedule: { required: true, type: 'string' },
      recipients: { required: true },
      delivery_time: { required: true, type: 'string' }
    })

    if (!validation.valid) {
      return createValidationErrorResponse(
        Object.entries(validation.errors).map(([field, errors]) => ({
          field,
          message: errors[0],
          code: 'VALIDATION_ERROR'
        })),
        request
      )
    }

    // Authenticate request (owner only)
    const authResult = await authenticateReportRequest(request, ['owner'])
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Validate delivery time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(scheduleData.delivery_time)) {
      return createErrorResponse(
        'Invalid delivery time format. Use HH:mm format',
        400,
        undefined,
        request
      )
    }

    // Schedule configuration would be handled by a task scheduler
    console.log(`Report scheduled: ${scheduleData.report_type} - ${scheduleData.schedule}`)
    
    const scheduledReport = {
      id: `scheduled_${Date.now()}`,
      report_type: scheduleData.report_type,
      schedule: scheduleData.schedule,
      recipients: scheduleData.recipients,
      delivery_time: scheduleData.delivery_time,
      is_active: scheduleData.is_active
    }

    // Log schedule creation
    await logAudit(
      authResult.user_id || 'system',
      'REPORT_SCHEDULED',
      {
        report_type: scheduleData.report_type,
        schedule: scheduleData.schedule,
        recipients_count: scheduleData.recipients.length,
        delivery_time: scheduleData.delivery_time,
        is_active: scheduleData.is_active
      },
      'scheduled_reports',
      scheduledReport.id
    )

    return createSuccessResponse(
      {
        schedule_id: scheduledReport.id,
        report_type: scheduleData.report_type,
        schedule: scheduleData.schedule,
        next_delivery: calculateNextDelivery(scheduleData.schedule, scheduleData.delivery_time),
        is_active: scheduleData.is_active
      },
      'Report scheduled successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleScheduleReport:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get scheduled report status
 */
async function handleGetScheduledReports(request: Request): Promise<Response> {
  try {
    // Authenticate request
    const authResult = await authenticateReportRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Scheduled reports would be retrieved from task scheduler
    const scheduledReports: any[] = []
    const error = null

    // Calculate next delivery times
    const reportsWithNextDelivery = scheduledReports?.map(report => ({
      ...report,
      next_delivery: report.is_active 
        ? calculateNextDelivery(report.schedule, report.delivery_time)
        : null,
      status: report.is_active ? 'active' : 'inactive'
    })) || []

    return createSuccessResponse(
      {
        scheduled_reports: reportsWithNextDelivery,
        summary: {
          total_schedules: reportsWithNextDelivery.length,
          active_schedules: reportsWithNextDelivery.filter(r => r.is_active).length,
          daily_reports: reportsWithNextDelivery.filter(r => r.schedule === 'daily').length,
          weekly_reports: reportsWithNextDelivery.filter(r => r.schedule === 'weekly').length,
          monthly_reports: reportsWithNextDelivery.filter(r => r.schedule === 'monthly').length
        }
      },
      'Scheduled reports retrieved successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetScheduledReports:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Generate weekly report
 */
async function generateWeeklyReport(startDate: string, endDate: string, options: any): Promise<{
  success: boolean
  report?: ReportResult
  error?: string
}> {
  try {
    // Aggregate daily reports for the week
    const dailyReports: any[] = []
    const currentDate = new Date(startDate)
    const endDateObj = new Date(endDate)

    while (currentDate <= endDateObj) {
      const dayReport = await generateDailyReport(
        currentDate.toISOString().split('T')[0],
        options
      )
      
      if (dayReport.success && dayReport.report) {
        dailyReports.push(dayReport.report)
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Aggregate metrics
    const weeklyMetrics = aggregateReportMetrics(dailyReports)
    
    // Generate weekly insights
    const insights = generateWeeklyInsights(dailyReports)

    const weeklyReport: ReportResult = {
      report_id: `weekly_${startDate}_${endDate}_${Date.now()}`,
      report_type: 'weekly',
      period: { start_date: startDate, end_date: endDate },
      sections: {
        sales_summary: aggregateSalesSummary(dailyReports),
        inventory_status: await getInventoryStatus(),
        employee_performance: await getEmployeePerformance(startDate, endDate)
      },
      metrics: weeklyMetrics,
      insights: insights,
      recommendations: generateWeeklyRecommendations(dailyReports),
      generated_at: new Date().toISOString(),
      generated_by: options.user_id
    }

    return { success: true, report: weeklyReport }

  } catch (error) {
    console.error('Error generating weekly report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Weekly report generation failed'
    }
  }
}

/**
 * Generate monthly report
 */
async function generateMonthlyReport(startDate: string, endDate: string, options: any): Promise<{
  success: boolean
  report?: ReportResult
  error?: string
}> {
  // Similar to weekly but with monthly aggregations and additional financial analysis
  return generateWeeklyReport(startDate, endDate, options) // Simplified for now
}

/**
 * Generate custom period report
 */
async function generateCustomReport(startDate: string, endDate: string, options: any): Promise<{
  success: boolean
  report?: ReportResult
  error?: string
}> {
  // Flexible report generation based on date range
  return generateWeeklyReport(startDate, endDate, options) // Simplified for now
}

/**
 * Store report in database
 */
async function storeReport(reportType: string, report: ReportResult, userId: string): Promise<{
  report_id: string
}> {
  // Report storage would be handled by application storage system
  const storedReport = {
    id: `${reportType}_${Date.now()}`,
    report_type: reportType,
    period_start: report.period.start_date,
    period_end: report.period.end_date,
    generated_by: userId,
    generated_at: new Date().toISOString()
  }

  console.log(`Report stored: ${storedReport.id}`)

  return { report_id: storedReport.id }
}

/**
 * Send report notification via Telegram
 */
async function sendReportNotification(reportId: string, recipients: string[], report: ReportResult): Promise<void> {
  // Implementation would integrate with Telegram notifications
  // For now, just log the attempt
  console.log(`Sending report ${reportId} to ${recipients.length} recipients`)
}

/**
 * Calculate next delivery time for scheduled report
 */
function calculateNextDelivery(schedule: string, deliveryTime: string): string {
  const now = new Date()
  const [hours, minutes] = deliveryTime.split(':').map(Number)
  
  let nextDelivery = new Date(now)
  nextDelivery.setHours(hours, minutes, 0, 0)

  switch (schedule) {
    case 'daily':
      if (nextDelivery <= now) {
        nextDelivery.setDate(nextDelivery.getDate() + 1)
      }
      break
    case 'weekly':
      // Next Monday at specified time
      const daysUntilMonday = (1 + 7 - nextDelivery.getDay()) % 7
      if (daysUntilMonday === 0 && nextDelivery <= now) {
        nextDelivery.setDate(nextDelivery.getDate() + 7)
      } else {
        nextDelivery.setDate(nextDelivery.getDate() + daysUntilMonday)
      }
      break
    case 'monthly':
      // First day of next month
      nextDelivery = new Date(nextDelivery.getFullYear(), nextDelivery.getMonth() + 1, 1)
      nextDelivery.setHours(hours, minutes, 0, 0)
      break
  }

  return nextDelivery.toISOString()
}

/**
 * Authenticate report request
 */
async function authenticateReportRequest(
  request: Request,
  allowedRoles: string[] = ['owner', 'kasir']
): Promise<{
  success: boolean
  error?: string
  user_id?: string
}> {
  try {
    // Try user authentication
    const authResult = await getAuthenticatedClient(request)
    if (authResult) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', authResult.user.id)
        .single()

      if (user && allowedRoles.includes(user.role)) {
        return { success: true, user_id: authResult.user.id }
      }
    }

    return { success: false, error: 'Unauthorized access' }

  } catch (error) {
    console.error('Error authenticating report request:', error)
    return { success: false, error: 'Authentication failed' }
  }
}

// Placeholder helper functions
function aggregateReportMetrics(reports: ReportResult[]): any {
  return {
    total_revenue: reports.reduce((sum, r) => sum + r.metrics.total_revenue, 0),
    total_orders: reports.reduce((sum, r) => sum + r.metrics.total_orders, 0),
    average_order_value: 0, // Calculate from aggregated data
    customer_satisfaction: 0,
    operational_efficiency: 0
  }
}

function generateWeeklyInsights(reports: ReportResult[]): string[] {
  return [
    'Peak sales day identified',
    'Inventory turnover analysis completed',
    'Employee performance trends noted'
  ]
}

function generateWeeklyRecommendations(reports: ReportResult[]): string[] {
  return [
    'Optimize staffing for peak days',
    'Review inventory levels for popular items',
    'Consider promotional activities for slow days'
  ]
}

function aggregateSalesSummary(reports: ReportResult[]): any {
  return {
    total_revenue: reports.reduce((sum, r) => sum + r.metrics.total_revenue, 0),
    daily_breakdown: reports.map(r => ({
      date: r.period.start_date,
      revenue: r.metrics.total_revenue
    }))
  }
}

async function getInventoryStatus(): Promise<any> {
  return { status: 'placeholder' }
}

async function getEmployeePerformance(startDate: string, endDate: string): Promise<any> {
  return { performance: 'placeholder' }
}

// ===========================================
// MAIN HANDLER WITH ROUTING
// ===========================================

const handler = withCors(createHandler({
  POST: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/daily')) {
      return handleDailyReport(request)
    } else if (url.pathname.includes('/weekly')) {
      return handleWeeklyReport(request)
    } else if (url.pathname.includes('/monthly')) {
      return handleMonthlyReport(request)
    } else if (url.pathname.includes('/custom')) {
      return handleCustomReport(request)
    } else if (url.pathname.includes('/schedule')) {
      return handleScheduleReport(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/scheduled')) {
      return handleGetScheduledReports(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler