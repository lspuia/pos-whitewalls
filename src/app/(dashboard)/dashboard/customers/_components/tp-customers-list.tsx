import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CustomerSearch } from './customer-search'
import { ToggleActive } from './toggle-active'
import { toggleTpCustomerActive } from '../actions'
import type { TradePartner, TpCustomer } from '@/lib/types'

interface Props {
  q: string
  canManage: boolean
  canToggle: boolean
}

export async function TpCustomersList({ q, canManage, canToggle }: Props) {
  const supabase = await createClient()

  let query = supabase.from('tp_customers').select('*').order('name')
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`)

  const [{ data: customers }, { data: partners }] = await Promise.all([
    query,
    supabase.from('trade_partners').select('id, name').order('name'),
  ])

  const partnerMap = new Map<string, TradePartner['name']>(
    (partners ?? []).map((tp) => [tp.id, tp.name]),
  )

  // Group customers by trade_partner_id
  const grouped = new Map<string, TpCustomer[]>()
  for (const c of customers ?? []) {
    const list = grouped.get(c.trade_partner_id) ?? []
    list.push(c)
    grouped.set(c.trade_partner_id, list)
  }

  // Sort groups by trade partner name
  const sortedGroups = [...grouped.entries()].sort(([a], [b]) => {
    const nameA = partnerMap.get(a) ?? ''
    const nameB = partnerMap.get(b) ?? ''
    return nameA.localeCompare(nameB)
  })

  const totalCustomers = customers?.length ?? 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <CustomerSearch defaultValue={q} tab="tp-customers" />
        {canManage && (
          <Link
            href="/dashboard/customers/tp-customers/new"
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add TP customer
          </Link>
        )}
      </div>

      {totalCustomers === 0 ? (
        <div className="rounded border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
          {q ? `No TP customers matching "${q}"` : 'No TP customers yet.'}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([partnerId, tpCustomers]) => (
            <div key={partnerId}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {partnerMap.get(partnerId) ?? 'Unknown trade partner'}
              </h3>
              <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Address</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {canManage && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tpCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                        <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                        <td className="px-4 py-3 text-gray-500">{c.address ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <ToggleActive
                            id={c.id}
                            isActive={c.is_active}
                            canToggle={canToggle}
                            toggle={toggleTpCustomerActive}
                          />
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/dashboard/customers/tp-customers/${c.id}/edit`}
                              className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900"
                            >
                              Edit
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalCustomers > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          {totalCustomers} TP customer{totalCustomers !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
