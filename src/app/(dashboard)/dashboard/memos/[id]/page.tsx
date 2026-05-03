import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import { StatusActions } from '../_components/status-actions'
import { PdfButtons } from './_components/pdf-buttons'
import type { Role, Memo, MemoItem } from '@/lib/types'

export const metadata = { title: 'Memo' }

type Params = Promise<{ id: string }>

type ItemRow = MemoItem & {
  product: { name: string; sku: string | null; unit: string } | null
}

export default async function MemoDetailPage({ params }: { params: Params }) {
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

  const [{ data: memo }, { data: rawItems }] = await Promise.all([
    supabase.from('memos').select('*').eq('id', id).single(),
    supabase
      .from('memo_items')
      .select('*, product:product_id(name, sku, unit)')
      .eq('memo_id', id)
      .order('sort_order'),
  ])

  if (!memo) notFound()
  const items = (rawItems ?? []) as unknown as ItemRow[]

  // Fetch customer info
  let customerName  = '—'
  let customerPhone = ''
  let tradePartner  = ''

  if (memo.customer_type === 'direct' && memo.direct_customer_id) {
    const { data } = await supabase
      .from('direct_customers')
      .select('name, phone')
      .eq('id', memo.direct_customer_id)
      .single()
    customerName  = data?.name  ?? '—'
    customerPhone = data?.phone ?? ''
  } else if (memo.customer_type === 'tp_customer' && memo.tp_customer_id) {
    const { data: tc } = await supabase
      .from('tp_customers')
      .select('name, phone, trade_partner_id')
      .eq('id', memo.tp_customer_id)
      .single()
    if (tc) {
      customerName  = tc.name
      customerPhone = tc.phone
      const { data: tp } = await supabase
        .from('trade_partners')
        .select('name')
        .eq('id', tc.trade_partner_id)
        .single()
      tradePartner = tp?.name ?? ''
    }
  }

  const afterLine =
    (memo as Memo).subtotal - (memo as Memo).line_discount_total
  const memoDiscountActual =
    (memo as Memo).memo_discount_type === 'flat'
      ? Math.min((memo as Memo).memo_discount_value, afterLine)
      : (afterLine * (memo as Memo).memo_discount_value) / 100

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/memos" className="text-xs text-gray-500 hover:text-gray-900">
          ← Memos
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold text-gray-900">
              {(memo as Memo).memo_number}
            </h1>
            <StatusBadge status={(memo as Memo).status} />
            <TypeBadge type={(memo as Memo).memo_type} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <StatusActions
            memo={{
              id: (memo as Memo).id,
              memo_type: (memo as Memo).memo_type,
              status: (memo as Memo).status,
            }}
            role={role}
          />
          {(['paid', 'delivered'] as const).includes((memo as Memo).status as 'paid' | 'delivered') && (
            <Link
              href={`/dashboard/returns/new?memoId=${(memo as Memo).id}`}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-500"
            >
              Raise return
            </Link>
          )}
          {(['confirmed', 'paid', 'delivered'] as const).includes(
            (memo as Memo).status as 'confirmed' | 'paid' | 'delivered',
          ) && (
            <PdfButtons
              memoId={(memo as Memo).id}
              memoNumber={(memo as Memo).memo_number}
              customerName={customerName}
              customerPhone={customerPhone}
              totalAmount={(memo as Memo).total_amount}
              memoType={(memo as Memo).memo_type}
              memoDate={new Date((memo as Memo).created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
              memoStatus={(memo as Memo).status}
            />
          )}
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="mb-6 grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        <MetaBlock label="Customer">
          <p className="font-medium text-gray-900">{customerName}</p>
          {customerPhone && <p className="text-gray-500">{customerPhone}</p>}
          {tradePartner  && <p className="text-xs text-gray-400">{tradePartner}</p>}
        </MetaBlock>

        <MetaBlock label="Date">
          <p className="text-gray-700">
            {new Date((memo as Memo).created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </MetaBlock>

        {(memo as Memo).memo_type === 'delivery' && (memo as Memo).delivery_address && (
          <MetaBlock label="Delivery address">
            <p className="text-gray-700">{(memo as Memo).delivery_address}</p>
          </MetaBlock>
        )}

        {(memo as Memo).payment_method && (
          <MetaBlock label="Payment method">
            <p className="capitalize text-gray-700">
              {(memo as Memo).payment_method!.replace('_', ' ')}
            </p>
          </MetaBlock>
        )}

        {(memo as Memo).notes && (
          <MetaBlock label="Notes" wide>
            <p className="text-gray-700">{(memo as Memo).notes}</p>
          </MetaBlock>
        )}
      </div>

      {/* Line items */}
      <div className="mb-6 overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit price</th>
              <th className="px-4 py-3 text-right">Discount</th>
              <th className="px-4 py-3 text-right">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const gross = item.quantity * item.unit_price
              const discAmt =
                item.discount_type === 'flat'
                  ? Math.min(item.discount_value, gross)
                  : (gross * item.discount_value) / 100
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.product?.name ?? '—'}</div>
                    {item.product?.sku && (
                      <div className="font-mono text-xs text-gray-400">{item.product.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {item.quantity} {item.product?.unit}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {formatPrice(item.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                    {discAmt > 0
                      ? (item.discount_type === 'percent'
                          ? `${item.discount_value}% = `
                          : '') + `−${formatPrice(discAmt)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                    {formatPrice(item.line_total)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full sm:w-72 rounded border border-gray-200 bg-gray-50 p-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice((memo as Memo).subtotal)}</span>
            </div>
            {(memo as Memo).line_discount_total > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Item discounts</span>
                <span className="tabular-nums text-red-600">
                  −{formatPrice((memo as Memo).line_discount_total)}
                </span>
              </div>
            )}
            {memoDiscountActual > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>
                  Memo discount
                  {(memo as Memo).memo_discount_type === 'percent' &&
                    ` (${(memo as Memo).memo_discount_value}%)`}
                </span>
                <span className="tabular-nums text-red-600">
                  −{formatPrice(memoDiscountActual)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold text-gray-900">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice((memo as Memo).total_amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaBlock({
  label,
  children,
  wide,
}: {
  label: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600',
    confirmed: 'bg-blue-50 text-blue-700',
    paid:      'bg-green-50 text-green-700',
    delivered: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-500',
  }
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ${
        colors[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ${
        type === 'sales' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-500'
      }`}
    >
      {type}
    </span>
  )
}
