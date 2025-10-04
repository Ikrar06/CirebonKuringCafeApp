'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Supplier {
  id: string
  company_name: string
  contact_person?: string
  phone_primary: string
  phone_secondary?: string
  email?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  tax_id?: string
  business_type?: string
  payment_terms?: string
  payment_methods?: string[]
  bank_account?: string
  delivery_rating?: number
  quality_rating?: number
  price_rating?: number
  is_active?: boolean
  is_preferred?: boolean
  notes?: string
  created_at?: string
  updated_at?: string
}

class SupplierService {
  async getSuppliers(filters?: {
    is_active?: boolean
    is_preferred?: boolean
    search?: string
  }): Promise<Supplier[]> {
    try {
      console.log('🔍 Fetching suppliers with filters:', filters)

      let query = supabase
        .from('suppliers')
        .select('*')
        .order('company_name')

      // Apply filters
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      if (filters?.is_preferred !== undefined) {
        query = query.eq('is_preferred', filters.is_preferred)
      }

      if (filters?.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error

      console.log('📊 Query result:', { count: data?.length, data })

      return data || []
    } catch (error) {
      console.error('❌ Error fetching suppliers:', error)
      throw error
    }
  }

  async getSupplier(id: string): Promise<Supplier | null> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching supplier:', error)
      throw error
    }
  }

  async createSupplier(data: {
    company_name: string
    contact_person?: string
    phone_primary: string
    phone_secondary?: string
    email?: string
    address?: string
    city?: string
    postal_code?: string
    country?: string
    tax_id?: string
    business_type?: string
    payment_terms?: string
    payment_methods?: string[]
    bank_account?: string
    delivery_rating?: number
    quality_rating?: number
    price_rating?: number
    is_preferred?: boolean
    notes?: string
  }): Promise<Supplier> {
    try {
      const { data: result, error } = await supabase
        .from('suppliers')
        .insert([{
          ...data,
          is_active: true
        }])
        .select()
        .single()

      if (error) throw error

      return result
    } catch (error) {
      console.error('Error creating supplier:', error)
      throw error
    }
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    try {
      const { data: result, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return result
    } catch (error) {
      console.error('Error updating supplier:', error)
      throw error
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting supplier:', error)
      throw error
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }
}

export const supplierService = new SupplierService()