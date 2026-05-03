'use client'

import { useActionState } from 'react'
import { inviteUser, type SettingsFormState } from '../actions'
import type { Role } from '@/lib/types'

const ROLES: { value: Role; label: string }[] = [
  { value: 'sales_staff', label: 'Sales staff' },
  { value: 'manager',     label: 'Manager'     },
  { value: 'admin',       label: 'Admin'       },
  { value: 'super_admin', label: 'Super admin' },
]

const INITIAL_STATE: SettingsFormState = null

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteUser, INITIAL_STATE)

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      {state?.error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {state.success}
        </div>
      )}

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          placeholder="Jane Smith"
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="jane@example.com"
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue="sales_staff"
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? 'Sending invite…' : 'Send invite'}
      </button>
    </form>
  )
}
