import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { MemoForm } from '../../_components/memo-form'
import type { Role, MemoItem } from '@/lib/types'

export const metadata = { title: 'Edit memo' }

type Params = Promise<{ id: string }>
type ItemRow = MemoItem & {
  product: { name: string; sku: string | null; unit: string } | null
}

export default async function EditMemoPage({ params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')
  const role = profile.role as Role

  const { data: memo } = await supabase.from('memos').select('*').eq('id', id).single()
  if (!memo) notFound()

  if (['paid', 'delivered', 'cancelled'].includes(memo.status)) {
    redirect(`/dashboard/memos/${id}`)
  }
  if (memo.status === 'confirmed' && !isAtLeast(role, 'admin')) {
    redirect(`/dashboard/memos/${id}`)
  }

  const [{ data: rawItems }, { data: products }, { data: directCustomers }, { data: tradePartners }, { data: tpCustomers }] =
    await Promise.all([
      supabase
        .from('memo_items')
        .select('*, product:product_id(name, sku, unit)')
        .eq('memo_id', id)
        .order('sort_order'),
      supabase
        .from('products')
        .select('id, name, sku, barcode, price, unit')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('direct_customers')
        .select('id, name, phone')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('trade_partners')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('tp_customers')
        .select('id, name, trade_partner_id')
        .eq('is_active', true)
        .order('name'),
    ])

  const items = (rawItems ?? []) as unknown as ItemRow[]

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link
          href={`/dashboard/memos/${id}`}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← {memo.memo_number}
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Edit memo</h1>
        {memo.status === 'confirmed' && (
          <p className="mt-1 text-xs text-amber-600">
            This memo is confirmed — editing requires admin access.
          </p>
        )}
      </div>
      <MemoForm
        memo={memo}
        initialItems={items.map((item) => ({
          product_id:     item.product_id,
          quantity:       item.quantity,
          unit_price:     item.unit_price,
          discount_value: item.discount_value,
          discount_type:  item.discount_type,
          product:        item.product ?? { name: 'Unknown', sku: null, unit: 'pcs' },
        }))}
        products={products ?? []}
        directCustomers={directCustomers ?? []}
        tradePartners={tradePartners ?? []}
        tpCustomers={tpCustomers ?? []}
      />
    </div>
  )
}
