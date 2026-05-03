import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { TradePartnerForm } from '../../../_components/trade-partner-form'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Edit trade partner' }

type Params = Promise<{ id: string }>

export default async function EditTradePartnerPage({ params }: { params: Params }) {
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

  if (!profile || !isAtLeast(profile.role as Role, 'manager')) {
    redirect('/dashboard/customers?tab=trade-partners')
  }

  const { data: partner } = await supabase
    .from('trade_partners')
    .select('*')
    .eq('id', id)
    .single()

  if (!partner) notFound()

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/customers?tab=trade-partners"
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← Trade Partners
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Edit {partner.name}</h1>
      </div>
      <TradePartnerForm partner={partner} />
    </div>
  )
}
