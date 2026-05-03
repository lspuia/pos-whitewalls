import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { DirectList } from './_components/direct-list'
import { TradePartnersList } from './_components/trade-partners-list'
import { TpCustomersList } from './_components/tp-customers-list'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Customers' }

type SearchParams = Promise<{ tab?: string; q?: string }>

const TABS = [
  { key: 'direct',        label: 'Direct Customers' },
  { key: 'trade-partners', label: 'Trade Partners'  },
  { key: 'tp-customers',  label: 'TP Customers'     },
] as const

type TabKey = (typeof TABS)[number]['key']

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { tab = 'direct', q = '' } = await searchParams

  const activeTab: TabKey = TABS.some((t) => t.key === tab)
    ? (tab as TabKey)
    : 'direct'

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

  const role      = profile.role as Role
  const canManage = isAtLeast(role, 'manager')
  const canToggle = isAtLeast(role, 'manager')

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Customers</h1>
      </div>

      {/* Tab nav */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => {
          const isActive = t.key === activeTab
          return (
            <Link
              key={t.key}
              href={`/dashboard/customers?tab=${t.key}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
      </div>

      {/* Active tab content */}
      {activeTab === 'direct' && (
        <DirectList q={q} canManage={canManage} canToggle={canToggle} />
      )}
      {activeTab === 'trade-partners' && (
        <TradePartnersList q={q} canManage={canManage} canToggle={canToggle} />
      )}
      {activeTab === 'tp-customers' && (
        <TpCustomersList q={q} canManage={canManage} canToggle={canToggle} />
      )}
    </div>
  )
}
