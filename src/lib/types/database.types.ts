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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'super_admin' | 'admin' | 'manager' | 'sales_staff'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'super_admin' | 'admin' | 'manager' | 'sales_staff'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'super_admin' | 'admin' | 'manager' | 'sales_staff'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          sku: string | null
          barcode: string | null
          category: string | null
          price: number
          stock_qty: number
          unit: string
          description: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sku?: string | null
          barcode?: string | null
          category?: string | null
          price: number
          stock_qty?: number
          unit?: string
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          sku?: string | null
          barcode?: string | null
          category?: string | null
          price?: number
          stock_qty?: number
          unit?: string
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      trade_partners: {
        Row: {
          id: string
          name: string
          phone: string
          address: string | null
          gstin: string | null
          notes: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          address?: string | null
          gstin?: string | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          address?: string | null
          gstin?: string | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trade_partners_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      direct_customers: {
        Row: {
          id: string
          name: string
          phone: string
          address: string | null
          notes: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          address?: string | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          address?: string | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'direct_customers_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tp_customers: {
        Row: {
          id: string
          trade_partner_id: string
          name: string
          phone: string
          address: string | null
          notes: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trade_partner_id: string
          name: string
          phone: string
          address?: string | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trade_partner_id?: string
          name?: string
          phone?: string
          address?: string | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tp_customers_trade_partner_id_fkey'
            columns: ['trade_partner_id']
            isOneToOne: false
            referencedRelation: 'trade_partners'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tp_customers_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      memos: {
        Row: {
          id: string
          memo_number: string
          memo_type: 'sales' | 'delivery'
          customer_type: 'direct' | 'tp_customer'
          direct_customer_id: string | null
          tp_customer_id: string | null
          delivery_address: string | null
          status: 'draft' | 'confirmed' | 'paid' | 'delivered' | 'cancelled'
          subtotal: number
          line_discount_total: number
          memo_discount_value: number
          memo_discount_type: 'flat' | 'percent'
          tax_amount: number
          total_amount: number
          paid_at: string | null
          paid_by: string | null
          payment_method: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other' | null
          delivered_at: string | null
          delivered_by: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          memo_number?: string
          memo_type: 'sales' | 'delivery'
          customer_type: 'direct' | 'tp_customer'
          direct_customer_id?: string | null
          tp_customer_id?: string | null
          delivery_address?: string | null
          status?: 'draft' | 'confirmed' | 'paid' | 'delivered' | 'cancelled'
          subtotal?: number
          line_discount_total?: number
          memo_discount_value?: number
          memo_discount_type?: 'flat' | 'percent'
          tax_amount?: number
          total_amount?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other' | null
          delivered_at?: string | null
          delivered_by?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          memo_number?: string
          memo_type?: 'sales' | 'delivery'
          customer_type?: 'direct' | 'tp_customer'
          direct_customer_id?: string | null
          tp_customer_id?: string | null
          delivery_address?: string | null
          status?: 'draft' | 'confirmed' | 'paid' | 'delivered' | 'cancelled'
          subtotal?: number
          line_discount_total?: number
          memo_discount_value?: number
          memo_discount_type?: 'flat' | 'percent'
          tax_amount?: number
          total_amount?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other' | null
          delivered_at?: string | null
          delivered_by?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'memos_direct_customer_id_fkey'
            columns: ['direct_customer_id']
            isOneToOne: false
            referencedRelation: 'direct_customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memos_tp_customer_id_fkey'
            columns: ['tp_customer_id']
            isOneToOne: false
            referencedRelation: 'tp_customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memos_paid_by_fkey'
            columns: ['paid_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memos_delivered_by_fkey'
            columns: ['delivered_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      memo_items: {
        Row: {
          id: string
          memo_id: string
          product_id: string
          quantity: number
          unit_price: number
          discount_value: number
          discount_type: 'flat' | 'percent'
          line_total: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          memo_id: string
          product_id: string
          quantity: number
          unit_price: number
          discount_value?: number
          discount_type?: 'flat' | 'percent'
          line_total?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          memo_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          discount_value?: number
          discount_type?: 'flat' | 'percent'
          line_total?: number
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'memo_items_memo_id_fkey'
            columns: ['memo_id']
            isOneToOne: false
            referencedRelation: 'memos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memo_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          id: string
          payment_number: string
          customer_type: 'direct' | 'tp_customer'
          direct_customer_id: string | null
          tp_customer_id: string | null
          amount: number
          payment_method: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'
          reference_number: string | null
          reference_memo_id: string | null
          is_auto: boolean
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          payment_number?: string
          customer_type: 'direct' | 'tp_customer'
          direct_customer_id?: string | null
          tp_customer_id?: string | null
          amount: number
          payment_method?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'
          reference_number?: string | null
          reference_memo_id?: string | null
          is_auto?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          payment_number?: string
          customer_type?: 'direct' | 'tp_customer'
          direct_customer_id?: string | null
          tp_customer_id?: string | null
          amount?: number
          payment_method?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'
          reference_number?: string | null
          reference_memo_id?: string | null
          is_auto?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payments_direct_customer_id_fkey'
            columns: ['direct_customer_id']
            isOneToOne: false
            referencedRelation: 'direct_customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_tp_customer_id_fkey'
            columns: ['tp_customer_id']
            isOneToOne: false
            referencedRelation: 'tp_customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_reference_memo_id_fkey'
            columns: ['reference_memo_id']
            isOneToOne: false
            referencedRelation: 'memos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      returns: {
        Row: {
          id: string
          return_number: string
          memo_id: string
          reason: string | null
          status: 'pending' | 'approved' | 'rejected'
          approved_by: string | null
          approved_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          return_number?: string
          memo_id: string
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          return_number?: string
          memo_id?: string
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'returns_memo_id_fkey'
            columns: ['memo_id']
            isOneToOne: false
            referencedRelation: 'memos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'returns_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'returns_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      return_items: {
        Row: {
          id: string
          return_id: string
          memo_item_id: string
          product_id: string
          quantity_returned: number
          refund_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          return_id: string
          memo_item_id: string
          product_id: string
          quantity_returned: number
          refund_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          return_id?: string
          memo_item_id?: string
          product_id?: string
          quantity_returned?: number
          refund_amount?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'return_items_return_id_fkey'
            columns: ['return_id']
            isOneToOne: false
            referencedRelation: 'returns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'return_items_memo_item_id_fkey'
            columns: ['memo_item_id']
            isOneToOne: false
            referencedRelation: 'memo_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'return_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      refunds: {
        Row: {
          id: string
          refund_number: string
          return_id: string
          customer_type: 'direct' | 'tp_customer'
          direct_customer_id: string | null
          tp_customer_id: string | null
          amount: number
          refund_method: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'
          status: 'pending' | 'processed' | 'cancelled'
          processed_by: string | null
          processed_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          refund_number?: string
          return_id: string
          customer_type: 'direct' | 'tp_customer'
          direct_customer_id?: string | null
          tp_customer_id?: string | null
          amount: number
          refund_method?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'
          status?: 'pending' | 'processed' | 'cancelled'
          processed_by?: string | null
          processed_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          refund_number?: string
          return_id?: string
          customer_type?: 'direct' | 'tp_customer'
          direct_customer_id?: string | null
          tp_customer_id?: string | null
          amount?: number
          refund_method?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'
          status?: 'pending' | 'processed' | 'cancelled'
          processed_by?: string | null
          processed_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'refunds_return_id_fkey'
            columns: ['return_id']
            isOneToOne: true
            referencedRelation: 'returns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_direct_customer_id_fkey'
            columns: ['direct_customer_id']
            isOneToOne: false
            referencedRelation: 'direct_customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_tp_customer_id_fkey'
            columns: ['tp_customer_id']
            isOneToOne: false
            referencedRelation: 'tp_customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_processed_by_fkey'
            columns: ['processed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      direct_customer_balances: {
        Row: {
          id: string
          name: string
          phone: string
          total_billed: number
          total_paid: number
          total_refunded: number
          outstanding_balance: number
        }
        Relationships: [
          {
            foreignKeyName: 'direct_customers_pkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'direct_customers'
            referencedColumns: ['id']
          },
        ]
      }
      tp_customer_balances: {
        Row: {
          id: string
          name: string
          phone: string
          trade_partner_name: string
          total_billed: number
          total_paid: number
          total_refunded: number
          outstanding_balance: number
        }
        Relationships: [
          {
            foreignKeyName: 'tp_customers_pkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'tp_customers'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_or_above: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_manager_or_above: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
