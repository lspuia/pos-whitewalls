'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import toast from 'react-hot-toast'
import { deletePayment } from '../actions'

interface Props {
  paymentId: string
  editHref: string
}

export function LedgerActions({ paymentId, editHref }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this payment? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deletePayment(paymentId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <Link
        href={editHref}
        className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
      >
        {isPending ? '…' : 'Delete'}
      </button>
    </div>
  )
}
