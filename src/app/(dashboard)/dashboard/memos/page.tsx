import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { Role, MemoType, MemoStatus } from '@/lib/types'

export const metadata = { title: 'Memos' }

type SearchParams = Promise<{ status?: string; type?: string }>

const STATUS_FILTERS = [
  { key: 'all',       label: 'All'       },
  { key: 'draft',     label: 'Draft'     },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'paid',      label: 'Paid'      },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

const TYPE_FILTERS = [
  { key: 'all',      label: 'All types' },
  { key: 'sales',    label: 'Sales'     },
  { key: 'delivery', label: 'Delivery'  },
] as const

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-50 text-blue-700',
  paid:      'bg-green-50 text-green-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-500',
}

type MemoRow = {
  id: string
  memo_number: string
  memo_type: MemoType
  customer_type: 'direct' | 'tp_customer'
  status: MemoStatus
  total_amount: number
  created_at: string
  direct_customer: { name: string } | null
  tp_customer: { name: string } | null
}

export default async function MemosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { status = 'all', type = 'all' } = await searchParams

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

  let query = supabase
    .from('memos')
    .select(
      'id, memo_number, memo_type, customer_type, status, total_amount, created_at, direct_customer:direct_customer_id(name), tp_customer:tp_customer_id(name)',
    )
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status as MemoStatus)
  if (type !== 'all')   query = query.eq('memo_type', type as MemoType)

  const { data } = await query
  const memos = (data ?? []) as unknown as MemoRow[]

  function filterHref(s: string, t: string) {
    const p = new URLSearchParams()
    if (s !== 'all') p.set('status', s)
    if (t !== 'all') p.set('type', t)
    const q = p.toString()
    return `/dashboard/memos${q ? `?${q}` : ''}`
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Memos</h1>
        <Link
          href="/dashboard/memos/new"
          className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New memo
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={filterHref(f.key, type)}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                status === f.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={filterHref(status, f.key)}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                type === f.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {memos.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No memos found.</p>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="lg:hidden space-y-2">
            {memos.map((m) => {
              const customerName =
                m.customer_type === 'direct'
                  ? m.direct_customer?.name
                  : m.tp_customer?.name
              return (
                <Link
                  key={m.id}
                  href={`/dashboard/memos/${m.id}`}
                  className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4 active:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-900">
                        {m.memo_number}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${
                          STATUS_BADGE[m.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {m.status}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${
                          m.memo_type === 'sales'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {m.memo_type}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-700">
                      {customerName ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(m.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 tabular-nums text-sm font-semibold text-gray-900">
                    {formatPrice(m.total_amount)}
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
                  <th className="px-4 py-3">Memo #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
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
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/memos/${m.id}`}
                          className="font-mono text-xs font-semibold text-gray-900 hover:underline"
                        >
                          {m.memo_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{customerName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ${
                            m.memo_type === 'sales'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {m.memo_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ${
                            STATUS_BADGE[m.status] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                        {formatPrice(m.total_amount)}
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
                          href={`/dashboard/memos/${m.id}`}
                          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {memos.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          {memos.length} memo{memos.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
