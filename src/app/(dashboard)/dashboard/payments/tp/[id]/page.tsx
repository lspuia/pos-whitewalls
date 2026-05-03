import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { buildLedger, LedgerView } from '../../_components/ledger-view'
import type { Role } from '@/lib/types'

type Params = Promise<{ id: string }>

export default async function TpCustomerLedgerPage({ params }: { params: Params }) {
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
  if (!profile) redirect('/login')
  const role = profile.role as Role

  const [{ data: balance }, { data: memos }, { data: payments }, { data: refunds }] = await Promise.all([
    supabase
      .from('tp_customer_balances')
      .select('id, name, phone, trade_partner_name, total_billed, total_paid, outstanding_balance')
      .eq('id', id)
      .single(),
    supabase
      .from('memos')
      .select('id, memo_number, memo_type, status, total_amount, created_at')
      .eq('tp_customer_id', id)
      .in('status', ['confirmed', 'paid', 'delivered'])
      .order('created_at'),
    supabase
      .from('payments')
      .select('id, payment_number, amount, payment_method, reference_number, is_auto, created_at, ref_memo:reference_memo_id(memo_number)')
      .eq('tp_customer_id', id)
      .order('created_at'),
    supabase
      .from('refunds')
      .select('id, refund_number, amount, refund_method, processed_at, ref_return:return_id(return_number)')
      .eq('tp_customer_id', id)
      .eq('status', 'processed')
      .order('processed_at'),
  ])

  if (!balance) notFound()

  return (
    <LedgerView
      customerName={balance.name}
      customerPhone={balance.phone}
      customerSub={balance.trade_partner_name}
      totalBilled={balance.total_billed}
      totalPaid={balance.total_paid}
      outstandingBalance={balance.outstanding_balance}
      ledger={buildLedger(memos ?? [], payments ?? [], refunds ?? [])}
      canEdit={isAtLeast(role, 'admin')}
      backHref="/dashboard/payments?tab=tp"
      newPaymentHref={`/dashboard/payments/new?customerType=tp_customer&customerId=${id}`}
      editPaymentHref={(pid) => `/dashboard/payments/${pid}/edit`}
    />
  )
}
