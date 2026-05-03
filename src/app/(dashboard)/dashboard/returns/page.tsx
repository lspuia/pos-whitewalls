import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { ReturnStatus } from '@/lib/types'

export const metadata = { title: 'Returns' }

type SearchParams = Promise<{ status?: string; q?: string }>

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const STATUS_STYLES: Record<ReturnStatus, string> = {
  pending:  'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-500',
}

type ReturnRow = {
  id:            string
  return_number: string
  status:        ReturnStatus
  created_at:    string
  memo: {
    memo_number:     string
    customer_type:   string
    direct_customer: { name: string } | null
    tp_customer:     { name: string } | null
  } | null
  return_items: { refund_amount: number }[]
}

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { status = 'all', q } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('returns')
    .select(`
      id, return_number, status, created_at,
      memo:memo_id(
        memo_number, customer_type,
        direct_customer:direct_customer_id(name),
        tp_customer:tp_customer_id(name)
      ),
      return_items(refund_amount)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status !== 'all') {
    query = query.eq('status', status as ReturnStatus)
  }

  const { data } = await query
  const returns = (data ?? []) as unknown as ReturnRow[]

  const filtered = q
    ? returns.filter((r) => {
        const customerName =
          r.memo?.customer_type === 'direct'
            ? r.memo.direct_customer?.name
            : r.memo?.tp_customer?.name
        const memoNum = r.memo?.memo_number ?? ''
        return (
          r.return_number.toLowerCase().includes(q.toLowerCase()) ||
          memoNum.toLowerCase().includes(q.toLowerCase()) ||
          (customerName?.toLowerCase().includes(q.toLowerCase()) ?? false)
        )
      })
    : returns

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Returns</h1>
        <Link
          href="/dashboard/returns/new"
          className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Raise return
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map(({ key, label }) => {
            const active = status === key
            const href   = key === 'all' ? '/dashboard/returns' : `/dashboard/returns?status=${key}`
            return (
              <Link
                key={key}
                href={href}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
        <form method="GET">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search return #, memo #, customer…"
            className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </form>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">No returns found.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {filtered.map((r) => {
              const customerName =
                r.memo?.customer_type === 'direct'
                  ? r.memo.direct_customer?.name
                  : r.memo?.tp_customer?.name
              const totalAmount = r.return_items.reduce((s, i) => s + i.refund_amount, 0)
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/returns/${r.id}`}
                  className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4 active:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-900">
                        #{r.return_number}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{customerName ?? '—'}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {r.memo?.memo_number ? `#${r.memo.memo_number} · ` : ''}
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                    {totalAmount > 0 ? formatPrice(totalAmount) : '—'}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Return #</th>
                  <th className="px-4 py-3">Memo</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Return value</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => {
                  const customerName =
                    r.memo?.customer_type === 'direct'
                      ? r.memo.direct_customer?.name
                      : r.memo?.tp_customer?.name
                  const totalAmount = r.return_items.reduce((s, i) => s + i.refund_amount, 0)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/returns/${r.id}`} className="font-mono text-xs text-gray-900 hover:underline">
                          #{r.return_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {r.memo ? (
                          <span className="text-xs text-gray-500">#{r.memo.memo_number}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{customerName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {totalAmount > 0 ? formatPrice(totalAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
