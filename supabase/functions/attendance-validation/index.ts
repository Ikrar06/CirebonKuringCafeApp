/**
 * Attendance Validation Edge Function - Main Handler
 * 
 * GPS-based attendance validation with geofencing for cafe employees
 * Validates location, shift timing, and prevents attendance fraud
 * 
 * @endpoints
 * POST /attendance-validation/clock-in - Validate and record clock in
 * POST /attendance-validation/clock-out - Validate and record clock out
 * POST /attendance-validation/validate-location - Check if location is valid
 * GET  /attendance-validation/shift-status - Get current shift status
 * POST /attendance-validation/overtime-request - Request overtime approval
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
  validateFields
} from '../../../packages/utils/src/validators/index'

// Attendance configuration
const ATTENDANCE_CONFIG = {
  ALLOWED_RADIUS_METERS: 100, // 100m radius from cafe location
  CAFE_LOCATION: {
    latitude: -3.9778, // Kendari coordinates
    longitude: 122.5194
  },
  EARLY_CLOCK_IN_MINUTES: 15, // Allow 15 minutes early
  LATE_GRACE_PERIOD_MINUTES: 10, // 10 minutes grace for late
  MAX_SHIFT_HOURS: 12, // Maximum shift duration
  OVERTIME_THRESHOLD_HOURS: 8, // Overtime after 8 hours
  AUTO_APPROVE_OVERTIME_HOURS: 2 // Auto approve overtime under 2 hours
}

// Request interfaces
interface ClockInRequest {
  employee_id: string
  location: {
    latitude: number
    longitude: number
    accuracy: number
  }
  timestamp: string
  device_info?: {
    user_agent: string
    ip_address: string
  }
}

interface ClockOutRequest {
  employee_id: string
  location: {
    latitude: number
    longitude: number
    accuracy: number
  }
  timestamp: string
  shift_summary?: string
}

interface LocationValidationRequest {
  location: {
    latitude: number
    longitude: number
    accuracy: number
  }
}

interface OvertimeRequest {
  employee_id: string
  planned_overtime_hours: number
  reason: string
  estimated_end_time: string
}

// Response interfaces
interface AttendanceValidationResult {
  valid: boolean
  distance_from_cafe: number
  within_radius: boolean
  location_accuracy_acceptable: boolean
  timestamp_valid: boolean
  shift_validation: {
    is_scheduled_shift: boolean
    shift_status: 'early' | 'on_time' | 'late' | 'overtime'
    minutes_difference: number
  }
}

// ===========================================
// MAIN HANDLERS
// ===========================================

/**
 * Validate and record employee clock in
 */
async function handleClockIn(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const clockInData = body as ClockInRequest

    // Validate required fields
    const validation = validateFields(clockInData, {
      employee_id: { required: true, type: 'string' },
      location: { required: true },
      timestamp: { required: true, type: 'string' }
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

    // Authenticate request (employee only)
    const authResult = await authenticateAttendanceRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Validate employee exists and is active
    const employee = await validateEmployee(clockInData.employee_id)
    if (!employee.valid) {
      return createErrorResponse(
        'Invalid employee',
        400,
        { error: employee.error },
        request
      )
    }

    // Check if already clocked in today
    const existingAttendance = await checkExistingAttendance(
      clockInData.employee_id,
      clockInData.timestamp
    )

    if (existingAttendance.alreadyClockedIn) {
      return createErrorResponse(
        'Already clocked in today',
        409,
        { 
          existing_clock_in: existingAttendance.clockInTime,
          message: 'Employee has already clocked in for today'
        },
        request
      )
    }

    // Validate attendance (location, timing, etc.)
    const validationResult = await validateAttendance(
      clockInData,
      employee.employee!,
      'clock_in'
    )

    // If validation fails but within acceptable parameters, log warning
    if (!validationResult.valid) {
      const shouldReject = shouldRejectAttendance(validationResult)
      
      if (shouldReject) {
        return createErrorResponse(
          'Attendance validation failed',
          400,
          {
            validation_result: validationResult,
            rejection_reasons: getFailureReasons(validationResult)
          },
          request
        )
      }
    }

    // Record attendance
    const attendanceRecord = await recordClockIn(
      clockInData,
      validationResult,
      employee.employee!
    )

    // Send notification if needed
    if (validationResult.shift_validation.shift_status === 'late') {
      await sendLateAttendanceNotification(
        employee.employee!,
        validationResult.shift_validation.minutes_difference
      )
    }

    // Log attendance action
    await logAudit(
      authResult.user_id || 'system',
      'EMPLOYEE_CLOCK_IN',
      {
        employee_id: clockInData.employee_id,
        location_valid: validationResult.valid,
        distance_from_cafe: validationResult.distance_from_cafe,
        shift_status: validationResult.shift_validation.shift_status,
        timestamp: clockInData.timestamp
      },
      'attendance',
      attendanceRecord.id
    )

    return createSuccessResponse(
      {
        attendance_id: attendanceRecord.id,
        clock_in_time: attendanceRecord.clock_in_time,
        validation_result: validationResult,
        employee_name: employee.employee!.full_name,
        shift_info: {
          scheduled_start: employee.employee!.shift_start,
          actual_start: attendanceRecord.clock_in_time,
          status: validationResult.shift_validation.shift_status
        }
      },
      'Clock in recorded successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleClockIn:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Validate and record employee clock out
 */
async function handleClockOut(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const clockOutData = body as ClockOutRequest

    // Validate required fields
    const validation = validateFields(clockOutData, {
      employee_id: { required: true, type: 'string' },
      location: { required: true },
      timestamp: { required: true, type: 'string' }
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

    // Authenticate request
    const authResult = await authenticateAttendanceRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get current attendance record
    const currentAttendance = await getCurrentAttendanceRecord(
      clockOutData.employee_id,
      clockOutData.timestamp
    )

    if (!currentAttendance.found) {
      return createErrorResponse(
        'No active attendance record found',
        404,
        { message: 'Employee must clock in first' },
        request
      )
    }

    // Validate employee
    const employee = await validateEmployee(clockOutData.employee_id)
    if (!employee.valid) {
      return createErrorResponse('Invalid employee', 400, undefined, request)
    }

    // Validate clock out location
    const validationResult = await validateAttendance(
      clockOutData,
      employee.employee!,
      'clock_out'
    )

    // Calculate shift duration and overtime
    const shiftCalculation = calculateShiftDuration(
      currentAttendance.record!.clock_in_time,
      clockOutData.timestamp,
      employee.employee!
    )

    // Check if overtime needs approval
    if (shiftCalculation.overtime_hours >= ATTENDANCE_CONFIG.AUTO_APPROVE_OVERTIME_HOURS) {
      const overtimeApproval = await checkOvertimeApproval(
        clockOutData.employee_id,
        shiftCalculation.overtime_hours
      )

      if (!overtimeApproval.approved) {
        return createErrorResponse(
          'Overtime requires approval',
          403,
          {
            overtime_hours: shiftCalculation.overtime_hours,
            approval_required: true,
            request_overtime_endpoint: '/attendance-validation/overtime-request'
          },
          request
        )
      }
    }

    // Record clock out
    const updatedAttendance = await recordClockOut(
      currentAttendance.record!.id,
      clockOutData,
      shiftCalculation,
      validationResult
    )

    // Send completion notification
    await sendShiftCompletionNotification(
      employee.employee!,
      shiftCalculation
    )

    // Log clock out
    await logAudit(
      authResult.user_id || 'system',
      'EMPLOYEE_CLOCK_OUT',
      {
        employee_id: clockOutData.employee_id,
        total_hours: shiftCalculation.total_hours,
        overtime_hours: shiftCalculation.overtime_hours,
        location_valid: validationResult.valid
      },
      'attendance',
      updatedAttendance.id
    )

    return createSuccessResponse(
      {
        attendance_id: updatedAttendance.id,
        clock_out_time: updatedAttendance.clock_out_time,
        shift_summary: {
          total_hours: shiftCalculation.total_hours,
          regular_hours: shiftCalculation.regular_hours,
          overtime_hours: shiftCalculation.overtime_hours,
          gross_pay: shiftCalculation.gross_pay
        },
        validation_result: validationResult
      },
      'Clock out recorded successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleClockOut:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Validate location without recording attendance
 */
async function handleValidateLocation(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const locationData = body as LocationValidationRequest

    // Validate location
    const distance = calculateDistance(
      locationData.location.latitude,
      locationData.location.longitude,
      ATTENDANCE_CONFIG.CAFE_LOCATION.latitude,
      ATTENDANCE_CONFIG.CAFE_LOCATION.longitude
    )

    const withinRadius = distance <= ATTENDANCE_CONFIG.ALLOWED_RADIUS_METERS
    const accuracyAcceptable = locationData.location.accuracy <= 50 // 50m accuracy threshold

    return createSuccessResponse(
      {
        distance_from_cafe: Math.round(distance),
        within_allowed_radius: withinRadius,
        allowed_radius: ATTENDANCE_CONFIG.ALLOWED_RADIUS_METERS,
        location_accuracy: locationData.location.accuracy,
        accuracy_acceptable: accuracyAcceptable,
        can_clock_in: withinRadius && accuracyAcceptable,
        cafe_location: ATTENDANCE_CONFIG.CAFE_LOCATION
      },
      'Location validation completed',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleValidateLocation:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Get current shift status for employee
 */
async function handleGetShiftStatus(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const employeeId = url.searchParams.get('employee_id')

    if (!employeeId) {
      return createErrorResponse('Employee ID required', 400, undefined, request)
    }

    // Authenticate request
    const authResult = await authenticateAttendanceRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Get employee info
    const employee = await validateEmployee(employeeId)
    if (!employee.valid) {
      return createErrorResponse('Invalid employee', 400, undefined, request)
    }

    // Get current attendance status
    const today = new Date().toISOString().split('T')[0]
    const currentAttendance = await getCurrentAttendanceRecord(employeeId, today)

    // Get shift schedule
    const shiftInfo = await getEmployeeShiftInfo(employeeId)

    const status = {
      employee_id: employeeId,
      employee_name: employee.employee!.full_name,
      current_date: today,
      is_clocked_in: currentAttendance.found && !currentAttendance.record!.clock_out_time,
      attendance_record: currentAttendance.record,
      shift_schedule: shiftInfo,
      current_status: getCurrentShiftStatus(currentAttendance.record, shiftInfo)
    }

    return createSuccessResponse(
      status,
      'Shift status retrieved successfully',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleGetShiftStatus:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      request
    )
  }
}

/**
 * Request overtime approval
 */
async function handleOvertimeRequest(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await parseJsonBody(request)
    if (!body) {
      return createErrorResponse('Invalid JSON body', 400, undefined, request)
    }

    const overtimeData = body as OvertimeRequest

    // Validate required fields
    const validation = validateFields(overtimeData, {
      employee_id: { required: true, type: 'string' },
      planned_overtime_hours: { required: true, type: 'number' },
      reason: { required: true, type: 'string' }
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

    // Authenticate request
    const authResult = await authenticateAttendanceRequest(request)
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, request)
    }

    // Validate employee
    const employee = await validateEmployee(overtimeData.employee_id)
    if (!employee.valid) {
      return createErrorResponse('Invalid employee', 400, undefined, request)
    }

    // Check if overtime is within limits
    if (overtimeData.planned_overtime_hours > 4) {
      return createErrorResponse(
        'Overtime cannot exceed 4 hours per day',
        400,
        undefined,
        request
      )
    }

    // Auto approve if under threshold
    const autoApprove = overtimeData.planned_overtime_hours < ATTENDANCE_CONFIG.AUTO_APPROVE_OVERTIME_HOURS

    // Store overtime request
    const overtimeRequest = await storeOvertimeRequest(
      overtimeData,
      authResult.user_id || 'system',
      autoApprove
    )

    // Send notification to owner if approval needed
    if (!autoApprove) {
      await sendOvertimeApprovalNotification(employee.employee!, overtimeData)
    }

    return createSuccessResponse(
      {
        request_id: overtimeRequest.id,
        status: autoApprove ? 'approved' : 'pending',
        planned_overtime_hours: overtimeData.planned_overtime_hours,
        estimated_overtime_pay: calculateOvertimePay(
          employee.employee!.hourly_rate || 50000,
          overtimeData.planned_overtime_hours
        ),
        auto_approved: autoApprove
      },
      autoApprove ? 'Overtime request auto-approved' : 'Overtime request submitted for approval',
      undefined,
      request
    )

  } catch (error) {
    console.error('Error in handleOvertimeRequest:', error)
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
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // Distance in meters
}

/**
 * Validate employee exists and is active
 */
async function validateEmployee(employeeId: string): Promise<{
  valid: boolean
  employee?: any
  error?: string
}> {
  try {
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .eq('status', 'active')
      .single()

    if (error || !employee) {
      return {
        valid: false,
        error: 'Employee not found or inactive'
      }
    }

    return {
      valid: true,
      employee
    }

  } catch (error) {
    return {
      valid: false,
      error: 'Employee validation failed'
    }
  }
}

/**
 * Check if employee already clocked in today
 */
async function checkExistingAttendance(employeeId: string, timestamp: string): Promise<{
  alreadyClockedIn: boolean
  clockInTime?: string
}> {
  const date = timestamp.split('T')[0]
  
  const { data: attendance } = await supabaseAdmin
    .from('attendance')
    .select('clock_in_time')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .single()

  return {
    alreadyClockedIn: !!attendance?.clock_in_time,
    clockInTime: attendance?.clock_in_time
  }
}

/**
 * Comprehensive attendance validation
 */
async function validateAttendance(
  attendanceData: any,
  employee: any,
  action: 'clock_in' | 'clock_out'
): Promise<AttendanceValidationResult> {
  // Location validation
  const distance = calculateDistance(
    attendanceData.location.latitude,
    attendanceData.location.longitude,
    ATTENDANCE_CONFIG.CAFE_LOCATION.latitude,
    ATTENDANCE_CONFIG.CAFE_LOCATION.longitude
  )
  
  const withinRadius = distance <= ATTENDANCE_CONFIG.ALLOWED_RADIUS_METERS
  const accuracyAcceptable = attendanceData.location.accuracy <= 50

  // Timestamp validation
  const timestamp = new Date(attendanceData.timestamp)
  const now = new Date()
  const timeDiff = Math.abs(now.getTime() - timestamp.getTime()) / (1000 * 60) // minutes
  const timestampValid = timeDiff <= 10 // Allow 10 minutes difference

  // Shift validation
  const shiftValidation = validateShiftTiming(
    attendanceData.timestamp,
    employee,
    action
  )

  return {
    valid: withinRadius && accuracyAcceptable && timestampValid,
    distance_from_cafe: Math.round(distance),
    within_radius: withinRadius,
    location_accuracy_acceptable: accuracyAcceptable,
    timestamp_valid: timestampValid,
    shift_validation: shiftValidation
  }
}

/**
 * Validate shift timing
 */
function validateShiftTiming(timestamp: string, employee: any, action: string): any {
  const time = new Date(timestamp)
  const timeStr = time.toTimeString().substring(0, 5) // HH:mm format
  
  const scheduledTime = action === 'clock_in' ? employee.shift_start : employee.shift_end
  if (!scheduledTime) {
    return {
      is_scheduled_shift: false,
      shift_status: 'unknown',
      minutes_difference: 0
    }
  }

  const scheduled = new Date(`2000-01-01T${scheduledTime}`)
  const actual = new Date(`2000-01-01T${timeStr}`)
  const diffMinutes = (actual.getTime() - scheduled.getTime()) / (1000 * 60)

  let status: string
  if (action === 'clock_in') {
    if (diffMinutes <= -ATTENDANCE_CONFIG.EARLY_CLOCK_IN_MINUTES) {
      status = 'too_early'
    } else if (diffMinutes <= ATTENDANCE_CONFIG.LATE_GRACE_PERIOD_MINUTES) {
      status = 'on_time'
    } else {
      status = 'late'
    }
  } else {
    status = diffMinutes >= 0 ? 'on_time' : 'early'
  }

  return {
    is_scheduled_shift: true,
    shift_status: status,
    minutes_difference: Math.round(diffMinutes)
  }
}

/**
 * Determine if attendance should be rejected
 */
function shouldRejectAttendance(validation: AttendanceValidationResult): boolean {
  // Reject if outside radius
  if (!validation.within_radius) return true
  
  // Reject if location accuracy is very poor
  if (!validation.location_accuracy_acceptable) return true
  
  // Reject if timestamp is invalid
  if (!validation.timestamp_valid) return true
  
  return false
}

function getFailureReasons(validation: AttendanceValidationResult): string[] {
  const reasons: string[] = []
  
  if (!validation.within_radius) {
    reasons.push(`Location is ${validation.distance_from_cafe}m from cafe (max: ${ATTENDANCE_CONFIG.ALLOWED_RADIUS_METERS}m)`)
  }
  
  if (!validation.location_accuracy_acceptable) {
    reasons.push('GPS accuracy is insufficient for attendance validation')
  }
  
  if (!validation.timestamp_valid) {
    reasons.push('Timestamp validation failed - ensure device time is synchronized')
  }
  
  return reasons
}

// Placeholder implementations for complex functions
async function recordClockIn(clockInData: any, validation: any, employee: any): Promise<any> {
  const { data: attendance, error } = await supabaseAdmin
    .from('attendance')
    .insert({
      employee_id: clockInData.employee_id,
      date: clockInData.timestamp.split('T')[0],
      clock_in_time: new Date(clockInData.timestamp).toTimeString().substring(0, 8),
      clock_in_location: clockInData.location,
      validation_result: validation,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw new Error('Failed to record attendance: ' + error.message)
  
  return attendance
}

async function getCurrentAttendanceRecord(employeeId: string, timestamp: string): Promise<any> {
  const date = timestamp.split('T')[0]
  
  const { data: attendance } = await supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .single()

  return {
    found: !!attendance,
    record: attendance
  }
}

function calculateShiftDuration(clockIn: string, clockOut: string, employee: any): any {
  const start = new Date(`2000-01-01T${clockIn}`)
  const end = new Date(`2000-01-01T${clockOut}`)
  
  const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  const regularHours = Math.min(totalHours, ATTENDANCE_CONFIG.OVERTIME_THRESHOLD_HOURS)
  const overtimeHours = Math.max(0, totalHours - ATTENDANCE_CONFIG.OVERTIME_THRESHOLD_HOURS)
  
  const hourlyRate = employee.hourly_rate || 50000
  const overtimeRate = hourlyRate * 1.5
  const grossPay = (regularHours * hourlyRate) + (overtimeHours * overtimeRate)

  return {
    total_hours: Math.round(totalHours * 100) / 100,
    regular_hours: Math.round(regularHours * 100) / 100,
    overtime_hours: Math.round(overtimeHours * 100) / 100,
    gross_pay: Math.round(grossPay)
  }
}

async function checkOvertimeApproval(employeeId: string, overtimeHours: number): Promise<any> {
  // Check for pre-approved overtime requests
  const { data: approval } = await supabaseAdmin
    .from('overtime_requests')
    .select('status')
    .eq('employee_id', employeeId)
    .eq('date', new Date().toISOString().split('T')[0])
    .eq('status', 'approved')
    .single()

  return {
    approved: !!approval || overtimeHours < ATTENDANCE_CONFIG.AUTO_APPROVE_OVERTIME_HOURS
  }
}

async function recordClockOut(attendanceId: string, clockOutData: any, shiftCalc: any, validation: any): Promise<any> {
  const { data: attendance, error } = await supabaseAdmin
    .from('attendance')
    .update({
      clock_out_time: new Date(clockOutData.timestamp).toTimeString().substring(0, 8),
      clock_out_location: clockOutData.location,
      total_hours: shiftCalc.total_hours,
      overtime_hours: shiftCalc.overtime_hours,
      gross_pay: shiftCalc.gross_pay,
      updated_at: new Date().toISOString()
    })
    .eq('id', attendanceId)
    .select()
    .single()

  if (error) throw new Error('Failed to record clock out: ' + error.message)
  
  return attendance
}

async function storeOvertimeRequest(overtimeData: any, userId: string, autoApprove: boolean): Promise<any> {
  const { data: request, error } = await supabaseAdmin
    .from('overtime_requests')
    .insert({
      employee_id: overtimeData.employee_id,
      planned_hours: overtimeData.planned_overtime_hours,
      reason: overtimeData.reason,
      estimated_end_time: overtimeData.estimated_end_time,
      status: autoApprove ? 'approved' : 'pending',
      requested_by: userId,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw new Error('Failed to store overtime request: ' + error.message)
  
  return request
}

function calculateOvertimePay(hourlyRate: number, overtimeHours: number): number {
  return Math.round(hourlyRate * 1.5 * overtimeHours)
}

// Notification functions (placeholder)
async function sendLateAttendanceNotification(employee: any, minutesLate: number): Promise<void> {
  console.log(`Employee ${employee.full_name} is ${minutesLate} minutes late`)
}

async function sendShiftCompletionNotification(employee: any, shiftCalc: any): Promise<void> {
  console.log(`Shift completed for ${employee.full_name}: ${shiftCalc.total_hours} hours`)
}

async function sendOvertimeApprovalNotification(employee: any, overtimeData: any): Promise<void> {
  console.log(`Overtime approval needed for ${employee.full_name}: ${overtimeData.planned_overtime_hours} hours`)
}

function getCurrentShiftStatus(attendance: any, shift: any): string {
  if (!attendance) return 'not_started'
  if (!attendance.clock_out_time) return 'in_progress'
  return 'completed'
}

async function getEmployeeShiftInfo(employeeId: string): Promise<any> {
  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('shift_start, shift_end, position')
    .eq('id', employeeId)
    .single()

  return employee
}

/**
 * Authenticate attendance request
 */
async function authenticateAttendanceRequest(request: Request): Promise<{
  success: boolean
  error?: string
  user_id?: string
}> {
  try {
    const authResult = await getAuthenticatedClient(request)
    if (authResult) {
      return { success: true, user_id: authResult.user.id }
    }

    return { success: false, error: 'Unauthorized access' }

  } catch (error) {
    console.error('Error authenticating attendance request:', error)
    return { success: false, error: 'Authentication failed' }
  }
}

// ===========================================
// MAIN HANDLER WITH ROUTING
// ===========================================

const handler = withCors(createHandler({
  POST: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/clock-in')) {
      return handleClockIn(request)
    } else if (url.pathname.includes('/clock-out')) {
      return handleClockOut(request)
    } else if (url.pathname.includes('/validate-location')) {
      return handleValidateLocation(request)
    } else if (url.pathname.includes('/overtime-request')) {
      return handleOvertimeRequest(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  },
  
  GET: async (request: Request) => {
    const url = new URL(request.url)
    
    if (url.pathname.includes('/shift-status')) {
      return handleGetShiftStatus(request)
    }
    
    return createErrorResponse('Invalid endpoint', 404, undefined, request)
  }
}))

export default handler