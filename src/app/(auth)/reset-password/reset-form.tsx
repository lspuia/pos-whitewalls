'use client'

import { useActionState } from 'react'
import { resetPassword, type ResetPasswordState } from './actions'

const INITIAL_STATE: ResetPasswordState = null

export function ResetForm() {
  const [state, formAction, pending] = useActionState(resetPassword, INITIAL_STATE)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Set password'}
      </button>
    </form>
  )
}
