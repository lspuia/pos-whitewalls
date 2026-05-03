import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CustomerSearch } from './customer-search'
import { ToggleActive } from './toggle-active'
import { toggleTradePartnerActive } from '../actions'

interface Props {
  q: string
  canManage: boolean
  canToggle: boolean
}

export async function TradePartnersList({ q, canManage, canToggle }: Props) {
  const supabase = await createClient()

  let query = supabase.from('trade_partners').select('*').order('name')
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`)

  const { data } = await query
  const partners = data ?? []

  const colSpan = canManage ? 6 : 5

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <CustomerSearch defaultValue={q} tab="trade-partners" />
        {canManage && (
          <Link
            href="/dashboard/customers/trade-partners/new"
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add trade partner
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">GSTIN</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3 text-center">Status</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {partners.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-gray-400">
                  {q ? `No trade partners matching "${q}"` : 'No trade partners yet.'}
                </td>
              </tr>
            ) : (
              partners.map((tp) => (
                <tr key={tp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{tp.name}</td>
                  <td className="px-4 py-3 text-gray-500">{tp.phone}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {tp.gstin ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{tp.address ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <ToggleActive
                      id={tp.id}
                      isActive={tp.is_active}
                      canToggle={canToggle}
                      toggle={toggleTradePartnerActive}
                    />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/customers/trade-partners/${tp.id}/edit`}
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

      {partners.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          {partners.length} trade partner{partners.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
