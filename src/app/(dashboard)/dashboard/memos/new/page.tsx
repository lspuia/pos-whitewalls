import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MemoForm } from '../_components/memo-form'

export const metadata = { title: 'New memo' }

export default async function NewMemoPage() {
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

  const [
    { data: products },
    { data: directCustomers },
    { data: tradePartners },
    { data: tpCustomers },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, sku, barcode, price, unit')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('direct_customers')
      .select('id, name, phone')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('trade_partners')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('tp_customers')
      .select('id, name, trade_partner_id')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link href="/dashboard/memos" className="text-xs text-gray-500 hover:text-gray-900">
          ← Memos
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">New memo</h1>
      </div>
      <MemoForm
        products={products ?? []}
        directCustomers={directCustomers ?? []}
        tradePartners={tradePartners ?? []}
        tpCustomers={tpCustomers ?? []}
      />
    </div>
  )
}
