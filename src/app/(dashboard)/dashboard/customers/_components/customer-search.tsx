'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useRef, useTransition } from 'react'

interface Props {
  defaultValue: string
  tab: string
}

export function CustomerSearch({ defaultValue, tab }: Props) {
  const router      = useRouter()
  const pathname    = usePathname()
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function handleChange(value: string) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      params.set('tab', tab)
      if (value) params.set('q', value)
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    }, 280)
  }

  return (
    <div className="relative">
      <input
        type="search"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search name or phone…"
        className="w-72 rounded border border-gray-300 px-3 py-1.5 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
      />
      {isPending && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          …
        </span>
      )}
    </div>
  )
}
