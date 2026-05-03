import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { TradePartnerForm } from '../../_components/trade-partner-form'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Add trade partner' }

export default async function NewTradePartnerPage() {
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
    redirect('/dashboard/customers?tab=trade-partners')
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/customers?tab=trade-partners"
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← Trade Partners
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Add trade partner</h1>
      </div>
      <TradePartnerForm />
    </div>
  )
}
