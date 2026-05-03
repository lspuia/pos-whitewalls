import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { TpCustomerForm } from '../../../_components/tp-customer-form'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Edit TP customer' }

type Params = Promise<{ id: string }>

export default async function EditTpCustomerPage({ params }: { params: Params }) {
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
    redirect('/dashboard/customers?tab=tp-customers')
  }

  const [{ data: customer }, { data: tradePartners }] = await Promise.all([
    supabase.from('tp_customers').select('*').eq('id', id).single(),
    supabase.from('trade_partners').select('id, name').eq('is_active', true).order('name'),
  ])

  if (!customer) notFound()

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/customers?tab=tp-customers"
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← TP Customers
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Edit {customer.name}</h1>
      </div>
      <TpCustomerForm customer={customer} tradePartners={tradePartners ?? []} />
    </div>
  )
}
