'use client'

import { useTransition } from 'react'
import toast from 'react-hot-toast'

interface Props {
  id: string
  isActive: boolean
  canToggle: boolean
  toggle: (id: string, value: boolean) => Promise<{ error: string } | void>
}

export function ToggleActive({ id, isActive, canToggle, toggle }: Props) {
  const [isPending, startTransition] = useTransition()

  const label      = isActive ? 'Active' : 'Inactive'
  const base       = 'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium'
  const colorClass = isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'

  if (!canToggle) {
    return <span className={`${base} ${colorClass}`}>{label}</span>
  }

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await toggle(id, !isActive)
          if (result?.error) toast.error(result.error)
        })
      }
      disabled={isPending}
      title={isActive ? 'Click to deactivate' : 'Click to activate'}
      className={`${base} ${colorClass} cursor-pointer hover:opacity-75 disabled:opacity-50`}
    >
      {isPending ? '…' : label}
    </button>
  )
}
