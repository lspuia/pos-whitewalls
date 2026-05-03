'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { upsertDirectCustomer, type CustomerFormState } from '../actions'
import type { DirectCustomer } from '@/lib/types'

interface Props {
  customer?: DirectCustomer
}

const INITIAL_STATE: CustomerFormState = null

export function DirectCustomerForm({ customer }: Props) {
  const [state, action, pending] = useActionState(upsertDirectCustomer, INITIAL_STATE)
  const isEdit = !!customer

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {customer && <input type="hidden" name="id" value={customer.id} />}

      {state?.error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={customer?.name}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="text"
          required
          defaultValue={customer?.phone}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={customer?.address ?? ''}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={customer?.notes ?? ''}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
        />
      </div>

      {isEdit && (
        <div className="flex items-center gap-3">
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            value="true"
            defaultChecked={customer.is_active}
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}
        </button>
        <Link
          href="/dashboard/customers?tab=direct"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
