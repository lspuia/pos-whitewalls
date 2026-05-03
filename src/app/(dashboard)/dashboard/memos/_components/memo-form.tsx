'use client'

import { useActionState, useState, useRef } from 'react'
import Link from 'next/link'
import { createMemo, updateMemo, type MemoFormState } from '../actions'
import { formatPrice } from '@/lib/format'
import type { Memo, DiscountType } from '@/lib/types'

type Product = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  price: number
  unit: string
}
type DirectCustomer = { id: string; name: string; phone: string }
type TradePartner   = { id: string; name: string }
type TpCustomer     = { id: string; name: string; trade_partner_id: string }
type InitialItem    = {
  product_id: string
  quantity: number
  unit_price: number
  discount_value: number
  discount_type: DiscountType
  product: { name: string; sku: string | null; unit: string }
}
type LineItem = {
  tempId: string
  product_id: string
  product_name: string
  sku: string | null
  unit: string
  quantity: number
  unit_price: number
  discount_value: number
  discount_type: DiscountType
}

interface Props {
  memo?: Memo
  initialItems?: InitialItem[]
  products: Product[]
  directCustomers: DirectCustomer[]
  tradePartners: TradePartner[]
  tpCustomers: TpCustomer[]
}

const INITIAL_STATE: MemoFormState = null

export function MemoForm({
  memo,
  initialItems,
  products,
  directCustomers,
  tradePartners,
  tpCustomers,
}: Props) {
  const isEdit = !!memo
  const [state, formAction, pending] = useActionState(
    isEdit ? updateMemo : createMemo,
    INITIAL_STATE,
  )

  const [memoType, setMemoType] = useState<'sales' | 'delivery'>(memo?.memo_type ?? 'sales')
  const [customerType, setCustomerType] = useState<'direct' | 'tp_customer'>(
    memo?.customer_type ?? 'direct',
  )
  const [directCustomerId, setDirectCustomerId] = useState(memo?.direct_customer_id ?? '')
  const [tradePartnerId, setTradePartnerId] = useState(() => {
    if (memo?.tp_customer_id) {
      return tpCustomers.find((c) => c.id === memo.tp_customer_id)?.trade_partner_id ?? ''
    }
    return ''
  })
  const [tpCustomerId, setTpCustomerId] = useState(memo?.tp_customer_id ?? '')
  const [lineItems, setLineItems] = useState<LineItem[]>(() =>
    (initialItems ?? []).map((item, idx) => ({
      tempId: `existing-${idx}`,
      product_id: item.product_id,
      product_name: item.product?.name ?? 'Unknown',
      sku: item.product?.sku ?? null,
      unit: item.product?.unit ?? 'pcs',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_value: item.discount_value,
      discount_type: item.discount_type,
    })),
  )
  const [memoDiscountValue, setMemoDiscountValue] = useState(memo?.memo_discount_value ?? 0)
  const [memoDiscountType, setMemoDiscountType] = useState<DiscountType>(
    memo?.memo_discount_type ?? 'flat',
  )
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const productInputRef = useRef<HTMLInputElement | null>(null)
  const nextTempId = useRef(0)

  // ── Computed totals ────────────────────────────────────────────────────────

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const lineDiscountTotal = lineItems.reduce((s, i) => {
    const gross = i.quantity * i.unit_price
    return s + (i.discount_type === 'flat' ? Math.min(i.discount_value, gross) : (gross * i.discount_value) / 100)
  }, 0)
  const afterLine = subtotal - lineDiscountTotal
  const memoDiscountActual =
    memoDiscountType === 'flat'
      ? Math.min(memoDiscountValue, afterLine)
      : (afterLine * memoDiscountValue) / 100
  const totalAmount = Math.max(0, afterLine - memoDiscountActual)

  // ── Product picker ─────────────────────────────────────────────────────────

  const filteredProducts = productSearch.trim()
    ? products
        .filter((p) => {
          const q = productSearch.toLowerCase()
          return (
            p.name.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q)
          )
        })
        .slice(0, 10)
    : []

  function addProduct(p: Product) {
    const existingIdx = lineItems.findIndex((i) => i.product_id === p.id)
    if (existingIdx >= 0) {
      setLineItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      )
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          tempId: `new-${nextTempId.current++}`,
          product_id: p.id,
          product_name: p.name,
          sku: p.sku,
          unit: p.unit,
          quantity: 1,
          unit_price: p.price,
          discount_value: 0,
          discount_type: 'flat',
        },
      ])
    }
    setProductSearch('')
    setShowDropdown(false)
    productInputRef.current?.focus()
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const exact = products.find(
        (p) => p.barcode?.toLowerCase() === productSearch.toLowerCase(),
      )
      if (exact) { addProduct(exact); return }
      if (filteredProducts.length === 1) addProduct(filteredProducts[0])
    }
    if (e.key === 'Escape') {
      setShowDropdown(false)
      setProductSearch('')
    }
  }

  function updateItem<K extends keyof LineItem>(tempId: string, field: K, value: LineItem[K]) {
    setLineItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item)),
    )
  }

  // ── Serialised payload for the server action ───────────────────────────────

  const itemsJson = JSON.stringify(
    lineItems.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount_value: i.discount_value,
      discount_type: i.discount_type,
    })),
  )

  return (
    <form action={formAction} className="space-y-8 max-w-4xl">
      {isEdit && <input type="hidden" name="id" value={memo.id} />}
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="memo_discount_value" value={String(memoDiscountValue)} />
      <input type="hidden" name="memo_discount_type" value={memoDiscountType} />

      {state?.error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* ── Memo type ── */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Memo type</p>
        <div className="flex gap-4">
          {(['sales', 'delivery'] as const).map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="memo_type"
                value={t}
                checked={memoType === t}
                onChange={() => setMemoType(t)}
                className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm capitalize text-gray-700">{t}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Customer ── */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Customer</p>
        <div className="flex gap-4">
          {(['direct', 'tp_customer'] as const).map((ct) => (
            <label key={ct} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="customer_type"
                value={ct}
                checked={customerType === ct}
                onChange={() => setCustomerType(ct)}
                className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">
                {ct === 'direct' ? 'Direct customer' : 'TP customer'}
              </span>
            </label>
          ))}
        </div>

        {customerType === 'direct' && (
          <select
            name="direct_customer_id"
            value={directCustomerId}
            onChange={(e) => setDirectCustomerId(e.target.value)}
            required
            className="block w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="">Select customer…</option>
            {directCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
        )}

        {customerType === 'tp_customer' && (
          <div className="grid max-w-2xl grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Trade partner</label>
              <select
                value={tradePartnerId}
                onChange={(e) => {
                  setTradePartnerId(e.target.value)
                  setTpCustomerId('')
                }}
                className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="">Select trade partner…</option>
                {tradePartners.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Customer</label>
              <select
                name="tp_customer_id"
                value={tpCustomerId}
                onChange={(e) => setTpCustomerId(e.target.value)}
                required
                disabled={!tradePartnerId}
                className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-50"
              >
                <option value="">Select customer…</option>
                {tpCustomers
                  .filter((c) => c.trade_partner_id === tradePartnerId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Delivery address ── */}
      {memoType === 'delivery' && (
        <div>
          <label htmlFor="delivery_address" className="block text-sm font-medium text-gray-700">
            Delivery address <span className="text-red-500">*</span>
          </label>
          <input
            id="delivery_address"
            name="delivery_address"
            type="text"
            required
            defaultValue={memo?.delivery_address ?? ''}
            className="mt-1 block w-full max-w-xl rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      )}

      {/* ── Notes ── */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={memo?.notes ?? ''}
          className="mt-1 block w-full max-w-xl rounded border border-gray-300 px-3 py-2 text-sm resize-none focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {/* ── Line items ── */}
      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">Line items</p>

        {/* Product search / barcode */}
        <div className="relative mb-3 max-w-md">
          <input
            ref={productInputRef}
            type="text"
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value)
              setShowDropdown(true)
            }}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => productSearch && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 120)}
            placeholder="Search by name, SKU, or scan barcode…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          {showDropdown && filteredProducts.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow-lg">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => addProduct(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span>
                    <span className="font-medium text-gray-900">{p.name}</span>
                    {p.sku && (
                      <span className="ml-2 font-mono text-xs text-gray-400">{p.sku}</span>
                    )}
                  </span>
                  <span className="tabular-nums text-gray-500">{formatPrice(p.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {lineItems.length === 0 ? (
          <p className="text-sm text-gray-400">No items yet. Search above to add products.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2 w-20 text-center">Qty</th>
                  <th className="px-4 py-2 w-32 text-right">Unit price</th>
                  <th className="px-4 py-2 w-40">Discount</th>
                  <th className="px-4 py-2 w-32 text-right">Line total</th>
                  <th className="px-4 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item) => {
                  const gross = item.quantity * item.unit_price
                  const disc =
                    item.discount_type === 'flat'
                      ? Math.min(item.discount_value, gross)
                      : (gross * item.discount_value) / 100
                  return (
                    <tr key={item.tempId} className="align-middle">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        {item.sku && (
                          <div className="font-mono text-xs text-gray-400">{item.sku}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.tempId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="relative inline-block w-28">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItem(item.tempId, 'unit_price', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-gray-300 pl-5 pr-2 py-1 text-right text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount_value}
                            onChange={(e) =>
                              updateItem(item.tempId, 'discount_value', parseFloat(e.target.value) || 0)
                            }
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                          />
                          <select
                            value={item.discount_type}
                            onChange={(e) =>
                              updateItem(item.tempId, 'discount_type', e.target.value as DiscountType)
                            }
                            className="rounded border border-gray-300 px-1 py-1 text-xs focus:border-gray-900 focus:outline-none"
                          >
                            <option value="flat">₹</option>
                            <option value="percent">%</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-gray-900">
                        {formatPrice(gross - disc)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setLineItems((prev) => prev.filter((i) => i.tempId !== item.tempId))
                          }
                          className="text-lg leading-none text-gray-300 hover:text-red-500"
                          title="Remove"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Memo discount ── */}
      {lineItems.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Memo discount</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={memoDiscountValue}
              onChange={(e) => setMemoDiscountValue(parseFloat(e.target.value) || 0)}
              className="w-28 rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <select
              value={memoDiscountType}
              onChange={(e) => setMemoDiscountType(e.target.value as DiscountType)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="flat">₹ flat</option>
              <option value="percent">% of sub-total after item discounts</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Totals ── */}
      {lineItems.length > 0 && (
        <div className="flex justify-end">
          <div className="w-72 rounded border border-gray-200 bg-gray-50 p-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              {lineDiscountTotal > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Item discounts</span>
                  <span className="tabular-nums text-red-600">−{formatPrice(lineDiscountTotal)}</span>
                </div>
              )}
              {memoDiscountActual > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Memo discount</span>
                  <span className="tabular-nums text-red-600">
                    −{formatPrice(memoDiscountActual)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold text-gray-900">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit ── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending || lineItems.length === 0}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create memo'}
        </button>
        <Link
          href={isEdit ? `/dashboard/memos/${memo.id}` : '/dashboard/memos'}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
