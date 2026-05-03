'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isAtLeast } from '@/lib/roles'
import type { PaymentMethod, Role } from '@/lib/types'

export type PaymentFormState = { error: string } | null

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

const VALID_METHODS: PaymentMethod[] = [
  'cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other',
]

function ledgerPath(customerType: string, customerId: string) {
  const segment = customerType === 'direct' ? 'direct' : 'tp'
  return `/dashboard/payments/${segment}/${customerId}`
}

// ── Create payment (all staff) ────────────────────────────────────────────────

export async function createPayment(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }

  const customer_type    = formData.get('customer_type') as string
  const direct_id        = (formData.get('direct_customer_id') as string) || null
  const tp_id            = (formData.get('tp_customer_id')     as string) || null
  const amount           = parseFloat(formData.get('amount') as string)
  const payment_method   = formData.get('payment_method') as string
  const reference_number = (formData.get('reference_number') as string)?.trim() || null
  const ref_memo_id      = (formData.get('reference_memo_id') as string) || null
  const notes            = (formData.get('notes') as string)?.trim() || null

  if (!['direct', 'tp_customer'].includes(customer_type)) {
    return { error: 'Customer type is required.' }
  }
  if (customer_type === 'direct'      && !direct_id) return { error: 'Customer is required.' }
  if (customer_type === 'tp_customer' && !tp_id)     return { error: 'TP customer is required.' }
  if (!amount || amount <= 0) return { error: 'Amount must be greater than zero.' }
  if (!VALID_METHODS.includes(payment_method as PaymentMethod)) {
    return { error: 'Invalid payment method.' }
  }

  const { error } = await auth.supabase.from('payments').insert({
    customer_type:      customer_type as 'direct' | 'tp_customer',
    direct_customer_id: customer_type === 'direct'      ? direct_id : null,
    tp_customer_id:     customer_type === 'tp_customer' ? tp_id     : null,
    amount,
    payment_method:     payment_method as PaymentMethod,
    reference_number,
    reference_memo_id:  ref_memo_id || null,
    is_auto:            false,
    notes,
    created_by:         auth.user.id,
  })

  if (error) return { error: error.message }

  const customerId = customer_type === 'direct' ? direct_id! : tp_id!
  revalidatePath('/dashboard/payments')
  revalidatePath(ledgerPath(customer_type, customerId))
  redirect(ledgerPath(customer_type, customerId))
}

// ── Update payment (admin+) ───────────────────────────────────────────────────

export async function updatePayment(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  if (!isAtLeast(auth.role, 'admin')) {
    return { error: 'Only admin and above can edit payments.' }
  }

  const id             = formData.get('id') as string
  const amount         = parseFloat(formData.get('amount') as string)
  const payment_method = formData.get('payment_method') as string
  const ref_number     = (formData.get('reference_number') as string)?.trim() || null
  const ref_memo_id    = (formData.get('reference_memo_id') as string) || null
  const notes          = (formData.get('notes') as string)?.trim() || null

  if (!amount || amount <= 0) return { error: 'Amount must be greater than zero.' }
  if (!VALID_METHODS.includes(payment_method as PaymentMethod)) {
    return { error: 'Invalid payment method.' }
  }

  const { data: existing } = await auth.supabase
    .from('payments')
    .select('customer_type, direct_customer_id, tp_customer_id')
    .eq('id', id)
    .single()
  if (!existing) return { error: 'Payment not found.' }

  const { error } = await auth.supabase
    .from('payments')
    .update({
      amount,
      payment_method:    payment_method as PaymentMethod,
      reference_number:  ref_number,
      reference_memo_id: ref_memo_id || null,
      notes,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  const customerId =
    existing.customer_type === 'direct'
      ? existing.direct_customer_id!
      : existing.tp_customer_id!

  revalidatePath('/dashboard/payments')
  revalidatePath(ledgerPath(existing.customer_type, customerId))
  redirect(ledgerPath(existing.customer_type, customerId))
}

// ── Delete payment (admin+) ───────────────────────────────────────────────────

export async function deletePayment(id: string): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  if (!isAtLeast(auth.role, 'admin')) {
    return { error: 'Only admin and above can delete payments.' }
  }

  const { data: existing } = await auth.supabase
    .from('payments')
    .select('customer_type, direct_customer_id, tp_customer_id')
    .eq('id', id)
    .single()
  if (!existing) return { error: 'Payment not found.' }

  const { error } = await auth.supabase.from('payments').delete().eq('id', id)
  if (error) return { error: error.message }

  const customerId =
    existing.customer_type === 'direct'
      ? existing.direct_customer_id!
      : existing.tp_customer_id!

  revalidatePath('/dashboard/payments')
  revalidatePath(ledgerPath(existing.customer_type, customerId))
}
