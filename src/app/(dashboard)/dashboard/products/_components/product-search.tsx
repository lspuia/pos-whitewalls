'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useRef, useTransition } from 'react'

export function ProductSearch({ defaultValue }: { defaultValue: string }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function handleChange(value: string) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      value ? params.set('q', value) : params.delete('q')
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
        placeholder="Search name, SKU, barcode…"
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
