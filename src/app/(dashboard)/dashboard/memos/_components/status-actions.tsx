'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { isAtLeast } from '@/lib/roles'
import {
  confirmMemo,
  markPaid,
  markDelivered,
  cancelMemo,
  deleteMemo,
} from '../actions'
import type { Role, MemoType, MemoStatus, PaymentMethod } from '@/lib/types'

interface Props {
  memo: { id: string; memo_type: MemoType; status: MemoStatus }
  role: Role
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',          label: 'Cash'          },
  { value: 'upi',           label: 'UPI'           },
  { value: 'card',          label: 'Card'          },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque',        label: 'Cheque'        },
  { value: 'other',         label: 'Other'         },
]

export function StatusActions({ memo, role }: Props) {
  const [isPending, startTransition] = useTransition()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')

  const { id, memo_type, status } = memo

  const canEdit =
    status === 'draft' || (status === 'confirmed' && isAtLeast(role, 'admin'))
  const canConfirm       = status === 'draft'
  const canMarkPaid      = status === 'confirmed' && memo_type === 'sales'
  const canMarkDelivered = status === 'confirmed' && memo_type === 'delivery' && isAtLeast(role, 'manager')
  const canCancel        = !['paid', 'delivered', 'cancelled'].includes(status) && isAtLeast(role, 'manager')
  const canDelete        = role === 'super_admin'

  function run(action: () => Promise<{ error: string } | void>) {
    startTransition(async () => {
      const result = await action()
      if (result?.error) toast.error(result.error)
    })
  }

  if (!canEdit && !canConfirm && !canMarkPaid && !canMarkDelivered && !canCancel && !canDelete) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <Link
          href={`/dashboard/memos/${id}/edit`}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-gray-500"
        >
          Edit
        </Link>
      )}

      {canConfirm && (
        <button
          onClick={() => run(() => confirmMemo(id))}
          disabled={isPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Confirm
        </button>
      )}

      {canMarkPaid && (
        <div className="flex items-center gap-1">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            disabled={isPending}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => run(() => markPaid(id, paymentMethod))}
            disabled={isPending}
            className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Mark paid
          </button>
        </div>
      )}

      {canMarkDelivered && (
        <button
          onClick={() => run(() => markDelivered(id))}
          disabled={isPending}
          className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Mark delivered
        </button>
      )}

      {canCancel && (
        <button
          onClick={() => {
            if (!confirm('Cancel this memo?')) return
            run(() => cancelMemo(id))
          }}
          disabled={isPending}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
        >
          Cancel
        </button>
      )}

      {canDelete && (
        <button
          onClick={() => {
            if (!confirm('Permanently delete this memo? This cannot be undone.')) return
            run(() => deleteMemo(id))
          }}
          disabled={isPending}
          className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      )}
    </div>
  )
}
