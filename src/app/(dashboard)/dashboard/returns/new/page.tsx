import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReturnForm } from '../_components/return-form'
import type { ReturnableItem } from '../_components/return-form'

export const metadata = { title: 'Raise return' }

type SearchParams = Promise<{ memoId?: string; q?: string }>

type MemoItemRow = {
  id:         string
  product_id: string
  quantity:   number
  line_total: number
  product: { name: string; sku: string | null; unit: string } | null
}

type MemoListRow = {
  id:          string
  memo_number: string
  memo_type:   string
  customer_type: string
  created_at:  string
  direct_customer: { name: string } | null
  tp_customer:     { name: string } | null
}

export default async function NewReturnPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { memoId, q } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Memo selected: show full return form ───────────────────────────────────
  if (memoId) {
    const { data: memo } = await supabase
      .from('memos')
      .select('id, memo_number, status')
      .eq('id', memoId)
      .single()

    if (!memo) notFound()
    if (!['paid', 'delivered'].includes(memo.status)) {
      redirect('/dashboard/returns/new')
    }

    // Fetch memo items with product info
    const { data: rawItems } = await supabase
      .from('memo_items')
      .select('id, product_id, quantity, line_total, product:product_id(name, sku, unit)')
      .eq('memo_id', memoId)
      .order('sort_order')
    const items = (rawItems ?? []) as unknown as MemoItemRow[]

    // Compute already-returned quantities per memo_item_id (from non-rejected returns)
    const { data: existingReturns } = await supabase
      .from('returns')
      .select('id')
      .eq('memo_id', memoId)
      .neq('status', 'rejected')
    const returnIds = (existingReturns ?? []).map((r) => r.id)

    const alreadyReturnedMap: Record<string, number> = {}
    if (returnIds.length > 0) {
      const { data: retItems } = await supabase
        .from('return_items')
        .select('memo_item_id, quantity_returned')
        .in('return_id', returnIds)
      for (const ri of retItems ?? []) {
        alreadyReturnedMap[ri.memo_item_id] =
          (alreadyReturnedMap[ri.memo_item_id] ?? 0) + ri.quantity_returned
      }
    }

    const returnableItems: ReturnableItem[] = items
      .map((item) => {
        const alreadyReturned = alreadyReturnedMap[item.id] ?? 0
        const maxReturnable   = item.quantity - alreadyReturned
        return {
          memoItemId:    item.id,
          productId:     item.product_id,
          productName:   item.product?.name ?? '—',
          productSku:    item.product?.sku ?? null,
          productUnit:   item.product?.unit ?? '',
          quantity:      item.quantity,
          lineTotal:     item.line_total,
          maxReturnable,
        }
      })
      .filter((item) => item.maxReturnable > 0)

    return (
      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <Link
            href="/dashboard/returns/new"
            className="text-xs text-gray-500 hover:text-gray-900"
          >
            ← Change memo
          </Link>
          <h1 className="mt-2 text-lg font-semibold text-gray-900">Raise return</h1>
        </div>
        <ReturnForm
          memoId={memo.id}
          memoNumber={memo.memo_number}
          items={returnableItems}
        />
      </div>
    )
  }

  // ── No memo selected: show memo picker ────────────────────────────────────
  let memoQuery = supabase
    .from('memos')
    .select(`
      id, memo_number, memo_type, customer_type, created_at,
      direct_customer:direct_customer_id(name),
      tp_customer:tp_customer_id(name)
    `)
    .in('status', ['paid', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(60)

  if (q) {
    memoQuery = memoQuery.ilike('memo_number', `%${q}%`)
  }

  const { data: memoData } = await memoQuery
  const memos = (memoData ?? []) as unknown as MemoListRow[]

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/returns"
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← Returns
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Raise return</h1>
        <p className="mt-1 text-sm text-gray-500">Select a paid or delivered memo to raise a return against.</p>
      </div>

      {/* Memo search */}
      <form method="GET" className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by memo number…"
          autoFocus
          className="w-64 rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </form>

      {memos.length === 0 ? (
        <p className="text-sm text-gray-400">No paid or delivered memos found.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white max-w-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Memo #</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {memos.map((m) => {
                const customerName =
                  m.customer_type === 'direct'
                    ? m.direct_customer?.name
                    : m.tp_customer?.name
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">
                      #{m.memo_number}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">{m.memo_type}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {customerName ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(m.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/returns/new?memoId=${m.id}`}
                        className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-500"
                      >
                        Select
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
