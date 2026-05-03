'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isAtLeast } from '@/lib/roles'
import type { Role, RefundMethod } from '@/lib/types'

export type ReturnFormState = { error: string } | null
export type ActionResult    = { error: string } | void

const VALID_REFUND_METHODS: RefundMethod[] = [
  'cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other',
]

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

// ── Create return (any staff) ─────────────────────────────────────────────────

export async function createReturn(
  _prev: ReturnFormState,
  formData: FormData,
): Promise<ReturnFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }

  const memo_id = formData.get('memo_id') as string
  const reason  = (formData.get('reason') as string)?.trim() || null
  const notes   = (formData.get('notes') as string)?.trim() || null

  let items: Array<{
    memo_item_id: string
    product_id: string
    quantity_returned: number
    refund_amount: number
  }>
  try {
    items = JSON.parse(formData.get('items') as string)
  } catch {
    return { error: 'Invalid items data.' }
  }

  if (!memo_id) return { error: 'Memo is required.' }
  if (!items || items.length === 0) return { error: 'At least one item must be selected.' }

  for (const item of items) {
    if (!item.quantity_returned || item.quantity_returned <= 0) {
      return { error: 'Return quantity must be greater than zero for each selected item.' }
    }
  }

  const { data: memo } = await auth.supabase
    .from('memos')
    .select('status')
    .eq('id', memo_id)
    .single()
  if (!memo) return { error: 'Memo not found.' }
  if (!['paid', 'delivered'].includes(memo.status)) {
    return { error: 'Returns can only be raised against paid or delivered memos.' }
  }

  const { data: ret, error: retErr } = await auth.supabase
    .from('returns')
    .insert({ memo_id, reason, notes, created_by: auth.user.id })
    .select('id')
    .single()
  if (retErr) return { error: retErr.message }

  const { error: itemsErr } = await auth.supabase.from('return_items').insert(
    items.map((item) => ({
      return_id:         ret.id,
      memo_item_id:      item.memo_item_id,
      product_id:        item.product_id,
      quantity_returned: item.quantity_returned,
      refund_amount:     item.refund_amount,
    })),
  )

  if (itemsErr) {
    await auth.supabase.from('returns').delete().eq('id', ret.id)
    if (itemsErr.code === '23514' || itemsErr.message.toLowerCase().includes('check')) {
      return { error: 'Return quantity exceeds what is available to return.' }
    }
    return { error: itemsErr.message }
  }

  revalidatePath('/dashboard/returns')
  redirect(`/dashboard/returns/${ret.id}`)
}

// ── Approve return (admin+) ───────────────────────────────────────────────────

export async function approveReturn(returnId: string): Promise<ActionResult> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  if (!isAtLeast(auth.role, 'admin')) return { error: 'Only admin and above can approve returns.' }

  const { error } = await auth.supabase
    .from('returns')
    .update({
      status:      'approved',
      approved_by: auth.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', returnId)
    .eq('status', 'pending')

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/returns/${returnId}`)
  revalidatePath('/dashboard/returns')
}

// ── Reject return (admin+) ────────────────────────────────────────────────────

export async function rejectReturn(returnId: string): Promise<ActionResult> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  if (!isAtLeast(auth.role, 'admin')) return { error: 'Only admin and above can reject returns.' }

  const { error } = await auth.supabase
    .from('returns')
    .update({
      status:      'rejected',
      approved_by: auth.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', returnId)
    .eq('status', 'pending')

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/returns/${returnId}`)
  revalidatePath('/dashboard/returns')
}

// ── Create refund (admin+) ────────────────────────────────────────────────────

export async function createRefund(
  _prev: ReturnFormState,
  formData: FormData,
): Promise<ReturnFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  if (!isAtLeast(auth.role, 'admin')) return { error: 'Only admin and above can create refunds.' }

  const return_id     = formData.get('return_id') as string
  const amount        = parseFloat(formData.get('amount') as string)
  const refund_method = formData.get('refund_method') as string
  const notes         = (formData.get('notes') as string)?.trim() || null

  if (!amount || amount <= 0) return { error: 'Refund amount must be greater than zero.' }
  if (!VALID_REFUND_METHODS.includes(refund_method as RefundMethod)) {
    return { error: 'Invalid refund method.' }
  }

  // Derive customer info from return → memo (don't trust client)
  type ReturnWithMemo = {
    status: string
    memo: {
      customer_type: string
      direct_customer_id: string | null
      tp_customer_id: string | null
    } | null
  }
  const { data: ret } = await auth.supabase
    .from('returns')
    .select('status, memo:memo_id(customer_type, direct_customer_id, tp_customer_id)')
    .eq('id', return_id)
    .single()
  const typedRet = ret as unknown as ReturnWithMemo | null
  if (!typedRet || !typedRet.memo) return { error: 'Return not found.' }
  if (typedRet.status !== 'approved') {
    return { error: 'Refunds can only be created for approved returns.' }
  }

  const { memo } = typedRet
  const { error } = await auth.supabase.from('refunds').insert({
    return_id,
    customer_type:      memo.customer_type as 'direct' | 'tp_customer',
    direct_customer_id: memo.customer_type === 'direct' ? memo.direct_customer_id : null,
    tp_customer_id:     memo.customer_type === 'tp_customer' ? memo.tp_customer_id : null,
    amount,
    refund_method:      refund_method as RefundMethod,
    notes,
    created_by:         auth.user.id,
  })

  if (error) {
    if (
      error.code === '23505' ||
      error.message.toLowerCase().includes('unique') ||
      error.message.toLowerCase().includes('duplicate')
    ) {
      return { error: 'A refund already exists for this return.' }
    }
    return { error: error.message }
  }

  revalidatePath(`/dashboard/returns/${return_id}`)
  revalidatePath('/dashboard/returns')
  redirect(`/dashboard/returns/${return_id}`)
}

// ── Process refund (admin+) ───────────────────────────────────────────────────

export async function processRefund(
  refundId: string,
  returnId: string,
): Promise<ActionResult> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  if (!isAtLeast(auth.role, 'admin')) return { error: 'Only admin and above can process refunds.' }

  const { error } = await auth.supabase
    .from('refunds')
    .update({
      status:       'processed',
      processed_by: auth.user.id,
      processed_at: new Date().toISOString(),
    })
    .eq('id', refundId)
    .eq('status', 'pending')

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/returns/${returnId}`)
  revalidatePath('/dashboard/returns')
  revalidatePath('/dashboard/payments')
}
