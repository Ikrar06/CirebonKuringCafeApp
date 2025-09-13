export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tables: {
        Row: {
          id: string
          table_number: string
          capacity: number
          status: 'available' | 'occupied' | 'reserved' | 'maintenance'
          qr_code: string
          location_description?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_number: string
          capacity: number
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          qr_code: string
          location_description?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_number?: string
          capacity?: number
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          qr_code?: string
          location_description?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          id: string
          name: string
          description?: string
          price: number
          category_id: string
          image_url?: string
          status: 'available' | 'unavailable' | 'out_of_stock'
          preparation_time?: number
          allergens?: string[]
          tags?: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          price: number
          category_id: string
          image_url?: string
          status?: 'available' | 'unavailable' | 'out_of_stock'
          preparation_time?: number
          allergens?: string[]
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          category_id?: string
          image_url?: string
          status?: 'available' | 'unavailable' | 'out_of_stock'
          preparation_time?: number
          allergens?: string[]
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: []
      }
      menu_customizations: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          type: 'single' | 'multiple'
          required: boolean
          options: Json
          min_selections?: number
          max_selections?: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          type: 'single' | 'multiple'
          required?: boolean
          options: Json
          min_selections?: number
          max_selections?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          name?: string
          type?: 'single' | 'multiple'
          required?: boolean
          options?: Json
          min_selections?: number
          max_selections?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_customizations_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          id: string
          table_id: string
          customer_name: string
          customer_phone?: string
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
          total_amount: number
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_method?: 'cash' | 'card' | 'qris' | 'bank_transfer'
          promo_code?: string
          discount_amount?: number
          notes?: string
          estimated_completion?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_id: string
          customer_name: string
          customer_phone?: string
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
          total_amount: number
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_method?: 'cash' | 'card' | 'qris' | 'bank_transfer'
          promo_code?: string
          discount_amount?: number
          notes?: string
          estimated_completion?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          customer_name?: string
          customer_phone?: string
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
          total_amount?: number
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_method?: 'cash' | 'card' | 'qris' | 'bank_transfer'
          promo_code?: string
          discount_amount?: number
          notes?: string
          estimated_completion?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never