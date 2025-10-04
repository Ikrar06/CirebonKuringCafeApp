/**
 * Telegram Bot Notification Service
 * Sends notifications to employees via Telegram
 * Uses templates from templates.ts for message formatting
 */

import {
  // Overtime
  overtimeApprovalTemplate,
  overtimeRejectionTemplate,
  type OvertimeApprovalData,
  type OvertimeRejectionData,

  // Attendance
  attendanceReminderTemplate,
  lateAttendanceWarningTemplate,
  missingClockOutReminderTemplate,
  type AttendanceReminderData,
  type LateAttendanceData,
  type MissingClockOutData,

  // Shift
  shiftScheduleNotificationTemplate,
  weeklyScheduleNotificationTemplate,
  shiftSwapRequestTemplate,
  shiftSwapApprovedTemplate,
  type ShiftScheduleData,
  type WeeklyScheduleData,
  type ShiftSwapRequestData,
  type ShiftSwapApprovedData,

  // Leave
  leaveApprovalTemplate,
  leaveRejectionTemplate,
  leaveReminderTemplate,
  type LeaveApprovalData,
  type LeaveRejectionData,
  type LeaveReminderData,

  // Payroll
  payrollNotificationTemplate,
  payrollReminderTemplate,
  type PayrollData,
  type PayrollReminderData,

  // General
  welcomeMessageTemplate,
  announcementTemplate,
  birthdayTemplate,
  performanceReviewTemplate,
  customMessageTemplate,
  type WelcomeData,
  type AnnouncementData,
  type BirthdayData,
  type PerformanceData,
  type CustomMessageData
} from './templates'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

interface TelegramMessage {
  chat_id: string
  text: string
  parse_mode?: 'HTML' | 'Markdown'
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram bot token not configured')
    return false
  }

  if (!chatId) {
    console.warn('Chat ID not provided')
    return false
  }

  try {
    const payload: TelegramMessage = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    }

    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Telegram API error:', data.description)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return false
  }
}

// ============================================
// OVERTIME NOTIFICATIONS
// ============================================

/**
 * Send overtime request approval notification
 */
export async function sendOvertimeApprovalNotification(
  chatId: string,
  employeeName: string,
  date: string,
  overtimeHours: number,
  overtimePay: number,
  adminNotes?: string
): Promise<boolean> {
  const data: OvertimeApprovalData = {
    employeeName,
    date,
    overtimeHours,
    overtimePay,
    adminNotes
  }

  const message = overtimeApprovalTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send overtime request rejection notification
 */
export async function sendOvertimeRejectionNotification(
  chatId: string,
  employeeName: string,
  date: string,
  overtimeHours: number,
  adminNotes: string
): Promise<boolean> {
  const data: OvertimeRejectionData = {
    employeeName,
    date,
    overtimeHours,
    adminNotes
  }

  const message = overtimeRejectionTemplate(data)
  return sendTelegramMessage(chatId, message)
}

// ============================================
// ATTENDANCE NOTIFICATIONS
// ============================================

/**
 * Send attendance reminder notification
 */
export async function sendAttendanceReminder(
  chatId: string,
  employeeName: string,
  shiftStart?: string,
  shiftEnd?: string
): Promise<boolean> {
  const data: AttendanceReminderData = {
    employeeName,
    shiftStart,
    shiftEnd
  }

  const message = attendanceReminderTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send late attendance warning notification
 */
export async function sendLateAttendanceWarning(
  chatId: string,
  employeeName: string,
  clockInTime: string,
  expectedTime: string,
  minutesLate: number
): Promise<boolean> {
  const data: LateAttendanceData = {
    employeeName,
    clockInTime,
    expectedTime,
    minutesLate
  }

  const message = lateAttendanceWarningTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send missing clock out reminder
 */
export async function sendMissingClockOutReminder(
  chatId: string,
  employeeName: string,
  date: string,
  clockInTime: string
): Promise<boolean> {
  const data: MissingClockOutData = {
    employeeName,
    date,
    clockInTime
  }

  const message = missingClockOutReminderTemplate(data)
  return sendTelegramMessage(chatId, message)
}

// ============================================
// SHIFT NOTIFICATIONS
// ============================================

/**
 * Send shift schedule notification
 */
export async function sendShiftScheduleNotification(
  chatId: string,
  employeeName: string,
  date: string,
  shiftStart: string,
  shiftEnd: string,
  position: string,
  breakDuration?: number,
  notes?: string
): Promise<boolean> {
  const data: ShiftScheduleData = {
    employeeName,
    date,
    shiftStart,
    shiftEnd,
    position,
    breakDuration,
    notes
  }

  const message = shiftScheduleNotificationTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send weekly schedule notification
 */
export async function sendWeeklyScheduleNotification(
  chatId: string,
  employeeName: string,
  weekStart: string,
  weekEnd: string,
  shifts: Array<{
    day: string
    date: string
    shiftStart: string
    shiftEnd: string
    position: string
  }>
): Promise<boolean> {
  const data: WeeklyScheduleData = {
    employeeName,
    weekStart,
    weekEnd,
    shifts
  }

  const message = weeklyScheduleNotificationTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send shift swap request notification
 */
export async function sendShiftSwapRequest(
  chatId: string,
  employeeName: string,
  requestedBy: string,
  date: string,
  originalShift: string,
  swapShift: string
): Promise<boolean> {
  const data: ShiftSwapRequestData = {
    employeeName,
    requestedBy,
    date,
    originalShift,
    swapShift
  }

  const message = shiftSwapRequestTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send shift swap approved notification
 */
export async function sendShiftSwapApproved(
  chatId: string,
  employeeName: string,
  swappedWith: string,
  date: string,
  newShift: string
): Promise<boolean> {
  const data: ShiftSwapApprovedData = {
    employeeName,
    swappedWith,
    date,
    newShift
  }

  const message = shiftSwapApprovedTemplate(data)
  return sendTelegramMessage(chatId, message)
}

// ============================================
// LEAVE NOTIFICATIONS
// ============================================

/**
 * Send leave request approval notification
 */
export async function sendLeaveApprovalNotification(
  chatId: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  days: number,
  adminNotes?: string
): Promise<boolean> {
  const data: LeaveApprovalData = {
    employeeName,
    leaveType,
    startDate,
    endDate,
    totalDays: days,
    adminNotes
  }

  const message = leaveApprovalTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send leave request rejection notification
 */
export async function sendLeaveRejectionNotification(
  chatId: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  adminNotes: string
): Promise<boolean> {
  const data: LeaveRejectionData = {
    employeeName,
    leaveType,
    startDate,
    endDate,
    adminNotes
  }

  const message = leaveRejectionTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send leave reminder notification
 */
export async function sendLeaveReminder(
  chatId: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  daysRemaining: number
): Promise<boolean> {
  const data: LeaveReminderData = {
    employeeName,
    leaveType,
    startDate,
    daysRemaining
  }

  const message = leaveReminderTemplate(data)
  return sendTelegramMessage(chatId, message)
}

// ============================================
// PAYROLL NOTIFICATIONS
// ============================================

/**
 * Send payroll notification
 */
export async function sendPayrollNotification(
  chatId: string,
  employeeName: string,
  month: string,
  year: number,
  baseSalary: number,
  overtimePay: number,
  bonuses: number = 0,
  deductions: number = 0,
  totalPay: number,
  paymentDate?: string
): Promise<boolean> {
  const data: PayrollData = {
    employeeName,
    month,
    year,
    baseSalary,
    overtimePay,
    bonuses,
    deductions,
    totalPay,
    paymentDate
  }

  const message = payrollNotificationTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send payroll reminder notification
 */
export async function sendPayrollReminder(
  chatId: string,
  employeeName: string,
  month: string,
  missingAttendances: number,
  missingOvertimes: number
): Promise<boolean> {
  const data: PayrollReminderData = {
    employeeName,
    month,
    missingAttendances,
    missingOvertimes
  }

  const message = payrollReminderTemplate(data)
  return sendTelegramMessage(chatId, message)
}

// ============================================
// GENERAL NOTIFICATIONS
// ============================================

/**
 * Send welcome message to new employee
 */
export async function sendWelcomeMessage(
  chatId: string,
  employeeName: string,
  position: string,
  startDate: string,
  cafeName: string = 'Cirebon Kuring Cafe'
): Promise<boolean> {
  const data: WelcomeData = {
    employeeName,
    position,
    startDate,
    cafeName
  }

  const message = welcomeMessageTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send announcement to employee(s)
 */
export async function sendAnnouncement(
  chatId: string,
  title: string,
  announcementMessage: string,
  date?: string,
  urgent: boolean = false
): Promise<boolean> {
  const data: AnnouncementData = {
    title,
    message: announcementMessage,
    date,
    urgent
  }

  const message = announcementTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send birthday message
 */
export async function sendBirthdayMessage(
  chatId: string,
  employeeName: string,
  age?: number
): Promise<boolean> {
  const data: BirthdayData = {
    employeeName,
    age
  }

  const message = birthdayTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send performance review notification
 */
export async function sendPerformanceReview(
  chatId: string,
  employeeName: string,
  period: string,
  rating: number,
  strengths: string[],
  improvements: string[],
  managerNotes?: string
): Promise<boolean> {
  const data: PerformanceData = {
    employeeName,
    period,
    rating,
    strengths,
    improvements,
    managerNotes
  }

  const message = performanceReviewTemplate(data)
  return sendTelegramMessage(chatId, message)
}

/**
 * Send custom notification to employee
 */
export async function sendEmployeeNotification(
  chatId: string,
  employeeName: string,
  title: string,
  customMessage: string,
  emoji?: string
): Promise<boolean> {
  const data: CustomMessageData = {
    employeeName,
    title,
    message: customMessage,
    emoji
  }

  const message = customMessageTemplate(data)
  return sendTelegramMessage(chatId, message)
}

// ============================================
// BATCH NOTIFICATIONS
// ============================================

/**
 * Send notification to multiple employees
 */
export async function sendBulkNotification(
  chatIds: string[],
  messageGenerator: () => string
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    chatIds.map(chatId => sendTelegramMessage(chatId, messageGenerator()))
  )

  const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length
  const failed = results.length - success

  return { success, failed }
}

/**
 * Send shift notifications to multiple employees
 */
export async function sendBulkShiftNotifications(
  shifts: Array<{
    chatId: string
    employeeName: string
    date: string
    shiftStart: string
    shiftEnd: string
    position: string
    breakDuration?: number
    notes?: string
  }>
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    shifts.map(shift =>
      sendShiftScheduleNotification(
        shift.chatId,
        shift.employeeName,
        shift.date,
        shift.shiftStart,
        shift.shiftEnd,
        shift.position,
        shift.breakDuration,
        shift.notes
      )
    )
  )

  const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length
  const failed = results.length - success

  return { success, failed }
}
