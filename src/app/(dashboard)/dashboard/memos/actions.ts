'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isAtLeast } from '@/lib/roles'
import type { DiscountType, PaymentMethod, Role } from '@/lib/types'

export type MemoFormState = { error: string } | null

type LineItemInput = {
  product_id: string
  quantity: number
  unit_price: number
  discount_value: number
  discount_type: DiscountType
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) return null
  return { supabase, user, role: profile.role as Role }
}

function itemDiscountAmount(gross: number, val: number, type: DiscountType): number {
  return type === 'flat' ? Math.min(val, gross) : (gross * val) / 100
}

function calcTotals(
  items: LineItemInput[],
  memoDiscountValue: number,
  memoDiscountType: DiscountType,
) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const lineDiscountTotal = items.reduce((s, i) => {
    return s + itemDiscountAmount(i.quantity * i.unit_price, i.discount_value, i.discount_type)
  }, 0)
  const afterLine = subtotal - lineDiscountTotal
  const memoDiscount =
    memoDiscountType === 'flat'
      ? Math.min(memoDiscountValue, afterLine)
      : (afterLine * memoDiscountValue) / 100
  return {
    subtotal,
    lineDiscountTotal,
    totalAmount: Math.max(0, afterLine - memoDiscount),
  }
}

function parseMemoFormData(formData: FormData) {
  const memo_type = formData.get('memo_type') as string
  const customer_type = formData.get('customer_type') as string
  const direct_customer_id = (formData.get('direct_customer_id') as string) || null
  const tp_customer_id = (formData.get('tp_customer_id') as string) || null
  const delivery_address = (formData.get('delivery_address') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null
  const memo_discount_value = parseFloat(formData.get('memo_discount_value') as string) || 0
  const memo_discount_type = (formData.get('memo_discount_type') as DiscountType) || 'flat'
  const itemsRaw = formData.get('items') as string

  return {
    memo_type,
    customer_type,
    direct_customer_id,
    tp_customer_id,
    delivery_address,
    notes,
    memo_discount_value,
    memo_discount_type,
    itemsRaw,
  }
}

function validateMemoFields(
  memo_type: string,
  customer_type: string,
  direct_customer_id: string | null,
  tp_customer_id: string | null,
  delivery_address: string | null,
  itemsRaw: string,
): { error: string } | LineItemInput[] {
  if (!['sales', 'delivery'].includes(memo_type)) return { error: 'Invalid memo type.' }
  if (!['direct', 'tp_customer'].includes(customer_type)) return { error: 'Customer type is required.' }
  if (customer_type === 'direct' && !direct_customer_id) return { error: 'Customer is required.' }
  if (customer_type === 'tp_customer' && !tp_customer_id) return { error: 'TP customer is required.' }
  if (memo_type === 'delivery' && !delivery_address) {
    return { error: 'Delivery address is required for delivery memos.' }
  }

  let items: LineItemInput[]
  try {
    items = JSON.parse(itemsRaw)
    if (!Array.isArray(items) || items.length === 0) return { error: 'At least one line item is required.' }
  } catch {
    return { error: 'Invalid line items.' }
  }
  return items
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createMemo(
  _prev: MemoFormState,
  formData: FormData,
): Promise<MemoFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }

  const {
    memo_type, customer_type, direct_customer_id, tp_customer_id,
    delivery_address, notes, memo_discount_value, memo_discount_type, itemsRaw,
  } = parseMemoFormData(formData)

  const validated = validateMemoFields(
    memo_type, customer_type, direct_customer_id, tp_customer_id, delivery_address, itemsRaw,
  )
  if ('error' in validated) return validated
  const items = validated

  const { subtotal, lineDiscountTotal, totalAmount } = calcTotals(
    items, memo_discount_value, memo_discount_type,
  )

  const { data: memo, error: memoError } = await auth.supabase
    .from('memos')
    .insert({
      memo_type: memo_type as 'sales' | 'delivery',
      customer_type: customer_type as 'direct' | 'tp_customer',
      direct_customer_id: customer_type === 'direct' ? direct_customer_id : null,
      tp_customer_id: customer_type === 'tp_customer' ? tp_customer_id : null,
      delivery_address: memo_type === 'delivery' ? delivery_address : null,
      notes,
      status: 'draft',
      subtotal,
      line_discount_total: lineDiscountTotal,
      memo_discount_value,
      memo_discount_type,
      tax_amount: 0,
      total_amount: totalAmount,
      created_by: auth.user.id,
    })
    .select('id')
    .single()

  if (memoError || !memo) return { error: memoError?.message ?? 'Failed to create memo.' }

  const itemRows = items.map((item, idx) => {
    const gross = item.quantity * item.unit_price
    return {
      memo_id: memo.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_value: item.discount_value,
      discount_type: item.discount_type,
      line_total: gross - itemDiscountAmount(gross, item.discount_value, item.discount_type),
      sort_order: idx,
    }
  })

  const { error: itemsError } = await auth.supabase.from('memo_items').insert(itemRows)
  if (itemsError) {
    await auth.supabase.from('memos').delete().eq('id', memo.id)
    return { error: 'Failed to save line items.' }
  }

  revalidatePath('/dashboard/memos')
  redirect(`/dashboard/memos/${memo.id}`)
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateMemo(
  _prev: MemoFormState,
  formData: FormData,
): Promise<MemoFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }

  const id = formData.get('id') as string
  const { data: existing } = await auth.supabase
    .from('memos')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing) return { error: 'Memo not found.' }
  if (['paid', 'delivered', 'cancelled'].includes(existing.status)) {
    return { error: 'This memo can no longer be edited.' }
  }
  if (existing.status === 'confirmed' && !isAtLeast(auth.role, 'admin')) {
    return { error: 'Only admin and above can edit confirmed memos.' }
  }

  const {
    memo_type, customer_type, direct_customer_id, tp_customer_id,
    delivery_address, notes, memo_discount_value, memo_discount_type, itemsRaw,
  } = parseMemoFormData(formData)

  const validated = validateMemoFields(
    memo_type, customer_type, direct_customer_id, tp_customer_id, delivery_address, itemsRaw,
  )
  if ('error' in validated) return validated
  const items = validated

  const { subtotal, lineDiscountTotal, totalAmount } = calcTotals(
    items, memo_discount_value, memo_discount_type,
  )

  const { error: memoError } = await auth.supabase
    .from('memos')
    .update({
      memo_type: memo_type as 'sales' | 'delivery',
      customer_type: customer_type as 'direct' | 'tp_customer',
      direct_customer_id: customer_type === 'direct' ? direct_customer_id : null,
      tp_customer_id: customer_type === 'tp_customer' ? tp_customer_id : null,
      delivery_address: memo_type === 'delivery' ? delivery_address : null,
      notes,
      subtotal,
      line_discount_total: lineDiscountTotal,
      memo_discount_value,
      memo_discount_type,
      total_amount: totalAmount,
    })
    .eq('id', id)

  if (memoError) return { error: memoError.message }

  await auth.supabase.from('memo_items').delete().eq('memo_id', id)

  const itemRows = items.map((item, idx) => {
    const gross = item.quantity * item.unit_price
    return {
      memo_id: id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_value: item.discount_value,
      discount_type: item.discount_type,
      line_total: gross - itemDiscountAmount(gross, item.discount_value, item.discount_type),
      sort_order: idx,
    }
  })

  const { error: itemsError } = await auth.supabase.from('memo_items').insert(itemRows)
  if (itemsError) return { error: 'Failed to update line items.' }

  revalidatePath('/dashboard/memos')
  revalidatePath(`/dashboard/memos/${id}`)
  redirect(`/dashboard/memos/${id}`)
}

// ── Status transitions ────────────────────────────────────────────────────────

export async function confirmMemo(id: string): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  const { data: memo } = await auth.supabase.from('memos').select('status').eq('id', id).single()
  if (!memo) return { error: 'Memo not found.' }
  if (memo.status !== 'draft') return { error: 'Only draft memos can be confirmed.' }
  const { error } = await auth.supabase.from('memos').update({ status: 'confirmed' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/memos')
  revalidatePath(`/dashboard/memos/${id}`)
}

export async function markPaid(
  id: string,
  paymentMethod: string,
): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  const { data: memo } = await auth.supabase
    .from('memos')
    .select('status, memo_type')
    .eq('id', id)
    .single()
  if (!memo) return { error: 'Memo not found.' }
  if (memo.memo_type !== 'sales') return { error: 'Only sales memos can be marked paid.' }
  if (memo.status !== 'confirmed') return { error: 'Only confirmed memos can be marked paid.' }

  const valid: PaymentMethod[] = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other']
  if (!valid.includes(paymentMethod as PaymentMethod)) return { error: 'Invalid payment method.' }

  const { error } = await auth.supabase
    .from('memos')
    .update({
      status: 'paid',
      payment_method: paymentMethod as PaymentMethod,
      paid_at: new Date().toISOString(),
      paid_by: auth.user.id,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/memos')
  revalidatePath(`/dashboard/memos/${id}`)
}

export async function markDelivered(id: string): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  if (!isAtLeast(auth.role, 'manager')) return { error: 'Only managers and above can mark deliveries.' }
  const { data: memo } = await auth.supabase
    .from('memos')
    .select('status, memo_type')
    .eq('id', id)
    .single()
  if (!memo) return { error: 'Memo not found.' }
  if (memo.memo_type !== 'delivery') return { error: 'Only delivery memos can be marked delivered.' }
  if (memo.status !== 'confirmed') return { error: 'Only confirmed memos can be marked delivered.' }
  const { error } = await auth.supabase
    .from('memos')
    .update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      delivered_by: auth.user.id,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/memos')
  revalidatePath(`/dashboard/memos/${id}`)
}

export async function cancelMemo(id: string): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  if (!isAtLeast(auth.role, 'manager')) return { error: 'Only managers and above can cancel memos.' }
  const { data: memo } = await auth.supabase.from('memos').select('status').eq('id', id).single()
  if (!memo) return { error: 'Memo not found.' }
  if (memo.status === 'paid') return { error: 'Paid memos cannot be cancelled.' }
  if (memo.status === 'delivered') return { error: 'Delivered memos cannot be cancelled.' }
  if (memo.status === 'cancelled') return { error: 'Memo is already cancelled.' }
  const { error } = await auth.supabase.from('memos').update({ status: 'cancelled' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/memos')
  revalidatePath(`/dashboard/memos/${id}`)
}

export async function deleteMemo(id: string): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  if (auth.role !== 'super_admin') return { error: 'Only super admins can delete memos.' }
  const { error } = await auth.supabase.from('memos').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/memos')
  redirect('/dashboard/memos')
}
