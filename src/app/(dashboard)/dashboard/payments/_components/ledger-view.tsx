import Link from 'next/link'
import { formatPrice } from '@/lib/format'
import { LedgerActions } from './ledger-actions'

// ── Types & builder ───────────────────────────────────────────────────────────

export type LedgerEntry = {
  id: string
  date: string
  kind: 'memo' | 'payment' | 'refund'
  description: string
  debit: number
  credit: number
  balance: number
  memoId?: string
  paymentId?: string
  isAuto?: boolean
}

type RawMemo = {
  id: string
  memo_number: string
  memo_type: string
  status: string
  total_amount: number
  created_at: string
}

type RawPayment = {
  id: string
  payment_number: string
  amount: number
  payment_method: string
  reference_number: string | null
  is_auto: boolean
  created_at: string
  ref_memo: { memo_number: string } | null
}

type RawRefund = {
  id: string
  refund_number: string
  amount: number
  refund_method: string
  processed_at: string
  ref_return: { return_number: string } | null
}

export function buildLedger(
  memos: RawMemo[],
  payments: unknown[],
  refunds: unknown[] = [],
): LedgerEntry[] {
  const rawPayments = payments as RawPayment[]
  const rawRefunds  = refunds  as RawRefund[]

  const memoEntries = memos.map((m): Omit<LedgerEntry, 'balance'> => ({
    id:          m.id,
    date:        m.created_at,
    kind:        'memo',
    description: `${m.memo_type === 'sales' ? 'Sales' : 'Delivery'} — #${m.memo_number}`,
    debit:       m.total_amount,
    credit:      0,
    memoId:      m.id,
  }))

  const paymentEntries = rawPayments.map((p): Omit<LedgerEntry, 'balance'> => ({
    id:   p.id,
    date: p.created_at,
    kind: 'payment',
    description: p.is_auto
      ? `Auto-payment — Memo #${(p.ref_memo as { memo_number: string } | null)?.memo_number ?? ''}`
      : `Payment — ${p.payment_method.replace('_', ' ')}${
          p.reference_number ? ` · ${p.reference_number}` : ''
        }`,
    debit:     0,
    credit:    p.amount,
    paymentId: p.id,
    isAuto:    p.is_auto,
  }))

  const refundEntries = rawRefunds.map((r): Omit<LedgerEntry, 'balance'> => ({
    id:          r.id,
    date:        r.processed_at,
    kind:        'refund',
    description: `Refund — #${r.refund_number}${
      r.ref_return ? ` · Return #${r.ref_return.return_number}` : ''
    }`,
    debit:  0,
    credit: r.amount,
  }))

  const combined = [...memoEntries, ...paymentEntries, ...refundEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  let running = 0
  return combined.map((entry) => {
    running += entry.debit - entry.credit
    return { ...entry, balance: running }
  })
}

// ── Presenter ─────────────────────────────────────────────────────────────────

interface LedgerViewProps {
  customerName: string
  customerPhone: string
  customerSub: string | null
  totalBilled: number
  totalPaid: number
  outstandingBalance: number
  ledger: LedgerEntry[]
  canEdit: boolean
  backHref: string
  newPaymentHref: string
  editPaymentHref: (id: string) => string
}

export function LedgerView({
  customerName,
  customerPhone,
  customerSub,
  totalBilled,
  totalPaid,
  outstandingBalance,
  ledger,
  canEdit,
  backHref,
  newPaymentHref,
  editPaymentHref,
}: LedgerViewProps) {
  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={backHref} className="text-xs text-gray-500 hover:text-gray-900">
            ← Payments
          </Link>
          <h1 className="mt-2 text-lg font-semibold text-gray-900">{customerName}</h1>
          <p className="text-sm text-gray-500">
            {customerPhone}
            {customerSub && <span className="text-gray-400"> · {customerSub}</span>}
          </p>
        </div>
        <Link
          href={newPaymentHref}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Record payment
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <SummaryCard label="Total billed" value={formatPrice(totalBilled)} />
        <SummaryCard label="Total paid"   value={formatPrice(totalPaid)} />
        <SummaryCard
          label="Outstanding"
          value={
            outstandingBalance === 0
              ? '—'
              : outstandingBalance > 0
              ? `${formatPrice(outstandingBalance)} due`
              : `${formatPrice(Math.abs(outstandingBalance))} credit`
          }
          highlight={
            outstandingBalance > 0 ? 'due' : outstandingBalance < 0 ? 'credit' : 'none'
          }
        />
      </div>

      {/* Ledger table */}
      {ledger.length === 0 ? (
        <p className="text-sm text-gray-400">No transactions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
                {canEdit && <th className="px-4 py-3 w-24" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.map((entry) => (
                <tr
                  key={`${entry.kind}-${entry.id}`}
                  className={entry.kind === 'memo' ? 'bg-gray-50/40' : ''}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                    {new Date(entry.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {entry.kind === 'memo' ? (
                      <Link
                        href={`/dashboard/memos/${entry.memoId}`}
                        className="hover:underline"
                      >
                        {entry.description}
                      </Link>
                    ) : entry.kind === 'refund' ? (
                      <span>
                        {entry.description}
                        <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                          refund
                        </span>
                      </span>
                    ) : (
                      <span>
                        {entry.description}
                        {entry.isAuto && (
                          <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                            auto
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {entry.debit > 0 ? formatPrice(entry.debit) : ''}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700">
                    {entry.credit > 0 ? formatPrice(entry.credit) : ''}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {entry.balance === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : entry.balance > 0 ? (
                      <span className="text-amber-700">{formatPrice(entry.balance)}</span>
                    ) : (
                      <span className="text-green-700">
                        {formatPrice(Math.abs(entry.balance))}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      {entry.kind === 'payment' && (
                        <LedgerActions
                          paymentId={entry.paymentId!}
                          editHref={editPaymentHref(entry.paymentId!)}
                        />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  highlight = 'none',
}: {
  label: string
  value: string
  highlight?: 'due' | 'credit' | 'none'
}) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          highlight === 'due'
            ? 'text-amber-700'
            : highlight === 'credit'
            ? 'text-green-700'
            : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
