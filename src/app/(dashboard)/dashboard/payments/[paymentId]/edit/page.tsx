import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { PaymentForm } from '../../_components/payment-form'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Edit payment' }

type Params = Promise<{ paymentId: string }>

export default async function EditPaymentPage({ params }: { params: Params }) {
  const { paymentId } = await params
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

  if (!isAtLeast(role, 'admin')) redirect('/dashboard/payments')

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()
  if (!payment) notFound()

  // Fetch customer name for display
  let customerName = '—'
  if (payment.customer_type === 'direct' && payment.direct_customer_id) {
    const { data } = await supabase
      .from('direct_customers')
      .select('name')
      .eq('id', payment.direct_customer_id)
      .single()
    customerName = data?.name ?? '—'
  } else if (payment.customer_type === 'tp_customer' && payment.tp_customer_id) {
    const { data } = await supabase
      .from('tp_customers')
      .select('name')
      .eq('id', payment.tp_customer_id)
      .single()
    customerName = data?.name ?? '—'
  }

  // Fetch this customer's memos for the reference dropdown
  const customerId =
    payment.customer_type === 'direct'
      ? payment.direct_customer_id
      : payment.tp_customer_id
  const customerField =
    payment.customer_type === 'direct' ? 'direct_customer_id' : 'tp_customer_id'

  const { data: memos } = await supabase
    .from('memos')
    .select('id, memo_number, customer_type, direct_customer_id, tp_customer_id, total_amount')
    .eq(customerField, customerId!)
    .not('status', 'in', '("draft","cancelled")')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/payments"
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← Payments
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Edit payment</h1>
        {payment.is_auto && (
          <p className="mt-1 text-xs text-amber-600">
            This payment was auto-created by a memo. Edit with care.
          </p>
        )}
      </div>
      <PaymentForm
        mode="edit"
        payment={payment}
        customerName={customerName}
        memos={(memos ?? []) as any}
      />
    </div>
  )
}
