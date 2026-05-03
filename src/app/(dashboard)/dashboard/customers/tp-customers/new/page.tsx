import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { TpCustomerForm } from '../../_components/tp-customer-form'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Add TP customer' }

export default async function NewTpCustomerPage() {
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

  if (!profile || !isAtLeast(profile.role as Role, 'manager')) {
    redirect('/dashboard/customers?tab=tp-customers')
  }

  const { data: tradePartners } = await supabase
    .from('trade_partners')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/customers?tab=tp-customers"
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← TP Customers
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Add TP customer</h1>
      </div>
      <TpCustomerForm tradePartners={tradePartners ?? []} />
    </div>
  )
}
