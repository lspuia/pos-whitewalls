import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import { isAtLeast } from '@/lib/roles'
import { ReturnActions } from '../_components/return-actions'
import type { Role, ReturnStatus, RefundStatus } from '@/lib/types'

type Params = Promise<{ id: string }>

const STATUS_STYLES: Record<ReturnStatus, string> = {
  pending:  'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-500',
}

type ReturnDetail = {
  id:            string
  return_number: string
  memo_id:       string
  reason:        string | null
  notes:         string | null
  status:        ReturnStatus
  approved_at:   string | null
  created_at:    string
  memo: {
    id:            string
    memo_number:   string
    memo_type:     string
    status:        string
    total_amount:  number
    customer_type: string
    direct_customer: { name: string } | null
    tp_customer:     { name: string } | null
  } | null
}

type ReturnItemRow = {
  id:                string
  memo_item_id:      string
  product_id:        string
  quantity_returned: number
  refund_amount:     number
  product: { name: string; sku: string | null; unit: string } | null
}

type RefundRow = {
  id:             string
  refund_number:  string
  amount:         number
  refund_method:  string
  status:         RefundStatus
  processed_at:   string | null
  notes:          string | null
  created_at:     string
}

export default async function ReturnDetailPage({ params }: { params: Params }) {
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

  const [
    { data: retData },
    { data: itemsData },
    { data: refundData },
  ] = await Promise.all([
    supabase
      .from('returns')
      .select(`
        id, return_number, memo_id, reason, notes, status, approved_at, created_at,
        memo:memo_id(
          id, memo_number, memo_type, status, total_amount, customer_type,
          direct_customer:direct_customer_id(name),
          tp_customer:tp_customer_id(name)
        )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('return_items')
      .select('id, memo_item_id, product_id, quantity_returned, refund_amount, product:product_id(name, sku, unit)')
      .eq('return_id', id),
    supabase
      .from('refunds')
      .select('id, refund_number, amount, refund_method, status, processed_at, notes, created_at')
      .eq('return_id', id)
      .maybeSingle(),
  ])

  if (!retData) notFound()

  const ret   = retData as unknown as ReturnDetail
  const items = (itemsData ?? []) as unknown as ReturnItemRow[]
  const refund = refundData as unknown as RefundRow | null

  const memo = ret.memo
  const customerName =
    memo?.customer_type === 'direct'
      ? memo.direct_customer?.name
      : memo?.tp_customer?.name

  const totalAmount = items.reduce((s, i) => s + i.refund_amount, 0)

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/returns" className="text-xs text-gray-500 hover:text-gray-900">
          ← Returns
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">
            Return #{ret.return_number}
          </h1>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[ret.status]}`}
          >
            {ret.status}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
        {memo && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Memo</p>
            <Link
              href={`/dashboard/memos/${memo.id}`}
              className="text-gray-800 hover:underline font-mono"
            >
              #{memo.memo_number}
            </Link>
            <span className="ml-1.5 capitalize text-gray-500">({memo.memo_type})</span>
          </div>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Customer</p>
          <p className="text-gray-800">{customerName ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Raised</p>
          <p className="text-gray-800">
            {new Date(ret.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        {ret.approved_at && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {ret.status === 'approved' ? 'Approved' : 'Rejected'}
            </p>
            <p className="text-gray-800">
              {new Date(ret.approved_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
        {ret.reason && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Reason</p>
            <p className="text-gray-800">{ret.reason}</p>
          </div>
        )}
        {ret.notes && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Notes</p>
            <p className="text-gray-600">{ret.notes}</p>
          </div>
        )}
      </div>

      {/* Return items */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-gray-700">Items returned</p>
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Qty returned</th>
                <th className="px-4 py-3 text-right">Refund amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{item.product?.name ?? '—'}</div>
                    {item.product?.sku && (
                      <div className="font-mono text-xs text-gray-400">{item.product.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {item.quantity_returned} {item.product?.unit ?? ''}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {formatPrice(item.refund_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-700" colSpan={2}>
                  Total return value
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                  {formatPrice(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions + refund */}
      {isAtLeast(role, 'admin') && (
        <ReturnActions
          returnId={ret.id}
          returnStatus={ret.status}
          role={role}
          totalAmount={totalAmount}
          refund={refund}
        />
      )}
    </div>
  )
}
