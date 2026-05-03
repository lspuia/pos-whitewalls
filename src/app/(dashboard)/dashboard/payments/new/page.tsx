import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PaymentForm } from '../_components/payment-form'

export const metadata = { title: 'Record payment' }

type SearchParams = Promise<{
  customerType?: string
  customerId?: string
}>

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { customerType, customerId } = await searchParams

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
    { data: directCustomers },
    { data: tradePartners },
    { data: tpCustomers },
    { data: memos },
  ] = await Promise.all([
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
    supabase
      .from('memos')
      .select('id, memo_number, customer_type, direct_customer_id, tp_customer_id, total_amount')
      .not('status', 'in', '("draft","cancelled")')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  // Pre-populate default amount from outstanding balance if customer is pre-selected
  let defaultAmount: number | undefined
  if (customerType === 'direct' && customerId) {
    const { data: bal } = await supabase
      .from('direct_customer_balances')
      .select('outstanding_balance')
      .eq('id', customerId)
      .single()
    if (bal && bal.outstanding_balance > 0) defaultAmount = bal.outstanding_balance
  } else if (customerType === 'tp_customer' && customerId) {
    const { data: bal } = await supabase
      .from('tp_customer_balances')
      .select('outstanding_balance')
      .eq('id', customerId)
      .single()
    if (bal && bal.outstanding_balance > 0) defaultAmount = bal.outstanding_balance
  }

  // For TP pre-selection, find the trade_partner_id
  let defaultTradePartnerId: string | undefined
  if (customerType === 'tp_customer' && customerId) {
    defaultTradePartnerId =
      (tpCustomers ?? []).find((c) => c.id === customerId)?.trade_partner_id
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link href="/dashboard/payments" className="text-xs text-gray-500 hover:text-gray-900">
          ← Payments
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Record payment</h1>
      </div>
      <PaymentForm
        mode="create"
        directCustomers={directCustomers ?? []}
        tradePartners={tradePartners ?? []}
        tpCustomers={tpCustomers ?? []}
        memos={(memos ?? []) as any}
        defaultCustomerType={
          customerType === 'direct' || customerType === 'tp_customer'
            ? customerType
            : undefined
        }
        defaultCustomerId={customerId}
        defaultTradePartnerId={defaultTradePartnerId}
        defaultAmount={defaultAmount}
      />
    </div>
  )
}
