'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type CustomerFormState = { error: string } | null

// ── Shared helpers ────────────────────────────────────────────────────────────

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
  return { supabase, user, role: profile.role }
}

function requireManager(role: string): CustomerFormState | null {
  return ['super_admin', 'admin', 'manager'].includes(role)
    ? null
    : { error: 'Only managers and above can manage customers.' }
}

function uniquePhoneError(message: string): CustomerFormState {
  if (message.includes('phone'))
    return { error: 'This phone number is already in use.' }
  return { error: message }
}

// ── Direct customers ──────────────────────────────────────────────────────────

export async function upsertDirectCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  const check = requireManager(auth.role)
  if (check) return check

  const { supabase, user } = auth
  const id      = (formData.get('id') as string) || null
  const name    = (formData.get('name') as string).trim()
  const phone   = (formData.get('phone') as string).trim()
  const address = (formData.get('address') as string).trim() || null
  const notes   = (formData.get('notes') as string).trim() || null
  const is_active = formData.get('is_active') === 'true'

  if (!name)  return { error: 'Name is required.' }
  if (!phone) return { error: 'Phone is required.' }

  const payload = { name, phone, address, notes }
  const res = id
    ? await supabase.from('direct_customers').update({ ...payload, is_active }).eq('id', id)
    : await supabase.from('direct_customers').insert({ ...payload, is_active: true, created_by: user.id })

  if (res.error) {
    if (res.error.code === '23505') return uniquePhoneError(res.error.message)
    return { error: res.error.message }
  }

  revalidatePath('/dashboard/customers')
  redirect('/dashboard/customers?tab=direct')
}

export async function toggleDirectCustomerActive(
  id: string,
  value: boolean,
): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  const check = requireManager(auth.role)
  if (check) return check
  const { error } = await auth.supabase
    .from('direct_customers')
    .update({ is_active: value })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/customers')
}

// ── Trade partners ────────────────────────────────────────────────────────────

export async function upsertTradePartner(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  const check = requireManager(auth.role)
  if (check) return check

  const { supabase, user } = auth
  const id      = (formData.get('id') as string) || null
  const name    = (formData.get('name') as string).trim()
  const phone   = (formData.get('phone') as string).trim()
  const address = (formData.get('address') as string).trim() || null
  const gstin   = (formData.get('gstin') as string).trim() || null
  const notes   = (formData.get('notes') as string).trim() || null
  const is_active = formData.get('is_active') === 'true'

  if (!name)  return { error: 'Name is required.' }
  if (!phone) return { error: 'Phone is required.' }

  const payload = { name, phone, address, gstin, notes }
  const res = id
    ? await supabase.from('trade_partners').update({ ...payload, is_active }).eq('id', id)
    : await supabase.from('trade_partners').insert({ ...payload, is_active: true, created_by: user.id })

  if (res.error) {
    if (res.error.code === '23505') return uniquePhoneError(res.error.message)
    return { error: res.error.message }
  }

  revalidatePath('/dashboard/customers')
  redirect('/dashboard/customers?tab=trade-partners')
}

export async function toggleTradePartnerActive(
  id: string,
  value: boolean,
): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  const check = requireManager(auth.role)
  if (check) return check
  const { error } = await auth.supabase
    .from('trade_partners')
    .update({ is_active: value })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/customers')
}

// ── TP customers ──────────────────────────────────────────────────────────────

export async function upsertTpCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  const check = requireManager(auth.role)
  if (check) return check

  const { supabase, user } = auth
  const id               = (formData.get('id') as string) || null
  const trade_partner_id = (formData.get('trade_partner_id') as string).trim()
  const name    = (formData.get('name') as string).trim()
  const phone   = (formData.get('phone') as string).trim()
  const address = (formData.get('address') as string).trim() || null
  const notes   = (formData.get('notes') as string).trim() || null
  const is_active = formData.get('is_active') === 'true'

  if (!trade_partner_id) return { error: 'Trade partner is required.' }
  if (!name)  return { error: 'Name is required.' }
  if (!phone) return { error: 'Phone is required.' }

  const payload = { trade_partner_id, name, phone, address, notes }
  const res = id
    ? await supabase.from('tp_customers').update({ ...payload, is_active }).eq('id', id)
    : await supabase.from('tp_customers').insert({ ...payload, is_active: true, created_by: user.id })

  if (res.error) {
    if (res.error.code === '23505')
      return { error: 'This phone number is already registered under this trade partner.' }
    return { error: res.error.message }
  }

  revalidatePath('/dashboard/customers')
  redirect('/dashboard/customers?tab=tp-customers')
}

export async function toggleTpCustomerActive(
  id: string,
  value: boolean,
): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }
  const check = requireManager(auth.role)
  if (check) return check
  const { error } = await auth.supabase
    .from('tp_customers')
    .update({ is_active: value })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/customers')
}
