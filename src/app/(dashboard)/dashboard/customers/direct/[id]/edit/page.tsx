import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { DirectCustomerForm } from '../../../_components/direct-customer-form'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Edit direct customer' }

type Params = Promise<{ id: string }>

export default async function EditDirectCustomerPage({ params }: { params: Params }) {
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
    redirect('/dashboard/customers?tab=direct')
  }

  const { data: customer } = await supabase
    .from('direct_customers')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/customers?tab=direct"
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← Direct Customers
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Edit {customer.name}</h1>
      </div>
      <DirectCustomerForm customer={customer} />
    </div>
  )
}
