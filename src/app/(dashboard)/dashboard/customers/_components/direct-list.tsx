import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import { CustomerSearch } from './customer-search'
import { ToggleActive } from './toggle-active'
import { toggleDirectCustomerActive } from '../actions'

interface Props {
  q: string
  canManage: boolean
  canToggle: boolean
}

export async function DirectList({ q, canManage, canToggle }: Props) {
  const supabase = await createClient()

  let query = supabase.from('direct_customers').select('*').order('name')
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`)

  const [{ data: customers }, { data: balances }] = await Promise.all([
    query,
    supabase.from('direct_customer_balances').select('id, outstanding_balance'),
  ])

  const balanceMap = new Map(
    (balances ?? []).map((b) => [b.id, b.outstanding_balance]),
  )

  const rows = (customers ?? []).map((c) => ({
    ...c,
    outstanding_balance: balanceMap.get(c.id) ?? 0,
  }))

  const colSpan = canManage ? 6 : 5

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <CustomerSearch defaultValue={q} tab="direct" />
        {canManage && (
          <Link
            href="/dashboard/customers/direct/new"
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add customer
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3 text-center">Status</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-gray-400">
                  {q ? `No customers matching "${q}"` : 'No direct customers yet.'}
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{c.address ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <BalanceCell amount={c.outstanding_balance} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleActive
                      id={c.id}
                      isActive={c.is_active}
                      canToggle={canToggle}
                      toggle={toggleDirectCustomerActive}
                    />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/customers/direct/${c.id}/edit`}
                        className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          {rows.length} customer{rows.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

function BalanceCell({ amount }: { amount: number }) {
  if (amount === 0) return <span className="text-gray-400">—</span>
  if (amount > 0) {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 tabular-nums">
        {formatPrice(amount)} due
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 tabular-nums">
      {formatPrice(Math.abs(amount))} credit
    </span>
  )
}
