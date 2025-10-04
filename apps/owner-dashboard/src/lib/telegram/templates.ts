/**
 * Telegram Message Templates
 * Contains all message templates for employee notifications
 * Separated from bot.ts for better maintainability and customization
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format currency to IDR format
 */
function formatCurrency(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`
}

/**
 * Format date to Indonesian format
 */
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format time (HH:MM)
 */
function formatTime(time: string): string {
  return time
}

/**
 * Get position label in Indonesian
 */
function getPositionLabel(position: string): string {
  const labels: Record<string, string> = {
    pelayan: 'Pelayan',
    dapur: 'Dapur',
    kasir: 'Kasir',
    stok: 'Stok',
    manager: 'Manager'
  }
  return labels[position] || position
}

// ============================================
// OVERTIME TEMPLATES
// ============================================

export interface OvertimeApprovalData {
  employeeName: string
  date: string
  overtimeHours: number
  overtimePay: number
  adminNotes?: string
}

export function overtimeApprovalTemplate(data: OvertimeApprovalData): string {
  return `
<b>✅ Permintaan Lembur Disetujui</b>

Hai ${data.employeeName},

Permintaan lembur Anda telah disetujui:

📅 <b>Tanggal:</b> ${formatDate(data.date)}
⏰ <b>Jam Lembur:</b> ${data.overtimeHours.toFixed(1)} jam
💰 <b>Upah Lembur:</b> ${formatCurrency(data.overtimePay)}

${data.adminNotes ? `📝 <b>Catatan Admin:</b> ${data.adminNotes}\n` : ''}
Terima kasih atas kerja keras Anda! 💪
  `.trim()
}

export interface OvertimeRejectionData {
  employeeName: string
  date: string
  overtimeHours: number
  adminNotes: string
}

export function overtimeRejectionTemplate(data: OvertimeRejectionData): string {
  return `
<b>❌ Permintaan Lembur Ditolak</b>

Hai ${data.employeeName},

Permintaan lembur Anda telah ditolak:

📅 <b>Tanggal:</b> ${formatDate(data.date)}
⏰ <b>Jam Lembur:</b> ${data.overtimeHours.toFixed(1)} jam

📝 <b>Alasan:</b> ${data.adminNotes}

Jika ada pertanyaan, silakan hubungi manajer Anda.
  `.trim()
}

// ============================================
// ATTENDANCE TEMPLATES
// ============================================

export interface AttendanceReminderData {
  employeeName: string
  shiftStart?: string
  shiftEnd?: string
}

export function attendanceReminderTemplate(data: AttendanceReminderData): string {
  return `
<b>⏰ Pengingat Absensi</b>

Hai ${data.employeeName},

Jangan lupa untuk absen masuk/keluar hari ini!

${data.shiftStart ? `🕐 <b>Jam Masuk:</b> ${formatTime(data.shiftStart)}\n` : ''}${data.shiftEnd ? `🕐 <b>Jam Keluar:</b> ${formatTime(data.shiftEnd)}\n` : ''}
📍 Pastikan GPS aktif saat absen
⏱️ Absen masuk saat mulai kerja
⏱️ Absen keluar saat selesai kerja

Semangat bekerja! 💪
  `.trim()
}

export interface LateAttendanceData {
  employeeName: string
  clockInTime: string
  expectedTime: string
  minutesLate: number
}

export function lateAttendanceWarningTemplate(data: LateAttendanceData): string {
  return `
<b>⚠️ Peringatan Keterlambatan</b>

Hai ${data.employeeName},

Anda terlambat absen masuk hari ini:

⏰ <b>Waktu Absen:</b> ${formatTime(data.clockInTime)}
⏰ <b>Waktu Seharusnya:</b> ${formatTime(data.expectedTime)}
⏱️ <b>Terlambat:</b> ${data.minutesLate} menit

Harap datang tepat waktu. Keterlambatan berulang dapat mempengaruhi rekam absensi Anda.
  `.trim()
}

export interface MissingClockOutData {
  employeeName: string
  date: string
  clockInTime: string
}

export function missingClockOutReminderTemplate(data: MissingClockOutData): string {
  return `
<b>🔔 Lupa Absen Keluar?</b>

Hai ${data.employeeName},

Anda belum absen keluar hari ini:

📅 <b>Tanggal:</b> ${formatDate(data.date)}
🕐 <b>Absen Masuk:</b> ${formatTime(data.clockInTime)}

Jangan lupa untuk absen keluar saat selesai kerja!
  `.trim()
}

// ============================================
// SHIFT SCHEDULE TEMPLATES
// ============================================

export interface ShiftScheduleData {
  employeeName: string
  date: string
  shiftStart: string
  shiftEnd: string
  position: string
  breakDuration?: number
  notes?: string
}

export function shiftScheduleNotificationTemplate(data: ShiftScheduleData): string {
  return `
<b>📅 Jadwal Shift Anda</b>

Hai ${data.employeeName},

Jadwal shift Anda untuk besok:

📅 <b>Tanggal:</b> ${formatDate(data.date)}
⏰ <b>Jam Masuk:</b> ${formatTime(data.shiftStart)}
⏰ <b>Jam Keluar:</b> ${formatTime(data.shiftEnd)}
👔 <b>Posisi:</b> ${getPositionLabel(data.position)}
${data.breakDuration ? `☕ <b>Istirahat:</b> ${data.breakDuration} menit\n` : ''}${data.notes ? `📝 <b>Catatan:</b> ${data.notes}\n` : ''}
Sampai jumpa di tempat kerja! 👋
  `.trim()
}

export interface WeeklyScheduleData {
  employeeName: string
  weekStart: string
  weekEnd: string
  shifts: Array<{
    day: string
    date: string
    shiftStart: string
    shiftEnd: string
    position: string
  }>
}

export function weeklyScheduleNotificationTemplate(data: WeeklyScheduleData): string {
  const shiftsList = data.shifts.map(shift =>
    `• <b>${shift.day}</b> (${new Date(shift.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}): ${formatTime(shift.shiftStart)} - ${formatTime(shift.shiftEnd)}`
  ).join('\n')

  return `
<b>📅 Jadwal Shift Mingguan</b>

Hai ${data.employeeName},

Berikut jadwal shift Anda untuk minggu ini:
${formatDate(data.weekStart)} - ${formatDate(data.weekEnd)}

${shiftsList}

Jangan lupa cek jadwal setiap hari! ⏰
  `.trim()
}

export interface ShiftSwapRequestData {
  employeeName: string
  requestedBy: string
  date: string
  originalShift: string
  swapShift: string
}

export function shiftSwapRequestTemplate(data: ShiftSwapRequestData): string {
  return `
<b>🔄 Permintaan Tukar Shift</b>

Hai ${data.employeeName},

${data.requestedBy} ingin menukar shift dengan Anda:

📅 <b>Tanggal:</b> ${formatDate(data.date)}
🔄 <b>Shift ${data.requestedBy}:</b> ${data.originalShift}
🔄 <b>Shift Anda:</b> ${data.swapShift}

Silakan konfirmasi permintaan ini melalui aplikasi.
  `.trim()
}

export interface ShiftSwapApprovedData {
  employeeName: string
  swappedWith: string
  date: string
  newShift: string
}

export function shiftSwapApprovedTemplate(data: ShiftSwapApprovedData): string {
  return `
<b>✅ Tukar Shift Disetujui</b>

Hai ${data.employeeName},

Permintaan tukar shift Anda telah disetujui:

📅 <b>Tanggal:</b> ${formatDate(data.date)}
👤 <b>Ditukar dengan:</b> ${data.swappedWith}
⏰ <b>Shift Baru Anda:</b> ${data.newShift}

Jangan lupa datang sesuai jadwal baru! 📅
  `.trim()
}

// ============================================
// LEAVE TEMPLATES
// ============================================

export interface LeaveApprovalData {
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  totalDays: number
  adminNotes?: string
}

export function leaveApprovalTemplate(data: LeaveApprovalData): string {
  return `
<b>✅ Permintaan Cuti Disetujui</b>

Hai ${data.employeeName},

Permintaan cuti Anda telah disetujui:

📋 <b>Jenis:</b> ${data.leaveType}
📅 <b>Dari:</b> ${formatDate(data.startDate)}
📅 <b>Sampai:</b> ${formatDate(data.endDate)}
📊 <b>Total:</b> ${data.totalDays} hari

${data.adminNotes ? `📝 <b>Catatan Admin:</b> ${data.adminNotes}\n` : ''}
Nikmati waktu istirahat Anda! 🌴
  `.trim()
}

export interface LeaveRejectionData {
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  adminNotes: string
}

export function leaveRejectionTemplate(data: LeaveRejectionData): string {
  return `
<b>❌ Permintaan Cuti Ditolak</b>

Hai ${data.employeeName},

Permintaan cuti Anda telah ditolak:

📋 <b>Jenis:</b> ${data.leaveType}
📅 <b>Dari:</b> ${formatDate(data.startDate)}
📅 <b>Sampai:</b> ${formatDate(data.endDate)}

📝 <b>Alasan:</b> ${data.adminNotes}

Silakan hubungi manajer untuk informasi lebih lanjut.
  `.trim()
}

export interface LeaveReminderData {
  employeeName: string
  leaveType: string
  startDate: string
  daysRemaining: number
}

export function leaveReminderTemplate(data: LeaveReminderData): string {
  return `
<b>🔔 Pengingat Cuti</b>

Hai ${data.employeeName},

Cuti Anda akan segera dimulai:

📋 <b>Jenis:</b> ${data.leaveType}
📅 <b>Mulai:</b> ${formatDate(data.startDate)}
⏰ <b>Tersisa:</b> ${data.daysRemaining} hari lagi

Pastikan semua pekerjaan sudah diselesaikan! ✅
  `.trim()
}

// ============================================
// PAYROLL TEMPLATES
// ============================================

export interface PayrollData {
  employeeName: string
  month: string
  year: number
  baseSalary: number
  overtimePay: number
  bonuses: number
  deductions: number
  totalPay: number
  paymentDate?: string
}

export function payrollNotificationTemplate(data: PayrollData): string {
  return `
<b>💰 Slip Gaji ${data.month} ${data.year}</b>

Hai ${data.employeeName},

Gaji Anda untuk bulan ${data.month} telah diproses:

💵 <b>Gaji Pokok:</b> ${formatCurrency(data.baseSalary)}
⏰ <b>Upah Lembur:</b> ${formatCurrency(data.overtimePay)}
${data.bonuses > 0 ? `🎁 <b>Bonus:</b> ${formatCurrency(data.bonuses)}\n` : ''}${data.deductions > 0 ? `➖ <b>Potongan:</b> ${formatCurrency(data.deductions)}\n` : ''}
━━━━━━━━━━━━━━━
💰 <b>Total:</b> ${formatCurrency(data.totalPay)}

${data.paymentDate ? `📅 <b>Tanggal Transfer:</b> ${formatDate(data.paymentDate)}\n` : ''}
Terima kasih atas kerja keras Anda! 🙏
  `.trim()
}

export interface PayrollReminderData {
  employeeName: string
  month: string
  missingAttendances: number
  missingOvertimes: number
}

export function payrollReminderTemplate(data: PayrollReminderData): string {
  return `
<b>⚠️ Pengingat Penggajian</b>

Hai ${data.employeeName},

Pemrosesan gaji ${data.month} akan segera dimulai.

${data.missingAttendances > 0 ? `⚠️ <b>Absensi belum lengkap:</b> ${data.missingAttendances} hari\n` : ''}${data.missingOvertimes > 0 ? `⚠️ <b>Lembur belum diklaim:</b> ${data.missingOvertimes} kali\n` : ''}
Pastikan semua data sudah lengkap sebelum tanggal penutupan! 📋
  `.trim()
}

// ============================================
// GENERAL TEMPLATES
// ============================================

export interface WelcomeData {
  employeeName: string
  position: string
  startDate: string
  cafeName: string
}

export function welcomeMessageTemplate(data: WelcomeData): string {
  return `
<b>👋 Selamat Bergabung!</b>

Hai ${data.employeeName},

Selamat datang di ${data.cafeName}! 🎉

👔 <b>Posisi:</b> ${getPositionLabel(data.position)}
📅 <b>Mulai Kerja:</b> ${formatDate(data.startDate)}

Anda akan menerima notifikasi untuk:
• Jadwal shift harian/mingguan
• Pengingat absensi
• Update lembur & cuti
• Slip gaji bulanan

Jika ada pertanyaan, jangan ragu untuk bertanya!

Semangat bekerja! 💪
  `.trim()
}

export interface AnnouncementData {
  title: string
  message: string
  date?: string
  urgent?: boolean
}

export function announcementTemplate(data: AnnouncementData): string {
  const icon = data.urgent ? '🚨' : '📢'
  const prefix = data.urgent ? '<b>PENTING</b>' : '<b>PENGUMUMAN</b>'

  return `
${icon} ${prefix}

<b>${data.title}</b>

${data.message}

${data.date ? `\n📅 <b>Tanggal:</b> ${formatDate(data.date)}` : ''}
  `.trim()
}

export interface BirthdayData {
  employeeName: string
  age?: number
}

export function birthdayTemplate(data: BirthdayData): string {
  return `
<b>🎂 Selamat Ulang Tahun!</b>

Hai ${data.employeeName},

Selamat ulang tahun${data.age ? ` yang ke-${data.age}` : ''}! 🎉

Semoga panjang umur, sehat selalu, dan semakin sukses! 🎈

Dari seluruh tim ${process.env.CAFE_NAME || 'Cirebon Kuring Cafe'} 💙
  `.trim()
}

export interface PerformanceData {
  employeeName: string
  period: string
  rating: number
  strengths: string[]
  improvements: string[]
  managerNotes?: string
}

export function performanceReviewTemplate(data: PerformanceData): string {
  const stars = '⭐'.repeat(data.rating)
  const strengthsList = data.strengths.map(s => `• ${s}`).join('\n')
  const improvementsList = data.improvements.map(i => `• ${i}`).join('\n')

  return `
<b>📊 Review Kinerja ${data.period}</b>

Hai ${data.employeeName},

Berikut hasil review kinerja Anda:

${stars} <b>Rating:</b> ${data.rating}/5

<b>✅ Kekuatan:</b>
${strengthsList}

${data.improvements.length > 0 ? `<b>💡 Area Perbaikan:</b>\n${improvementsList}\n` : ''}
${data.managerNotes ? `\n📝 <b>Catatan Manajer:</b>\n${data.managerNotes}\n` : ''}
Terus tingkatkan kinerja Anda! 💪
  `.trim()
}

// ============================================
// CUSTOM TEMPLATE
// ============================================

export interface CustomMessageData {
  employeeName: string
  title: string
  message: string
  emoji?: string
}

export function customMessageTemplate(data: CustomMessageData): string {
  const icon = data.emoji || '📬'

  return `
${icon} <b>${data.title}</b>

Hai ${data.employeeName},

${data.message}
  `.trim()
}
