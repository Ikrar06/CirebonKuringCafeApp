/**
 * Database Types for Supabase - Cafe Management System
 * 
 * This file contains all TypeScript interfaces and types for the 43 database tables.
 * Based on the actual Supabase schema with RLS enabled and realtime subscriptions.
 */

export interface Database {
  public: {
    Tables: {
      // 🔒 CORE SYSTEM TABLES
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone?: string
          role: 'owner' | 'employee' | 'device_kasir' | 'device_dapur' | 'device_pelayan' | 'device_stok'
          avatar_url?: string
          is_active: boolean
          last_login?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          phone?: string
          role: 'owner' | 'employee' | 'device_kasir' | 'device_dapur' | 'device_pelayan' | 'device_stok'
          avatar_url?: string
          is_active?: boolean
          last_login?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string
          role?: 'owner' | 'employee' | 'device_kasir' | 'device_dapur' | 'device_pelayan' | 'device_stok'
          avatar_url?: string
          is_active?: boolean
          last_login?: string
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          user_id: string
          employee_code: string
          full_name: string
          position: string
          phone?: string
          email?: string
          address?: string
          nik?: string
          salary: number
          hire_date: string
          status: 'active' | 'inactive' | 'terminated' | 'on_leave'
          emergency_contact?: string
          emergency_phone?: string
          bank_account?: string
          bank_name?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          employee_code: string
          full_name: string
          position: string
          phone?: string
          email?: string
          address?: string
          nik?: string
          salary: number
          hire_date: string
          status?: 'active' | 'inactive' | 'terminated' | 'on_leave'
          emergency_contact?: string
          emergency_phone?: string
          bank_account?: string
          bank_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          employee_code?: string
          full_name?: string
          position?: string
          phone?: string
          email?: string
          address?: string
          nik?: string
          salary?: number
          hire_date?: string
          status?: 'active' | 'inactive' | 'terminated' | 'on_leave'
          emergency_contact?: string
          emergency_phone?: string
          bank_account?: string
          bank_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      device_accounts: {
        Row: {
          id: string
          device_id: string
          device_name: string
          device_role: 'kasir' | 'dapur' | 'pelayan' | 'stok'
          is_active: boolean
          last_used?: string
          location?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          device_name: string
          device_role: 'kasir' | 'dapur' | 'pelayan' | 'stok'
          is_active?: boolean
          last_used?: string
          location?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          device_name?: string
          device_role?: 'kasir' | 'dapur' | 'pelayan' | 'stok'
          is_active?: boolean
          last_used?: string
          location?: string
          created_at?: string
          updated_at?: string
        }
      }
      device_sessions: {
        Row: {
          id: string
          device_id: string
          session_token: string
          employee_id?: string
          started_at: string
          ended_at?: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          session_token: string
          employee_id?: string
          started_at?: string
          ended_at?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          session_token?: string
          employee_id?: string
          started_at?: string
          ended_at?: string
          is_active?: boolean
          created_at?: string
        }
      }

      // 🍽️ MENU & INGREDIENTS TABLES
      menu_categories: {
        Row: {
          id: string
          name: string
          description?: string
          image_url?: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          image_url?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          image_url?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          category_id: string
          name: string
          description?: string
          price: number
          cost: number
          image_url?: string
          status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued'
          preparation_time: number
          calories?: number
          is_vegetarian: boolean
          is_halal: boolean
          allergens?: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string
          price: number
          cost: number
          image_url?: string
          status?: 'active' | 'inactive' | 'out_of_stock' | 'discontinued'
          preparation_time?: number
          calories?: number
          is_vegetarian?: boolean
          is_halal?: boolean
          allergens?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string
          price?: number
          cost?: number
          image_url?: string
          status?: 'active' | 'inactive' | 'out_of_stock' | 'discontinued'
          preparation_time?: number
          calories?: number
          is_vegetarian?: boolean
          is_halal?: boolean
          allergens?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          name: string
          category: string
          unit: string
          current_stock: number
          min_stock: number
          max_stock: number
          unit_cost: number
          supplier_id?: string
          expiry_days?: number
          storage_instructions?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          unit: string
          current_stock: number
          min_stock?: number
          max_stock?: number
          unit_cost: number
          supplier_id?: string
          expiry_days?: number
          storage_instructions?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          unit?: string
          current_stock?: number
          min_stock?: number
          max_stock?: number
          unit_cost?: number
          supplier_id?: string
          expiry_days?: number
          storage_instructions?: string
          created_at?: string
          updated_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          menu_item_id: string
          ingredient_id: string
          quantity: number
          unit: string
          cost: number
          is_optional: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          ingredient_id: string
          quantity: number
          unit: string
          cost: number
          is_optional?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          ingredient_id?: string
          quantity?: number
          unit?: string
          cost?: number
          is_optional?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      menu_customization_groups: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          type: 'single' | 'multiple'
          is_required: boolean
          min_selections: number
          max_selections: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          type: 'single' | 'multiple'
          is_required?: boolean
          min_selections?: number
          max_selections?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          name?: string
          type?: 'single' | 'multiple'
          is_required?: boolean
          min_selections?: number
          max_selections?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      menu_customization_options: {
        Row: {
          id: string
          group_id: string
          name: string
          price_modifier: number
          is_default: boolean
          is_available: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          price_modifier?: number
          is_default?: boolean
          is_available?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          price_modifier?: number
          is_default?: boolean
          is_available?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }

      // 📋 ORDER PROCESSING TABLES
      tables: {
        Row: {
          id: string
          table_number: string
          table_name?: string
          capacity: number
          qr_code: string
          status: 'available' | 'occupied' | 'reserved' | 'cleaning'
          location_area?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_number: string
          table_name?: string
          capacity: number
          qr_code: string
          status?: 'available' | 'occupied' | 'reserved' | 'cleaning'
          location_area?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_number?: string
          table_name?: string
          capacity?: number
          qr_code?: string
          status?: 'available' | 'occupied' | 'reserved' | 'cleaning'
          location_area?: string
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          table_id?: string
          customer_name?: string
          customer_phone?: string
          customer_session_id?: string
          order_type: 'dine_in' | 'takeaway' | 'delivery'
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
          subtotal: number
          tax_amount: number
          service_charge: number
          discount_amount: number
          total_amount: number
          payment_status: 'pending' | 'verified' | 'rejected' | 'refunded'
          notes?: string
          estimated_ready_time?: string
          created_by?: string
          served_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          table_id?: string
          customer_name?: string
          customer_phone?: string
          customer_session_id?: string
          order_type: 'dine_in' | 'takeaway' | 'delivery'
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
          subtotal: number
          tax_amount: number
          service_charge: number
          discount_amount?: number
          total_amount: number
          payment_status?: 'pending' | 'verified' | 'rejected' | 'refunded'
          notes?: string
          estimated_ready_time?: string
          created_by?: string
          served_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          table_id?: string
          customer_name?: string
          customer_phone?: string
          customer_session_id?: string
          order_type?: 'dine_in' | 'takeaway' | 'delivery'
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
          subtotal?: number
          tax_amount?: number
          service_charge?: number
          discount_amount?: number
          total_amount?: number
          payment_status?: 'pending' | 'verified' | 'rejected' | 'refunded'
          notes?: string
          estimated_ready_time?: string
          created_by?: string
          served_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          quantity: number
          unit_price: number
          total_price: number
          special_instructions?: string
          status: 'pending' | 'preparing' | 'ready' | 'served'
          kitchen_notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          quantity: number
          unit_price: number
          total_price: number
          special_instructions?: string
          status?: 'pending' | 'preparing' | 'ready' | 'served'
          kitchen_notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          special_instructions?: string
          status?: 'pending' | 'preparing' | 'ready' | 'served'
          kitchen_notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_customizations: {
        Row: {
          id: string
          order_item_id: string
          customization_option_id: string
          quantity: number
          price_modifier: number
          created_at: string
        }
        Insert: {
          id?: string
          order_item_id: string
          customization_option_id: string
          quantity?: number
          price_modifier: number
          created_at?: string
        }
        Update: {
          id?: string
          order_item_id?: string
          customization_option_id?: string
          quantity?: number
          price_modifier?: number
          created_at?: string
        }
      }
      payment_transactions: {
        Row: {
          id: string
          order_id: string
          payment_method: 'cash' | 'qris' | 'bank_transfer' | 'debit_card' | 'credit_card'
          amount: number
          status: 'pending' | 'verified' | 'rejected' | 'refunded'
          transaction_reference?: string
          proof_image_url?: string
          notes?: string
          processed_by?: string
          processed_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          payment_method: 'cash' | 'qris' | 'bank_transfer' | 'debit_card' | 'credit_card'
          amount: number
          status?: 'pending' | 'verified' | 'rejected' | 'refunded'
          transaction_reference?: string
          proof_image_url?: string
          notes?: string
          processed_by?: string
          processed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          payment_method?: 'cash' | 'qris' | 'bank_transfer' | 'debit_card' | 'credit_card'
          amount?: number
          status?: 'pending' | 'verified' | 'rejected' | 'refunded'
          transaction_reference?: string
          proof_image_url?: string
          notes?: string
          processed_by?: string
          processed_at?: string
          created_at?: string
          updated_at?: string
        }
      }

      // 📦 INVENTORY MANAGEMENT TABLES
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person?: string
          phone?: string
          email?: string
          address?: string
          payment_terms?: string
          is_active: boolean
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string
          phone?: string
          email?: string
          address?: string
          payment_terms?: string
          is_active?: boolean
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string
          phone?: string
          email?: string
          address?: string
          payment_terms?: string
          is_active?: boolean
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          ingredient_id: string
          type: 'stock_in' | 'stock_out' | 'waste' | 'adjustment' | 'transfer'
          quantity: number
          unit_cost?: number
          total_cost?: number
          batch_id?: string
          reference_id?: string
          reference_type?: string
          reason?: string
          performed_by: string
          created_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          type: 'stock_in' | 'stock_out' | 'waste' | 'adjustment' | 'transfer'
          quantity: number
          unit_cost?: number
          total_cost?: number
          batch_id?: string
          reference_id?: string
          reference_type?: string
          reason?: string
          performed_by: string
          created_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          type?: 'stock_in' | 'stock_out' | 'waste' | 'adjustment' | 'transfer'
          quantity?: number
          unit_cost?: number
          total_cost?: number
          batch_id?: string
          reference_id?: string
          reference_type?: string
          reason?: string
          performed_by?: string
          created_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          supplier_id: string
          status: 'draft' | 'sent' | 'confirmed' | 'partial_received' | 'completed' | 'cancelled'
          total_amount: number
          tax_amount: number
          grand_total: number
          order_date: string
          expected_date?: string
          received_date?: string
          notes?: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_number: string
          supplier_id: string
          status?: 'draft' | 'sent' | 'confirmed' | 'partial_received' | 'completed' | 'cancelled'
          total_amount: number
          tax_amount?: number
          grand_total: number
          order_date: string
          expected_date?: string
          received_date?: string
          notes?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_number?: string
          supplier_id?: string
          status?: 'draft' | 'sent' | 'confirmed' | 'partial_received' | 'completed' | 'cancelled'
          total_amount?: number
          tax_amount?: number
          grand_total?: number
          order_date?: string
          expected_date?: string
          received_date?: string
          notes?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          ingredient_id: string
          quantity_ordered: number
          quantity_received: number
          unit_cost: number
          total_cost: number
          status: 'pending' | 'partial' | 'completed'
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_order_id: string
          ingredient_id: string
          quantity_ordered: number
          quantity_received?: number
          unit_cost: number
          total_cost: number
          status?: 'pending' | 'partial' | 'completed'
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          ingredient_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_cost?: number
          total_cost?: number
          status?: 'pending' | 'partial' | 'completed'
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      stock_batches: {
        Row: {
          id: string
          ingredient_id: string
          batch_number: string
          quantity: number
          unit_cost: number
          expiry_date?: string
          received_date: string
          status: 'active' | 'expired' | 'consumed'
          supplier_id?: string
          purchase_order_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          batch_number: string
          quantity: number
          unit_cost: number
          expiry_date?: string
          received_date: string
          status?: 'active' | 'expired' | 'consumed'
          supplier_id?: string
          purchase_order_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          batch_number?: string
          quantity?: number
          unit_cost?: number
          expiry_date?: string
          received_date?: string
          status?: 'active' | 'expired' | 'consumed'
          supplier_id?: string
          purchase_order_id?: string
          created_at?: string
          updated_at?: string
        }
      }

      // 👥 HR & PAYROLL TABLES
      attendance: {
        Row: {
          id: string
          employee_id: string
          date: string
          clock_in?: string
          clock_out?: string
          break_start?: string
          break_end?: string
          total_hours?: number
          overtime_hours?: number
          status: 'present' | 'absent' | 'late' | 'half_day'
          location_lat?: number
          location_lng?: number
          distance_from_cafe?: number
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          clock_in?: string
          clock_out?: string
          break_start?: string
          break_end?: string
          total_hours?: number
          overtime_hours?: number
          status?: 'present' | 'absent' | 'late' | 'half_day'
          location_lat?: number
          location_lng?: number
          distance_from_cafe?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          clock_in?: string
          clock_out?: string
          break_start?: string
          break_end?: string
          total_hours?: number
          overtime_hours?: number
          status?: 'present' | 'absent' | 'late' | 'half_day'
          location_lat?: number
          location_lng?: number
          distance_from_cafe?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          employee_id: string
          leave_type: 'annual' | 'sick' | 'maternity' | 'emergency' | 'unpaid'
          start_date: string
          end_date: string
          days_requested: number
          reason: string
          status: 'pending' | 'approved' | 'rejected'
          approved_by?: string
          approved_at?: string
          rejection_reason?: string
          supporting_document?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type: 'annual' | 'sick' | 'maternity' | 'emergency' | 'unpaid'
          start_date: string
          end_date: string
          days_requested: number
          reason: string
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string
          approved_at?: string
          rejection_reason?: string
          supporting_document?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type?: 'annual' | 'sick' | 'maternity' | 'emergency' | 'unpaid'
          start_date?: string
          end_date?: string
          days_requested?: number
          reason?: string
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string
          approved_at?: string
          rejection_reason?: string
          supporting_document?: string
          created_at?: string
          updated_at?: string
        }
      }
      payroll: {
        Row: {
          id: string
          employee_id: string
          period_start: string
          period_end: string
          basic_salary: number
          overtime_hours: number
          overtime_rate: number
          overtime_pay: number
          deductions: number
          bonuses: number
          gross_salary: number
          tax_deduction: number
          net_salary: number
          status: 'draft' | 'approved' | 'paid'
          payment_date?: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          period_start: string
          period_end: string
          basic_salary: number
          overtime_hours?: number
          overtime_rate?: number
          overtime_pay?: number
          deductions?: number
          bonuses?: number
          gross_salary: number
          tax_deduction?: number
          net_salary: number
          status?: 'draft' | 'approved' | 'paid'
          payment_date?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          period_start?: string
          period_end?: string
          basic_salary?: number
          overtime_hours?: number
          overtime_rate?: number
          overtime_pay?: number
          deductions?: number
          bonuses?: number
          gross_salary?: number
          tax_deduction?: number
          net_salary?: number
          status?: 'draft' | 'approved' | 'paid'
          payment_date?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      shift_schedules: {
        Row: {
          id: string
          name: string
          start_time: string
          end_time: string
          break_start?: string
          break_end?: string
          days_of_week: number[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          start_time: string
          end_time: string
          break_start?: string
          break_end?: string
          days_of_week: number[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_time?: string
          end_time?: string
          break_start?: string
          break_end?: string
          days_of_week?: number[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      employee_shifts: {
        Row: {
          id: string
          employee_id: string
          shift_schedule_id: string
          assigned_date: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          shift_schedule_id: string
          assigned_date: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          shift_schedule_id?: string
          assigned_date?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      overtime_requests: {
        Row: {
          id: string
          employee_id: string
          date: string
          start_time: string
          end_time: string
          hours: number
          reason: string
          status: 'pending' | 'approved' | 'rejected'
          approved_by?: string
          approved_at?: string
          rejection_reason?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          start_time: string
          end_time: string
          hours: number
          reason: string
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string
          approved_at?: string
          rejection_reason?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          start_time?: string
          end_time?: string
          hours?: number
          reason?: string
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string
          approved_at?: string
          rejection_reason?: string
          created_at?: string
          updated_at?: string
        }
      }

      // 🔔 NOTIFICATION & SYSTEM TABLES
      notifications: {
        Row: {
          id: string
          user_id?: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          category: 'order' | 'inventory' | 'payment' | 'hr' | 'system'
          is_read: boolean
          action_url?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          category: 'order' | 'inventory' | 'payment' | 'hr' | 'system'
          is_read?: boolean
          action_url?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'success' | 'warning' | 'error'
          category?: 'order' | 'inventory' | 'payment' | 'hr' | 'system'
          is_read?: boolean
          action_url?: string
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: any
          description?: string
          type: 'string' | 'number' | 'boolean' | 'json'
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: any
          description?: string
          type: 'string' | 'number' | 'boolean' | 'json'
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: any
          description?: string
          type?: 'string' | 'number' | 'boolean' | 'json'
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id?: string
          action: string
          table_name?: string
          record_id?: string
          old_values?: Record<string, any>
          new_values?: Record<string, any>
          ip_address?: string
          user_agent?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          action: string
          table_name?: string
          record_id?: string
          old_values?: Record<string, any>
          new_values?: Record<string, any>
          ip_address?: string
          user_agent?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          table_name?: string
          record_id?: string
          old_values?: Record<string, any>
          new_values?: Record<string, any>
          ip_address?: string
          user_agent?: string
          created_at?: string
        }
      }
      customer_sessions: {
        Row: {
          id: string
          session_token: string
          table_id?: string
          customer_name?: string
          customer_phone?: string
          started_at: string
          ended_at?: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_token: string
          table_id?: string
          customer_name?: string
          customer_phone?: string
          started_at?: string
          ended_at?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_token?: string
          table_id?: string
          customer_name?: string
          customer_phone?: string
          started_at?: string
          ended_at?: string
          is_active?: boolean
          created_at?: string
        }
      }

      // 🎯 PROMOTION & ANALYTICS TABLES
      promos: {
        Row: {
          id: string
          code: string
          name: string
          description?: string
          type: 'percentage' | 'fixed_amount' | 'buy_x_get_y'
          discount_value: number
          min_order_amount?: number
          max_discount_amount?: number
          start_date: string
          end_date: string
          usage_limit?: number
          usage_count: number
          is_active: boolean
          applicable_items?: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string
          type: 'percentage' | 'fixed_amount' | 'buy_x_get_y'
          discount_value: number
          min_order_amount?: number
          max_discount_amount?: number
          start_date: string
          end_date: string
          usage_limit?: number
          usage_count?: number
          is_active?: boolean
          applicable_items?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string
          type?: 'percentage' | 'fixed_amount' | 'buy_x_get_y'
          discount_value?: number
          min_order_amount?: number
          max_discount_amount?: number
          start_date?: string
          end_date?: string
          usage_limit?: number
          usage_count?: number
          is_active?: boolean
          applicable_items?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      promo_usage: {
        Row: {
          id: string
          promo_id: string
          order_id: string
          discount_amount: number
          customer_phone?: string
          used_at: string
        }
        Insert: {
          id?: string
          promo_id: string
          order_id: string
          discount_amount: number
          customer_phone?: string
          used_at?: string
        }
        Update: {
          id?: string
          promo_id?: string
          order_id?: string
          discount_amount?: number
          customer_phone?: string
          used_at?: string
        }
      }
      cash_reconciliation: {
        Row: {
          id: string
          date: string
          opening_balance: number
          total_sales: number
          total_cash_received: number
          total_expenses: number
          expected_balance: number
          actual_balance: number
          variance: number
          notes?: string
          reconciled_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          opening_balance: number
          total_sales: number
          total_cash_received: number
          total_expenses: number
          expected_balance: number
          actual_balance: number
          variance: number
          notes?: string
          reconciled_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          opening_balance?: number
          total_sales?: number
          total_cash_received?: number
          total_expenses?: number
          expected_balance?: number
          actual_balance?: number
          variance?: number
          notes?: string
          reconciled_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      daily_analytics: {
        Row: {
          id: string
          date: string
          total_orders: number
          total_revenue: number
          total_customers: number
          average_order_value: number
          most_popular_items: Record<string, any>
          peak_hours: Record<string, any>
          payment_method_breakdown: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          total_orders: number
          total_revenue: number
          total_customers: number
          average_order_value: number
          most_popular_items: Record<string, any>
          peak_hours: Record<string, any>
          payment_method_breakdown: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          total_orders?: number
          total_revenue?: number
          total_customers?: number
          average_order_value?: number
          most_popular_items?: Record<string, any>
          peak_hours?: Record<string, any>
          payment_method_breakdown?: Record<string, any>
          created_at?: string
        }
      }

      // 📊 ADDITIONAL BUSINESS TABLES
      menu_item_ingredients: {
        Row: {
          id: string
          menu_item_id: string
          ingredient_id: string
          quantity: number
          unit: string
          cost: number
          is_optional: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          ingredient_id: string
          quantity: number
          unit: string
          cost: number
          is_optional?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          ingredient_id?: string
          quantity?: number
          unit?: string
          cost?: number
          is_optional?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          code: string
          is_active: boolean
          processing_fee: number
          description?: string
          icon_url?: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          is_active?: boolean
          processing_fee?: number
          description?: string
          icon_url?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          is_active?: boolean
          processing_fee?: number
          description?: string
          icon_url?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      tax_rates: {
        Row: {
          id: string
          name: string
          rate: number
          description?: string
          is_active: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          rate: number
          description?: string
          is_active?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          rate?: number
          description?: string
          is_active?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      service_charges: {
        Row: {
          id: string
          name: string
          rate: number
          description?: string
          is_active: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          rate: number
          description?: string
          is_active?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          rate?: number
          description?: string
          is_active?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      loyalty_points: {
        Row: {
          id: string
          customer_phone: string
          points_earned: number
          points_used: number
          points_balance: number
          order_id?: string
          transaction_type: 'earned' | 'used' | 'expired'
          description?: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_phone: string
          points_earned: number
          points_used: number
          points_balance: number
          order_id?: string
          transaction_type: 'earned' | 'used' | 'expired'
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_phone?: string
          points_earned?: number
          points_used?: number
          points_balance?: number
          order_id?: string
          transaction_type?: 'earned' | 'used' | 'expired'
          description?: string
          created_at?: string
        }
      }
      feedback_ratings: {
        Row: {
          id: string
          order_id: string
          customer_phone?: string
          rating: number
          comment?: string
          service_rating: number
          food_rating: number
          cleanliness_rating: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          customer_phone?: string
          rating: number
          comment?: string
          service_rating: number
          food_rating: number
          cleanliness_rating: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          customer_phone?: string
          rating?: number
          comment?: string
          service_rating?: number
          food_rating?: number
          cleanliness_rating?: number
          created_at?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          description?: string
          budget_amount?: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          budget_amount?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          budget_amount?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      daily_expenses: {
        Row: {
          id: string
          category_id: string
          amount: number
          description: string
          receipt_url?: string
          date: string
          recorded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          amount: number
          description: string
          receipt_url?: string
          date: string
          recorded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          amount?: number
          description?: string
          receipt_url?: string
          date?: string
          recorded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      inventory_alerts: {
        Row: {
          id: string
          ingredient_id: string
          alert_type: 'low_stock' | 'expired' | 'expiring_soon'
          message: string
          threshold_value?: number
          current_value?: number
          is_acknowledged: boolean
          acknowledged_by?: string
          acknowledged_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          alert_type: 'low_stock' | 'expired' | 'expiring_soon'
          message: string
          threshold_value?: number
          current_value?: number
          is_acknowledged?: boolean
          acknowledged_by?: string
          acknowledged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          alert_type?: 'low_stock' | 'expired' | 'expiring_soon'
          message?: string
          threshold_value?: number
          current_value?: number
          is_acknowledged?: boolean
          acknowledged_by?: string
          acknowledged_at?: string
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          order_id: string
          payment_method: 'qris' | 'bank_transfer' | 'cash' | 'card'
          amount: number
          status: 'pending_verification' | 'verified' | 'rejected' | 'completed'
          transaction_reference?: string
          bank_name?: string
          account_number?: string
          proof_image_url?: string
          verification_notes?: string
          verified_by?: string
          verified_at?: string
          uploaded_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          payment_method: 'qris' | 'bank_transfer' | 'cash' | 'card'
          amount: number
          status?: 'pending_verification' | 'verified' | 'rejected' | 'completed'
          transaction_reference?: string
          bank_name?: string
          account_number?: string
          proof_image_url?: string
          verification_notes?: string
          verified_by?: string
          verified_at?: string
          uploaded_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          payment_method?: 'qris' | 'bank_transfer' | 'cash' | 'card'
          amount?: number
          status?: 'pending_verification' | 'verified' | 'rejected' | 'completed'
          transaction_reference?: string
          bank_name?: string
          account_number?: string
          proof_image_url?: string
          verification_notes?: string
          verified_by?: string
          verified_at?: string
          uploaded_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      payment_configurations: {
        Row: {
          id: string
          payment_method: 'qris' | 'bank_transfer' | 'cash' | 'card'
          bank_code?: string
          bank_name?: string
          account_number?: string
          account_name?: string
          merchant_id?: string
          is_active: boolean
          features?: string[]
          account_validation_rules?: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          payment_method: 'qris' | 'bank_transfer' | 'cash' | 'card'
          bank_code?: string
          bank_name?: string
          account_number?: string
          account_name?: string
          merchant_id?: string
          is_active?: boolean
          features?: string[]
          account_validation_rules?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          payment_method?: 'qris' | 'bank_transfer' | 'cash' | 'card'
          bank_code?: string
          bank_name?: string
          account_number?: string
          account_name?: string
          merchant_id?: string
          is_active?: boolean
          features?: string[]
          account_validation_rules?: any
          created_at?: string
          updated_at?: string
        }
      }
      payment_verifications: {
        Row: {
          id: string
          payment_id: string
          verified_by: string
          verification_method: 'manual' | 'ocr' | 'api'
          receipt_transaction_id?: string
          receipt_amount?: number
          receipt_timestamp?: string
          receipt_bank_name?: string
          receipt_sender_name?: string
          receipt_recipient_name?: string
          receipt_reference_number?: string
          confidence_score: number
          validation_issues?: any
          created_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          verified_by: string
          verification_method: 'manual' | 'ocr' | 'api'
          receipt_transaction_id?: string
          receipt_amount?: number
          receipt_timestamp?: string
          receipt_bank_name?: string
          receipt_sender_name?: string
          receipt_recipient_name?: string
          receipt_reference_number?: string
          confidence_score: number
          validation_issues?: any
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          verified_by?: string
          verification_method?: 'manual' | 'ocr' | 'api'
          receipt_transaction_id?: string
          receipt_amount?: number
          receipt_timestamp?: string
          receipt_bank_name?: string
          receipt_sender_name?: string
          receipt_recipient_name?: string
          receipt_reference_number?: string
          confidence_score?: number
          validation_issues?: any
          created_at?: string
        }
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          previous_status: string
          new_status: string
          changed_by: string
          reason?: string
          notes?: string
          estimated_time?: number
          quality_score?: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          previous_status: string
          new_status: string
          changed_by: string
          reason?: string
          notes?: string
          estimated_time?: number
          quality_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          previous_status?: string
          new_status?: string
          changed_by?: string
          reason?: string
          notes?: string
          estimated_time?: number
          quality_score?: number
          created_at?: string
        }
      }
      telegram_notifications: {
        Row: {
          id: string
          chat_id: string
          message: string
          message_type: string
          status: 'pending' | 'sent' | 'failed' | 'delivered'
          telegram_message_id?: string
          error_message?: string
          retry_count: number
          data?: any
          scheduled_at?: string
          sent_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          message: string
          message_type: string
          status?: 'pending' | 'sent' | 'failed' | 'delivered'
          telegram_message_id?: string
          error_message?: string
          retry_count?: number
          data?: any
          scheduled_at?: string
          sent_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          message?: string
          message_type?: string
          status?: 'pending' | 'sent' | 'failed' | 'delivered'
          telegram_message_id?: string
          error_message?: string
          retry_count?: number
          data?: any
          scheduled_at?: string
          sent_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      scheduled_notifications: {
        Row: {
          id: string
          title: string
          message: string
          notification_type: string
          target_audience: 'all' | 'customers' | 'staff' | 'custom'
          target_criteria?: any
          channel: 'telegram' | 'email' | 'sms' | 'push'
          status: 'pending' | 'sent' | 'cancelled' | 'failed'
          scheduled_at: string
          sent_at?: string
          created_by: string
          data?: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          notification_type: string
          target_audience: 'all' | 'customers' | 'staff' | 'custom'
          target_criteria?: any
          channel: 'telegram' | 'email' | 'sms' | 'push'
          status?: 'pending' | 'sent' | 'cancelled' | 'failed'
          scheduled_at: string
          sent_at?: string
          created_by: string
          data?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          notification_type?: string
          target_audience?: 'all' | 'customers' | 'staff' | 'custom'
          target_criteria?: any
          channel?: 'telegram' | 'email' | 'sms' | 'push'
          status?: 'pending' | 'sent' | 'cancelled' | 'failed'
          scheduled_at?: string
          sent_at?: string
          created_by?: string
          data?: any
          created_at?: string
          updated_at?: string
        }
      }
      telegram_broadcasts: {
        Row: {
          id: string
          title: string
          message: string
          target_audience: 'all' | 'customers' | 'staff' | 'custom'
          target_criteria?: any
          status: 'pending' | 'sending' | 'completed' | 'failed'
          total_recipients: number
          sent_count: number
          failed_count: number
          scheduled_at?: string
          started_at?: string
          completed_at?: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          target_audience: 'all' | 'customers' | 'staff' | 'custom'
          target_criteria?: any
          status?: 'pending' | 'sending' | 'completed' | 'failed'
          total_recipients?: number
          sent_count?: number
          failed_count?: number
          scheduled_at?: string
          started_at?: string
          completed_at?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          target_audience?: 'all' | 'customers' | 'staff' | 'custom'
          target_criteria?: any
          status?: 'pending' | 'sending' | 'completed' | 'failed'
          total_recipients?: number
          sent_count?: number
          failed_count?: number
          scheduled_at?: string
          started_at?: string
          completed_at?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          unit: string
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          unit: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          ingredient_id?: string
          quantity?: number
          unit?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      seasonal_adjustments: {
        Row: {
          id: string
          ingredient_id: string
          season: string
          adjustment_factor: number
          start_date: string
          end_date: string
          is_active: boolean
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          season: string
          adjustment_factor: number
          start_date: string
          end_date: string
          is_active?: boolean
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          season?: string
          adjustment_factor?: number
          start_date?: string
          end_date?: string
          is_active?: boolean
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_order_total: {
        Args: {
          order_items: any[]
          tax_rate?: number
          service_charge_rate?: number
          discount_amount?: number
        }
        Returns: {
          subtotal: number
          tax_amount: number
          service_charge: number
          total_amount: number
        }
      }
      reserve_stock: {
        Args: {
          order_items: any[]
        }
        Returns: {
          success: boolean
          message: string
        }
      }
      release_stock: {
        Args: {
          order_items: any[]
        }
        Returns: {
          success: boolean
          message: string
        }
      }
    }
    Enums: {
      user_role: 'owner' | 'employee' | 'device_kasir' | 'device_dapur' | 'device_pelayan' | 'device_stok'
      device_role: 'kasir' | 'dapur' | 'pelayan' | 'stok'
      employee_status: 'active' | 'inactive' | 'terminated' | 'on_leave'
      menu_status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued'
      order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
      order_type: 'dine_in' | 'takeaway' | 'delivery'
      payment_status: 'pending' | 'verified' | 'rejected' | 'refunded'
      payment_method: 'cash' | 'qris' | 'bank_transfer' | 'debit_card' | 'credit_card'
      attendance_status: 'present' | 'absent' | 'late' | 'half_day'
      stock_movement_type: 'stock_in' | 'stock_out' | 'waste' | 'adjustment' | 'transfer'
      item_status: 'pending' | 'preparing' | 'ready' | 'served'
      table_status: 'available' | 'occupied' | 'reserved' | 'cleaning'
      po_status: 'draft' | 'sent' | 'confirmed' | 'partial_received' | 'completed' | 'cancelled'
      batch_status: 'active' | 'expired' | 'consumed'
      leave_type: 'annual' | 'sick' | 'maternity' | 'emergency' | 'unpaid'
      notification_type: 'info' | 'success' | 'warning' | 'error'
      notification_category: 'order' | 'inventory' | 'payment' | 'hr' | 'system'
      promo_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y'
      loyalty_transaction_type: 'earned' | 'used' | 'expired'
      alert_type: 'low_stock' | 'expired' | 'expiring_soon'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}