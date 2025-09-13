import { UserRole, EmployeeStatus } from '../enums/index'

// Base User type from Supabase Auth
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  role: UserRole
}

// Device Account for tablet roles
export interface DeviceAccount {
  id: string
  device_name: string
  device_role: 'kasir' | 'dapur' | 'pelayan' | 'stok'
  device_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Employee Profile
export interface Employee {
  id: string
  user_id: string
  employee_code: string
  full_name: string
  phone: string
  address: string
  date_of_birth: string
  hire_date: string
  position: string
  department: string
  salary: number
  status: EmployeeStatus
  emergency_contact_name: string
  emergency_contact_phone: string
  telegram_chat_id?: string
  created_at: string
  updated_at: string
  
  // Relations
  user?: User
}

// Employee with attendance info
export interface EmployeeWithAttendance extends Employee {
  current_shift?: Shift
  attendance_today?: Attendance
}

// Shift Management
export interface Shift {
  id: string
  name: string
  start_time: string // HH:mm format
  end_time: string   // HH:mm format
  is_active: boolean
  created_at: string
  updated_at: string
}

// Employee Shift Assignment
export interface EmployeeShift {
  id: string
  employee_id: string
  shift_id: string
  day_of_week: number // 0-6 (Sunday-Saturday)
  is_active: boolean
  created_at: string
  updated_at: string
  
  // Relations
  employee?: Employee
  shift?: Shift
}

// Attendance Record
export interface Attendance {
  id: string
  employee_id: string
  date: string
  clock_in: string
  clock_out?: string
  clock_in_location: {
    latitude: number
    longitude: number
    address: string
  }
  clock_out_location?: {
    latitude: number
    longitude: number
    address: string
  }
  regular_hours: number
  overtime_hours: number
  total_hours: number
  status: 'present' | 'late' | 'absent' | 'half_day'
  notes?: string
  created_at: string
  updated_at: string
  
  // Relations
  employee?: Employee
}

// Leave Request
export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: 'annual' | 'sick' | 'emergency' | 'maternity' | 'unpaid'
  start_date: string
  end_date: string
  days_requested: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  
  // Relations
  employee?: Employee
  approver?: Employee
}

// Overtime Request
export interface OvertimeRequest {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
  hours_requested: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  
  // Relations
  employee?: Employee
  approver?: Employee
}

// Payroll
export interface Payroll {
  id: string
  employee_id: string
  period_start: string
  period_end: string
  basic_salary: number
  overtime_pay: number
  allowances: number
  deductions: number
  gross_pay: number
  tax_deduction: number
  net_pay: number
  status: 'draft' | 'processed' | 'paid'
  paid_at?: string
  created_at: string
  updated_at: string
  
  // Relations
  employee?: Employee
}

// Auth-related types
export interface LoginCredentials {
  email: string
  password: string
}

export interface DeviceLoginCredentials {
  device_id: string
  device_role: 'kasir' | 'dapur' | 'pelayan' | 'stok'
}

export interface AuthResponse {
  user: User
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

// Location validation
export interface LocationValidation {
  latitude: number
  longitude: number
  accuracy: number
  is_valid: boolean
  distance_from_cafe: number
}

// Employee Statistics
export interface EmployeeStats {
  total_employees: number
  active_employees: number
  present_today: number
  absent_today: number
  late_today: number
  overtime_this_month: number
}
