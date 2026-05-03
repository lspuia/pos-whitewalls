import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Payments' }

type SearchParams = Promise<{ tab?: string; q?: string }>

const TABS = [
  { key: 'direct', label: 'Direct Customers'  },
  { key: 'tp',     label: 'TP Customers'      },
] as const
type TabKey = (typeof TABS)[number]['key']

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { tab = 'direct', q = '' } = await searchParams
  const activeTab: TabKey = tab === 'tp' ? 'tp' : 'direct'

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

  // Fetch the relevant balance view
  let directRows: { id: string; name: string; phone: string; total_billed: number; total_paid: number; outstanding_balance: number }[] = []
  let tpRows:     { id: string; name: string; phone: string; trade_partner_name: string; total_billed: number; total_paid: number; outstanding_balance: number }[] = []

  if (activeTab === 'direct') {
    let query = supabase
      .from('direct_customer_balances')
      .select('id, name, phone, total_billed, total_paid, outstanding_balance')
      .order('outstanding_balance', { ascending: false })
    if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    const { data } = await query
    directRows = data ?? []
  } else {
    let query = supabase
      .from('tp_customer_balances')
      .select('id, name, phone, trade_partner_name, total_billed, total_paid, outstanding_balance')
      .order('outstanding_balance', { ascending: false })
    if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    const { data } = await query
    tpRows = data ?? []
  }

  function tabHref(t: TabKey) {
    const p = new URLSearchParams()
    p.set('tab', t)
    if (q) p.set('q', q)
    return `/dashboard/payments?${p.toString()}`
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Payments</h1>
        <Link
          href="/dashboard/payments/new"
          className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Record payment
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="get" action="/dashboard/payments" className="mb-4">
        <input type="hidden" name="tab" value={activeTab} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or phone…"
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </form>

      {/* Table */}
      {activeTab === 'direct' ? (
        <BalanceTable
          rows={directRows.map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            sub: null,
            totalBilled: r.total_billed,
            totalPaid: r.total_paid,
            balance: r.outstanding_balance,
            href: `/dashboard/payments/direct/${r.id}`,
            newHref: `/dashboard/payments/new?customerType=direct&customerId=${r.id}`,
          }))}
          emptyMsg={q ? `No customers matching "${q}"` : 'No direct customers.'}
        />
      ) : (
        <BalanceTable
          rows={tpRows.map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            sub: r.trade_partner_name,
            totalBilled: r.total_billed,
            totalPaid: r.total_paid,
            balance: r.outstanding_balance,
            href: `/dashboard/payments/tp/${r.id}`,
            newHref: `/dashboard/payments/new?customerType=tp_customer&customerId=${r.id}`,
          }))}
          emptyMsg={q ? `No customers matching "${q}"` : 'No TP customers.'}
        />
      )}
    </div>
  )
}

type BalanceRow = {
  id: string
  name: string
  phone: string
  sub: string | null
  totalBilled: number
  totalPaid: number
  balance: number
  href: string
  newHref: string
}

function BalanceTable({ rows, emptyMsg }: { rows: BalanceRow[]; emptyMsg: string }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">{emptyMsg}</p>
  }
  return (
    <>
      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {rows.map((r) => (
          <Link
            key={r.id}
            href={r.href}
            className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4 active:bg-gray-50"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{r.name}</p>
              <p className="text-xs text-gray-400">{r.phone}{r.sub ? ` · ${r.sub}` : ''}</p>
              <p className="mt-1 text-xs text-gray-500">
                Billed {formatPrice(r.totalBilled)} · Paid {formatPrice(r.totalPaid)}
              </p>
            </div>
            <div className="ml-4 shrink-0 text-right">
              <BalanceChip amount={r.balance} />
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Total billed</th>
              <th className="px-4 py-3 text-right">Total paid</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={r.href} className="font-medium text-gray-900 hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-gray-400">{r.phone}{r.sub ? ` · ${r.sub}` : ''}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {formatPrice(r.totalBilled)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {formatPrice(r.totalPaid)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  <BalanceChip amount={r.balance} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={r.newHref} className="text-xs text-blue-600 hover:underline">
                      Record
                    </Link>
                    <Link href={r.href} className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900">
                      Ledger
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function BalanceChip({ amount }: { amount: number }) {
  if (amount === 0) return <span className="text-gray-400">—</span>
  if (amount > 0)
    return (
      <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
        {formatPrice(amount)} due
      </span>
    )
  return (
    <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">
      {formatPrice(Math.abs(amount))} credit
    </span>
  )
}
