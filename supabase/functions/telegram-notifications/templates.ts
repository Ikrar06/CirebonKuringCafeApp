/**
 * Telegram Message Templates
 * 
 * Provides message templates for different notification types
 * Supports Indonesian language with professional cafe context
 */

// Notification types
export type NotificationType = 
  | 'order_received'
  | 'payment_received' 
  | 'payment_verified'
  | 'payment_rejected'
  | 'order_preparing'
  | 'order_ready'
  | 'order_completed'
  | 'order_cancelled'
  | 'stock_low'
  | 'stock_out'
  | 'employee_clockin'
  | 'employee_clockout'
  | 'overtime_request'
  | 'overtime_approved'
  | 'overtime_rejected'
  | 'daily_report'
  | 'monthly_report'
  | 'system_alert'
  | 'shift_reminder'
  | 'payslip_ready'
  | 'birthday_reminder'
  | 'maintenance_alert'

// Template data interfaces
interface BaseTemplateData {
  cafe_name?: string
  timestamp?: string
}

interface OrderTemplateData extends BaseTemplateData {
  order_number: string
  customer_name: string
  table_number?: number
  total_amount?: number
  items_count?: number
  payment_method?: string
  estimated_time?: number
}

interface StockTemplateData extends BaseTemplateData {
  ingredient_name: string
  current_stock: number
  minimum_stock: number
  unit: string
  supplier?: string
}

interface EmployeeTemplateData extends BaseTemplateData {
  employee_name: string
  position?: string
  shift_time?: string
  overtime_hours?: number
  total_pay?: number
}

interface ReportTemplateData extends BaseTemplateData {
  period: string
  total_revenue: number
  total_orders: number
  best_selling_item?: string
  profit_margin?: number
}

/**
 * Get message template for notification type
 */
export function getMessageTemplate(
  notificationType: NotificationType,
  data: any
): {
  success: boolean
  message?: string
  error?: string
} {
  try {
    const cafe_name = data.cafe_name || 'Cafe Management System'
    const timestamp = data.timestamp || new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Makassar',
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    let message = ''

    switch (notificationType) {
      case 'order_received':
        message = getOrderReceivedTemplate(data as OrderTemplateData)
        break
      case 'payment_received':
        message = getPaymentReceivedTemplate(data as OrderTemplateData)
        break
      case 'payment_verified':
        message = getPaymentVerifiedTemplate(data as OrderTemplateData)
        break
      case 'payment_rejected':
        message = getPaymentRejectedTemplate(data as OrderTemplateData)
        break
      case 'order_preparing':
        message = getOrderPreparingTemplate(data as OrderTemplateData)
        break
      case 'order_ready':
        message = getOrderReadyTemplate(data as OrderTemplateData)
        break
      case 'order_completed':
        message = getOrderCompletedTemplate(data as OrderTemplateData)
        break
      case 'order_cancelled':
        message = getOrderCancelledTemplate(data as OrderTemplateData)
        break
      case 'stock_low':
        message = getStockLowTemplate(data as StockTemplateData)
        break
      case 'stock_out':
        message = getStockOutTemplate(data as StockTemplateData)
        break
      case 'employee_clockin':
        message = getEmployeeClockInTemplate(data as EmployeeTemplateData)
        break
      case 'employee_clockout':
        message = getEmployeeClockOutTemplate(data as EmployeeTemplateData)
        break
      case 'overtime_request':
        message = getOvertimeRequestTemplate(data as EmployeeTemplateData)
        break
      case 'overtime_approved':
        message = getOvertimeApprovedTemplate(data as EmployeeTemplateData)
        break
      case 'overtime_rejected':
        message = getOvertimeRejectedTemplate(data as EmployeeTemplateData)
        break
      case 'daily_report':
        message = getDailyReportTemplate(data as ReportTemplateData)
        break
      case 'monthly_report':
        message = getMonthlyReportTemplate(data as ReportTemplateData)
        break
      case 'shift_reminder':
        message = getShiftReminderTemplate(data as EmployeeTemplateData)
        break
      case 'payslip_ready':
        message = getPayslipReadyTemplate(data as EmployeeTemplateData)
        break
      case 'birthday_reminder':
        message = getBirthdayReminderTemplate(data as EmployeeTemplateData)
        break
      case 'system_alert':
        message = getSystemAlertTemplate(data)
        break
      case 'maintenance_alert':
        message = getMaintenanceAlertTemplate(data)
        break
      default:
        return {
          success: false,
          error: `Unknown notification type: ${notificationType}`
        }
    }

    // Add footer with timestamp
    message += `\n\n⏰ ${timestamp}`
    message += `\n📍 ${cafe_name}`

    return {
      success: true,
      message
    }

  } catch (error) {
    console.error('Error generating message template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Template generation failed'
    }
  }
}

// ===========================================
// ORDER TEMPLATES
// ===========================================

function getOrderReceivedTemplate(data: OrderTemplateData): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

  return `🔔 *PESANAN BARU*

📋 Order: *${data.order_number}*
👤 Customer: ${data.customer_name}
🪑 Meja: ${data.table_number || 'Takeaway'}
💰 Total: ${data.total_amount ? formatCurrency(data.total_amount) : 'N/A'}
📦 Items: ${data.items_count || 0} item

⏳ Menunggu pembayaran dan verifikasi kasir`
}

function getPaymentReceivedTemplate(data: OrderTemplateData): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

  return `💳 *PEMBAYARAN DITERIMA*

📋 Order: *${data.order_number}*
👤 Customer: ${data.customer_name}
💰 Jumlah: ${data.total_amount ? formatCurrency(data.total_amount) : 'N/A'}
💳 Metode: ${data.payment_method || 'N/A'}

⚠️ *Perlu verifikasi kasir*
Silakan cek bukti pembayaran di tablet kasir`
}

function getPaymentVerifiedTemplate(data: OrderTemplateData): string {
  return `✅ *PEMBAYARAN TERVERIFIKASI*

📋 Order: *${data.order_number}*
👤 Customer: ${data.customer_name}
🪑 Meja: ${data.table_number || 'Takeaway'}

🍳 Order diteruskan ke dapur
⏱️ Estimasi: ${data.estimated_time || 15} menit`
}

function getPaymentRejectedTemplate(data: OrderTemplateData): string {
  return `❌ *PEMBAYARAN DITOLAK*

📋 Order: *${data.order_number}*
👤 Customer: ${data.customer_name}

⚠️ Bukti pembayaran tidak valid
Customer perlu melakukan pembayaran ulang`
}

function getOrderPreparingTemplate(data: OrderTemplateData): string {
  return `🍳 *ORDER SEDANG DIPROSES*

📋 Order: *${data.order_number}*
👤 Customer: ${data.customer_name}
🪑 Meja: ${data.table_number || 'Takeaway'}

👨‍🍳 Dapur sedang memproses pesanan
⏱️ Estimasi selesai: ${data.estimated_time || 15} menit`
}

function getOrderReadyTemplate(data: OrderTemplateData): string {
  return `🔔 *ORDER SIAP!*

📋 Order: *${data.order_number}*
👤 Customer: ${data.customer_name}
🪑 Meja: ${data.table_number || 'Takeaway'}

✅ Pesanan siap diantar
🚶‍♂️ Pelayan segera kirim ke meja`
}

function getOrderCompletedTemplate(data: OrderTemplateData): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

  return `🎉 *ORDER SELESAI*

📋 Order: *${data.order_number}*
👤 Customer: ${data.customer_name}
💰 Total: ${data.total_amount ? formatCurrency(data.total_amount) : 'N/A'}

✅ Pesanan telah disajikan dan diselesaikan
🪑 Meja ${data.table_number || 'N/A'} tersedia kembali`
}

function getOrderCancelledTemplate(data: OrderTemplateData): string {
  return `🚫 *ORDER DIBATALKAN*

📋 Order: *${data.order_number}*
👤 Customer: ${data.customer_name}
🪑 Meja: ${data.table_number || 'Takeaway'}

⚠️ Pesanan telah dibatalkan
💸 Refund diproses jika pembayaran sudah dilakukan`
}

// ===========================================
// STOCK TEMPLATES
// ===========================================

function getStockLowTemplate(data: StockTemplateData): string {
  return `⚠️ *STOK MENIPIS*

📦 Bahan: *${data.ingredient_name}*
📊 Stok saat ini: ${data.current_stock} ${data.unit}
🔴 Minimum: ${data.minimum_stock} ${data.unit}

🛒 Segera lakukan pemesanan ulang
${data.supplier ? `📞 Supplier: ${data.supplier}` : ''}`
}

function getStockOutTemplate(data: StockTemplateData): string {
  return `🚨 *STOK HABIS!*

📦 Bahan: *${data.ingredient_name}*
📊 Stok: 0 ${data.unit}

❌ Menu terkait tidak dapat dipesan
🛒 URGENT: Segera isi ulang stok!
${data.supplier ? `📞 Hubungi: ${data.supplier}` : ''}`
}

// ===========================================
// EMPLOYEE TEMPLATES  
// ===========================================

function getEmployeeClockInTemplate(data: EmployeeTemplateData): string {
  return `🕐 *MASUK KERJA*

👤 ${data.employee_name}
💼 ${data.position || 'Staff'}
⏰ Clock In: ${data.shift_time || 'Sekarang'}

✅ Absensi berhasil dicatat
🎯 Semangat bekerja hari ini!`
}

function getEmployeeClockOutTemplate(data: EmployeeTemplateData): string {
  return `🕐 *PULANG KERJA*

👤 ${data.employee_name}
💼 ${data.position || 'Staff'}
⏰ Clock Out: ${data.shift_time || 'Sekarang'}

✅ Shift hari ini selesai
👏 Terima kasih atas kerja kerasnya!`
}

function getOvertimeRequestTemplate(data: EmployeeTemplateData): string {
  return `⏰ *PENGAJUAN LEMBUR*

👤 ${data.employee_name}
💼 ${data.position || 'Staff'}
🕐 Durasi: ${data.overtime_hours || 0} jam

⚠️ Perlu persetujuan owner
📱 Cek dashboard untuk approve/reject`
}

function getOvertimeApprovedTemplate(data: EmployeeTemplateData): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

  return `✅ *LEMBUR DISETUJUI*

👤 ${data.employee_name}
🕐 Durasi: ${data.overtime_hours || 0} jam
💰 Bayaran: ${data.total_pay ? formatCurrency(data.total_pay) : 'N/A'}

✅ Lembur telah disetujui
💳 Akan dibayar di slip gaji bulan ini`
}

function getOvertimeRejectedTemplate(data: EmployeeTemplateData): string {
  return `❌ *LEMBUR DITOLAK*

👤 ${data.employee_name}
🕐 Durasi: ${data.overtime_hours || 0} jam

❌ Pengajuan lembur tidak disetujui
📱 Hubungi owner untuk penjelasan`
}

function getShiftReminderTemplate(data: EmployeeTemplateData): string {
  return `⏰ *PENGINGAT SHIFT*

Halo ${data.employee_name}! 👋

🕐 Shift Anda dimulai pukul ${data.shift_time || 'N/A'}
📍 Jangan lupa absen saat tiba
📱 Gunakan aplikasi untuk clock in

⏰ Datang 10 menit lebih awal ya!`
}

function getPayslipReadyTemplate(data: EmployeeTemplateData): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

  return `💰 *SLIP GAJI TERSEDIA*

Halo ${data.employee_name}! 👋

📊 Slip gaji bulan ini sudah siap
💳 Total: ${data.total_pay ? formatCurrency(data.total_pay) : 'N/A'}

📱 Login ke portal karyawan untuk melihat detail
🔍 Cek rincian gaji, lembur, dan potongan`
}

function getBirthdayReminderTemplate(data: EmployeeTemplateData): string {
  return `🎂 *SELAMAT ULANG TAHUN!*

Selamat ulang tahun ${data.employee_name}! 🎉

🎈 Semoga panjang umur dan sehat selalu
🍰 Rezeki semakin lancar
🎁 Karir semakin cemerlang

Terima kasih sudah menjadi bagian tim kami! 👏`
}

// ===========================================
// REPORT TEMPLATES
// ===========================================

function getDailyReportTemplate(data: ReportTemplateData): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

  return `📊 *LAPORAN HARIAN*

📅 ${data.period}

💰 Total Pendapatan: ${formatCurrency(data.total_revenue)}
📦 Total Order: ${data.total_orders}
🏆 Best Seller: ${data.best_selling_item || 'N/A'}
📈 Profit Margin: ${data.profit_margin || 0}%

${data.total_revenue > 0 ? '🎉 Hari yang produktif!' : '📈 Mari semangat besok!'}`
}

function getMonthlyReportTemplate(data: ReportTemplateData): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

  return `📊 *LAPORAN BULANAN*

📅 ${data.period}

💰 Total Pendapatan: ${formatCurrency(data.total_revenue)}
📦 Total Order: ${data.total_orders}
🏆 Best Seller: ${data.best_selling_item || 'N/A'}
📈 Profit Margin: ${data.profit_margin || 0}%

📈 Evaluasi kinerja dan strategi bulan depan`
}

// ===========================================
// SYSTEM TEMPLATES
// ===========================================

function getSystemAlertTemplate(data: any): string {
  return `🚨 *SISTEM ALERT*

⚠️ ${data.alert_type || 'System Alert'}

📝 Detail: ${data.message || 'Tidak ada detail'}
🔧 Status: ${data.status || 'Unknown'}

${data.action_required ? `📋 Tindakan: ${data.action_required}` : ''}

🛠️ Segera cek sistem untuk detail lebih lanjut`
}

function getMaintenanceAlertTemplate(data: any): string {
  return `🔧 *MAINTENANCE ALERT*

⚙️ Jenis: ${data.maintenance_type || 'General Maintenance'}
⏰ Jadwal: ${data.scheduled_time || 'TBD'}
⏱️ Durasi: ${data.estimated_duration || 'Unknown'}

${data.affected_services ? `📋 Yang terpengaruh: ${data.affected_services}` : ''}

💡 Siapkan alternatif jika diperlukan`
}