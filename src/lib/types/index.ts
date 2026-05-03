export type { Database } from './database.types'
import type { Database } from './database.types'

// ── Utility generics ──────────────────────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

// ── Row types (named for import convenience) ──────────────────────────────────

export type Profile       = Tables<'profiles'>
export type Product       = Tables<'products'>
export type TradePartner  = Tables<'trade_partners'>
export type DirectCustomer = Tables<'direct_customers'>
export type TpCustomer    = Tables<'tp_customers'>
export type Memo          = Tables<'memos'>
export type MemoItem      = Tables<'memo_items'>
export type Payment       = Tables<'payments'>
export type Return        = Tables<'returns'>
export type ReturnItem    = Tables<'return_items'>
export type Refund        = Tables<'refunds'>

// ── View row types ────────────────────────────────────────────────────────────

export type DirectCustomerBalance = Views<'direct_customer_balances'>
export type TpCustomerBalance     = Views<'tp_customer_balances'>

// ── Insert types ──────────────────────────────────────────────────────────────

export type ProfileInsert       = TablesInsert<'profiles'>
export type ProductInsert       = TablesInsert<'products'>
export type TradePartnerInsert  = TablesInsert<'trade_partners'>
export type DirectCustomerInsert = TablesInsert<'direct_customers'>
export type TpCustomerInsert    = TablesInsert<'tp_customers'>
export type MemoInsert          = TablesInsert<'memos'>
export type MemoItemInsert      = TablesInsert<'memo_items'>
export type PaymentInsert       = TablesInsert<'payments'>
export type ReturnInsert        = TablesInsert<'returns'>
export type ReturnItemInsert    = TablesInsert<'return_items'>
export type RefundInsert        = TablesInsert<'refunds'>

// ── Update types ──────────────────────────────────────────────────────────────

export type ProfileUpdate       = TablesUpdate<'profiles'>
export type ProductUpdate       = TablesUpdate<'products'>
export type TradePartnerUpdate  = TablesUpdate<'trade_partners'>
export type DirectCustomerUpdate = TablesUpdate<'direct_customers'>
export type TpCustomerUpdate    = TablesUpdate<'tp_customers'>
export type MemoUpdate          = TablesUpdate<'memos'>
export type MemoItemUpdate      = TablesUpdate<'memo_items'>
export type PaymentUpdate       = TablesUpdate<'payments'>
export type ReturnUpdate        = TablesUpdate<'returns'>
export type ReturnItemUpdate    = TablesUpdate<'return_items'>
export type RefundUpdate        = TablesUpdate<'refunds'>

// ── Domain enum types (from schema CHECK constraints) ─────────────────────────

export type Role          = 'super_admin' | 'admin' | 'manager' | 'sales_staff'
export type MemoType      = 'sales' | 'delivery'
export type MemoStatus    = 'draft' | 'confirmed' | 'paid' | 'delivered' | 'cancelled'
export type CustomerType  = 'direct' | 'tp_customer'
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'
export type DiscountType  = 'flat' | 'percent'
export type ReturnStatus  = 'pending' | 'approved' | 'rejected'
export type RefundStatus  = 'pending' | 'processed' | 'cancelled'
export type RefundMethod  = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'
