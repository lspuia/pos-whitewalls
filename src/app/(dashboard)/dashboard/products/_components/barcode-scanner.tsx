'use client'

import { useRef, useState, useTransition } from 'react'
import { lookupBarcode } from '../actions'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/lib/types'

type ScanResult = { product: Product | null; code: string }

const LOW_STOCK_THRESHOLD = 10

export function BarcodeScanner() {
  const inputRef                    = useRef<HTMLInputElement>(null)
  const [open, setOpen]             = useState(false)
  const [result, setResult]         = useState<ScanResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    setOpen((prev) => {
      if (!prev) {
        // Focus the input after the panel mounts
        setTimeout(() => inputRef.current?.focus(), 30)
      }
      return !prev
    })
    setResult(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = inputRef.current?.value.trim() ?? ''
    if (!code) return

    // Clear input and keep focus ready for the next scan
    if (inputRef.current) inputRef.current.value = ''

    startTransition(async () => {
      const product = await lookupBarcode(code)
      setResult({ product, code })
      // Re-focus so the next scan is captured immediately
      inputRef.current?.focus()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleToggle}
        className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
          open
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        }`}
      >
        {open ? 'Close scanner' : 'Scan barcode'}
      </button>

      {open && (
        <div className="rounded border border-gray-200 bg-white p-3 shadow-sm w-72">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Focus here and scan…"
              className="flex-1 min-w-0 rounded border border-gray-300 px-2.5 py-1.5 text-sm font-mono focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <button
              type="submit"
              className="rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900"
            >
              Go
            </button>
          </form>

          {isPending && (
            <p className="mt-2 text-xs text-gray-400">Looking up…</p>
          )}

          {result && !isPending && (
            <div className="mt-3">
              {result.product ? (
                <div className="rounded border border-gray-200 p-3 text-sm space-y-1">
                  <p className="font-medium text-gray-900">{result.product.name}</p>
                  <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                    {result.product.sku && <span>SKU: {result.product.sku}</span>}
                    <span>Barcode: {result.code}</span>
                    {result.product.category && <span>{result.product.category}</span>}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-gray-900">
                      {formatPrice(result.product.price)}
                    </span>
                    <StockNote qty={result.product.stock_qty} />
                  </div>
                  {!result.product.is_active && (
                    <p className="text-xs text-red-500 font-medium">Inactive product</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No product found for{' '}
                  <span className="font-mono font-medium text-gray-700">
                    {result.code}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StockNote({ qty }: { qty: number }) {
  if (qty === 0) {
    return <span className="text-xs font-medium text-red-600">Out of stock</span>
  }
  if (qty <= LOW_STOCK_THRESHOLD) {
    return <span className="text-xs font-medium text-amber-600">{qty} in stock (low)</span>
  }
  return <span className="text-xs text-gray-500">{qty} in stock</span>
}
