'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Product } from '@/lib/types'

export type ProductFormState = { error: string } | null

// ── Role helper ───────────────────────────────────────────────────────────────

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

// ── Upsert ────────────────────────────────────────────────────────────────────

export async function upsertProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }

  const { supabase, user, role } = auth

  if (!['super_admin', 'admin', 'manager'].includes(role)) {
    return { error: 'Only managers and above can manage products.' }
  }

  const id          = (formData.get('id') as string) || null
  const name        = (formData.get('name') as string).trim()
  const sku         = (formData.get('sku') as string).trim() || null
  const barcode     = (formData.get('barcode') as string).trim() || null
  const category    = (formData.get('category') as string).trim() || null
  const unit        = (formData.get('unit') as string).trim() || 'pcs'
  const description = (formData.get('description') as string).trim() || null
  const is_active   = formData.get('is_active') === 'true'

  if (!name) return { error: 'Name is required.' }

  const price = parseFloat(formData.get('price') as string)
  if (isNaN(price) || price < 0) return { error: 'Price must be a non-negative number.' }

  const stock_qty = parseInt(formData.get('stock_qty') as string, 10)
  if (isNaN(stock_qty) || stock_qty < 0) {
    return { error: 'Stock quantity must be a non-negative integer.' }
  }

  const payload = { name, sku, barcode, category, price, stock_qty, unit, description }

  let dbError
  if (id) {
    const res = await supabase
      .from('products')
      .update({ ...payload, is_active })
      .eq('id', id)
    dbError = res.error
  } else {
    const res = await supabase
      .from('products')
      .insert({ ...payload, is_active: true, created_by: user.id })
    dbError = res.error
  }

  if (dbError) {
    if (dbError.code === '23505') {
      if (dbError.message.includes('sku'))     return { error: 'This SKU is already in use.' }
      if (dbError.message.includes('barcode')) return { error: 'This barcode is already in use.' }
    }
    return { error: dbError.message }
  }

  revalidatePath('/dashboard/products')
  redirect('/dashboard/products')
}

// ── Toggle active ─────────────────────────────────────────────────────────────

export async function toggleProductActive(
  productId: string,
  newValue: boolean,
): Promise<{ error: string } | void> {
  const auth = await getAuth()
  if (!auth) return { error: 'Not authenticated.' }

  const { supabase, role } = auth

  if (!['super_admin', 'admin'].includes(role)) {
    return { error: 'Only admins can activate or deactivate products.' }
  }

  const { error } = await supabase
    .from('products')
    .update({ is_active: newValue })
    .eq('id', productId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/products')
}

// ── Barcode lookup (called from BarcodeScanner client component) ──────────────

export async function lookupBarcode(barcode: string): Promise<Product | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode.trim())
    .maybeSingle()
  return data
}
