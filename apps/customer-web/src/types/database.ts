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
          qr_code_id: string
          qr_code_url: string | null
          capacity: string
          zone: string
          floor: string
          position_x: number | null
          position_y: number | null
          status: 'available' | 'occupied' | 'reserved' | 'maintenance'
          current_session_id: string | null
          occupied_since: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_number: string
          qr_code_id: string
          qr_code_url?: string | null
          capacity: string
          zone: string
          floor: string
          position_x?: number | null
          position_y?: number | null
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          current_session_id?: string | null
          occupied_since?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_number?: string
          qr_code_id?: string
          qr_code_url?: string | null
          capacity?: string
          zone?: string
          floor?: string
          position_x?: number | null
          position_y?: number | null
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          current_session_id?: string | null
          occupied_since?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          id: string
          name: string
          slug?: string
          base_price: number
          category_id: string
          description?: string
          cost_price?: number
          tax_rate?: number
          image_url?: string
          thumbnail_url?: string
          requires_stock: boolean
          estimated_prep_time: number
          is_available: boolean
          available_from?: string
          available_until?: string
          daily_limit?: number
          current_daily_count: number
          calories?: number
          is_vegetarian: boolean
          is_vegan: boolean
          is_gluten_free: boolean
          is_spicy: boolean
          spicy_level?: number
          allergens?: string[]
          total_orders: number
          total_revenue: number
          average_rating?: number
          rating_count: number
          created_at: string
          updated_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string
          base_price: number
          category_id: string
          description?: string
          cost_price?: number
          tax_rate?: number
          image_url?: string
          thumbnail_url?: string
          requires_stock?: boolean
          estimated_prep_time?: number
          is_available?: boolean
          available_from?: string
          available_until?: string
          daily_limit?: number
          current_daily_count?: number
          calories?: number
          is_vegetarian?: boolean
          is_vegan?: boolean
          is_gluten_free?: boolean
          is_spicy?: boolean
          spicy_level?: number
          allergens?: string[]
          total_orders?: number
          total_revenue?: number
          average_rating?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          base_price?: number
          category_id?: string
          description?: string
          cost_price?: number
          tax_rate?: number
          image_url?: string
          thumbnail_url?: string
          requires_stock?: boolean
          estimated_prep_time?: number
          is_available?: boolean
          available_from?: string
          available_until?: string
          daily_limit?: number
          current_daily_count?: number
          calories?: number
          is_vegetarian?: boolean
          is_vegan?: boolean
          is_gluten_free?: boolean
          is_spicy?: boolean
          spicy_level?: number
          allergens?: string[]
          total_orders?: number
          total_revenue?: number
          average_rating?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
          created_by?: string
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
          slug?: string
          description?: string
          image_url?: string
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string
          description?: string
          image_url?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          image_url?: string
          display_order?: number
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
          payment_method?: 'cash' | 'card' | 'qris' | 'transfer'
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
          payment_method?: 'cash' | 'card' | 'qris' | 'transfer'
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
          payment_method?: 'cash' | 'card' | 'qris' | 'transfer'
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
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          quantity: number
          subtotal: number
          customizations?: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          quantity: number
          subtotal: number
          customizations?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string
          quantity?: number
          subtotal?: number
          customizations?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_customization_groups: {
        Row: {
          id: string
          group_name: string
          group_type: string
          menu_item_id?: string
          is_required: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_name: string
          group_type: string
          menu_item_id?: string
          is_required?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_name?: string
          group_type?: string
          menu_item_id?: string
          is_required?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_customization_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_customization_options: {
        Row: {
          id: string
          option_name: string
          group_id?: string
          price_adjustment: number
          is_default: boolean
          is_available: boolean
          display_order: number
          ingredient_id?: string
          ingredient_quantity?: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          option_name: string
          group_id?: string
          price_adjustment?: number
          is_default?: boolean
          is_available?: boolean
          display_order?: number
          ingredient_id?: string
          ingredient_quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          option_name?: string
          group_id?: string
          price_adjustment?: number
          is_default?: boolean
          is_available?: boolean
          display_order?: number
          ingredient_id?: string
          ingredient_quantity?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_customization_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "menu_customization_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          id: string
          name: string
          unit: string
          cost_per_unit: number
          current_stock: number
          minimum_stock: number
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          unit: string
          cost_per_unit: number
          current_stock?: number
          minimum_stock?: number
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          unit?: string
          cost_per_unit?: number
          current_stock?: number
          minimum_stock?: number
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_ratings: {
        Row: {
          id: string
          order_id: string
          overall_rating: number
          service_rating?: number
          food_rating?: number
          feedback?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          overall_rating: number
          service_rating?: number
          food_rating?: number
          feedback?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          overall_rating?: number
          service_rating?: number
          food_rating?: number
          feedback?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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