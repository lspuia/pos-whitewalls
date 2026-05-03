'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { createPayment, updatePayment, type PaymentFormState } from '../actions'
import { formatPrice } from '@/lib/format'
import type { Payment, PaymentMethod } from '@/lib/types'

type DirectCustomer = { id: string; name: string; phone: string }
type TradePartner   = { id: string; name: string }
type TpCustomer     = { id: string; name: string; trade_partner_id: string }
type MemoOption     = {
  id: string
  memo_number: string
  customer_type: string
  direct_customer_id: string | null
  tp_customer_id: string | null
  total_amount: number
}

interface CreateProps {
  mode: 'create'
  directCustomers: DirectCustomer[]
  tradePartners: TradePartner[]
  tpCustomers: TpCustomer[]
  memos: MemoOption[]
  defaultCustomerType?: 'direct' | 'tp_customer'
  defaultCustomerId?: string
  defaultTradePartnerId?: string
  defaultAmount?: number
}

interface EditProps {
  mode: 'edit'
  payment: Payment
  customerName: string
  memos: MemoOption[]
}

type Props = CreateProps | EditProps

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',          label: 'Cash'          },
  { value: 'upi',           label: 'UPI'           },
  { value: 'card',          label: 'Card'          },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque',        label: 'Cheque'        },
  { value: 'other',         label: 'Other'         },
]

const INITIAL_STATE: PaymentFormState = null

export function PaymentForm(props: Props) {
  const isEdit = props.mode === 'edit'

  const [state, formAction, pending] = useActionState(
    isEdit ? updatePayment : createPayment,
    INITIAL_STATE,
  )

  // ── Customer state (create only) ───────────────────────────────────────────
  const [customerType, setCustomerType] = useState<'direct' | 'tp_customer'>(
    isEdit
      ? props.payment.customer_type
      : props.defaultCustomerType ?? 'direct',
  )
  const [directCustomerId, setDirectCustomerId] = useState(
    isEdit
      ? (props.payment.direct_customer_id ?? '')
      : (props.defaultCustomerId && (!props.defaultCustomerType || props.defaultCustomerType === 'direct')
          ? props.defaultCustomerId
          : ''),
  )
  const [tradePartnerId, setTradePartnerId] = useState(
    isEdit ? '' : (props as CreateProps).defaultTradePartnerId ?? '',
  )
  const [tpCustomerId, setTpCustomerId] = useState(
    isEdit
      ? (props.payment.tp_customer_id ?? '')
      : (props.defaultCustomerId && props.defaultCustomerType === 'tp_customer'
          ? props.defaultCustomerId
          : ''),
  )

  // ── Filtered memo options ──────────────────────────────────────────────────
  const activeCid = customerType === 'direct' ? directCustomerId : tpCustomerId
  const filteredMemos = props.memos.filter((m) =>
    customerType === 'direct'
      ? m.direct_customer_id === activeCid
      : m.tp_customer_id === activeCid,
  )

  // ── Redirect target for cancel ─────────────────────────────────────────────
  const cancelHref = isEdit
    ? `/dashboard/payments/${props.payment.customer_type === 'direct' ? 'direct' : 'tp'}/${
        props.payment.direct_customer_id ?? props.payment.tp_customer_id
      }`
    : '/dashboard/payments'

  // ── Derive customer name (create) ──────────────────────────────────────────
  const tp = isEdit ? null : (props as CreateProps)
  const filteredTpCustomers = tp
    ? tp.tpCustomers.filter((c) => c.trade_partner_id === tradePartnerId)
    : []

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      {isEdit && <input type="hidden" name="id" value={props.payment.id} />}

      {state?.error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* ── Customer (create) ── */}
      {!isEdit && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Customer</p>
          <div className="flex gap-4">
            {(['direct', 'tp_customer'] as const).map((ct) => (
              <label key={ct} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="customer_type"
                  value={ct}
                  checked={customerType === ct}
                  onChange={() => {
                    setCustomerType(ct)
                    setDirectCustomerId('')
                    setTradePartnerId('')
                    setTpCustomerId('')
                  }}
                  className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">
                  {ct === 'direct' ? 'Direct customer' : 'TP customer'}
                </span>
              </label>
            ))}
          </div>

          {customerType === 'direct' && (
            <select
              name="direct_customer_id"
              value={directCustomerId}
              onChange={(e) => setDirectCustomerId(e.target.value)}
              required
              className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="">Select customer…</option>
              {(props as CreateProps).directCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>
          )}

          {customerType === 'tp_customer' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Trade partner</label>
                <select
                  value={tradePartnerId}
                  onChange={(e) => {
                    setTradePartnerId(e.target.value)
                    setTpCustomerId('')
                  }}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="">Select…</option>
                  {(props as CreateProps).tradePartners.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Customer</label>
                <select
                  name="tp_customer_id"
                  value={tpCustomerId}
                  onChange={(e) => setTpCustomerId(e.target.value)}
                  required
                  disabled={!tradePartnerId}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-50"
                >
                  <option value="">Select…</option>
                  {filteredTpCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Customer display (edit) ── */}
      {isEdit && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">
            Customer
          </p>
          <p className="text-sm font-medium text-gray-900">{props.customerName}</p>
          <p className="text-xs text-gray-500 capitalize">
            {props.payment.customer_type === 'direct' ? 'Direct customer' : 'TP customer'}
          </p>
        </div>
      )}

      {/* ── Amount ── */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            ₹
          </span>
          <input
            id="amount"
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            defaultValue={
              isEdit
                ? props.payment.amount
                : undefined
            }
            className="block w-full rounded border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* ── Payment method ── */}
      <div>
        <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">
          Payment method <span className="text-red-500">*</span>
        </label>
        <select
          id="payment_method"
          name="payment_method"
          required
          defaultValue={isEdit ? props.payment.payment_method : 'cash'}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Reference memo ── */}
      <div>
        <label htmlFor="reference_memo_id" className="block text-sm font-medium text-gray-700">
          Reference memo
        </label>
        <select
          id="reference_memo_id"
          name="reference_memo_id"
          defaultValue={isEdit ? (props.payment.reference_memo_id ?? '') : ''}
          disabled={!isEdit && !activeCid}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-50"
        >
          <option value="">None</option>
          {(isEdit ? props.memos : filteredMemos).map((m) => (
            <option key={m.id} value={m.id}>
              #{m.memo_number} — {formatPrice(m.total_amount)}
            </option>
          ))}
        </select>
        {!isEdit && !activeCid && (
          <p className="mt-1 text-xs text-gray-400">Select a customer first to link a memo.</p>
        )}
      </div>

      {/* ── Reference number ── */}
      <div>
        <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700">
          Reference number
        </label>
        <input
          id="reference_number"
          name="reference_number"
          type="text"
          defaultValue={isEdit ? (props.payment.reference_number ?? '') : ''}
          placeholder="Cheque no., UTR, etc."
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {/* ── Notes ── */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={isEdit ? (props.payment.notes ?? '') : ''}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {/* ── Submit ── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Record payment'}
        </button>
        <Link href={cancelHref} className="text-sm text-gray-500 hover:text-gray-900">
          Cancel
        </Link>
      </div>
    </form>
  )
}
