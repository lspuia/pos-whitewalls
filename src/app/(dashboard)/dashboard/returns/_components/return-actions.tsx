'use client'

import { useActionState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { isAtLeast } from '@/lib/roles'
import {
  approveReturn,
  rejectReturn,
  createRefund,
  processRefund,
} from '../actions'
import type { ReturnFormState } from '../actions'
import type { Role, RefundMethod, ReturnStatus, RefundStatus } from '@/lib/types'
import { formatPrice } from '@/lib/format'

const REFUND_METHODS: { value: RefundMethod; label: string }[] = [
  { value: 'cash',          label: 'Cash'          },
  { value: 'upi',           label: 'UPI'           },
  { value: 'card',          label: 'Card'          },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque',        label: 'Cheque'        },
  { value: 'other',         label: 'Other'         },
]

interface Props {
  returnId:     string
  returnStatus: ReturnStatus
  role:         Role
  totalAmount:  number
  refund: {
    id:          string
    refund_number: string
    amount:      number
    refund_method: string
    status:      RefundStatus
  } | null
}

const INITIAL_STATE: ReturnFormState = null

export function ReturnActions({ returnId, returnStatus, role, totalAmount, refund }: Props) {
  const [isPending, startTransition] = useTransition()
  const [refundState, refundAction, refundPending] = useActionState(createRefund, INITIAL_STATE)

  const canApproveReject = returnStatus === 'pending' && isAtLeast(role, 'admin')
  const canCreateRefund  = returnStatus === 'approved' && !refund && isAtLeast(role, 'admin')
  const canProcess       = refund?.status === 'pending' && isAtLeast(role, 'admin')

  function run(action: () => Promise<{ error: string } | void>) {
    startTransition(async () => {
      const result = await action()
      if (result?.error) toast.error(result.error)
    })
  }

  if (!canApproveReject && !canCreateRefund && !canProcess && !refund) return null

  return (
    <div className="space-y-4">
      {/* Approve / Reject */}
      {canApproveReject && (
        <div className="flex gap-2">
          <button
            onClick={() => run(() => approveReturn(returnId))}
            disabled={isPending}
            className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => {
              if (!confirm('Reject this return?')) return
              run(() => rejectReturn(returnId))
            }}
            disabled={isPending}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {/* Existing refund info + process button */}
      {refund && (
        <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Refund #{refund.refund_number}</p>
              <p className="text-sm text-gray-500">
                {formatPrice(refund.amount)} ·{' '}
                {refund.refund_method.replace('_', ' ')}
              </p>
            </div>
            <RefundStatusBadge status={refund.status} />
          </div>
          {canProcess && (
            <button
              onClick={() => run(() => processRefund(refund.id, returnId))}
              disabled={isPending}
              className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Mark processed
            </button>
          )}
        </div>
      )}

      {/* Create refund form */}
      {canCreateRefund && (
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-gray-900">Create refund</p>
          <form action={refundAction} className="space-y-3">
            <input type="hidden" name="return_id" value={returnId} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Amount (₹)
                </label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={totalAmount.toFixed(2)}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Refund method
                </label>
                <select
                  name="refund_method"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  {REFUND_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Notes <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                name="notes"
                type="text"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
            {refundState?.error && (
              <p className="text-sm text-red-600">{refundState.error}</p>
            )}
            <button
              type="submit"
              disabled={refundPending}
              className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {refundPending ? 'Saving…' : 'Create refund'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const map: Record<RefundStatus, string> = {
    pending:   'bg-amber-100 text-amber-800',
    processed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  )
}
