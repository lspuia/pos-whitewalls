'use client'

import { useActionState, useState } from 'react'
import { formatPrice } from '@/lib/format'
import { createReturn } from '../actions'
import type { ReturnFormState } from '../actions'

export type ReturnableItem = {
  memoItemId:   string
  productId:    string
  productName:  string
  productSku:   string | null
  productUnit:  string
  quantity:     number
  lineTotal:    number
  maxReturnable: number
}

interface Props {
  memoId:      string
  memoNumber:  string
  items:       ReturnableItem[]
}

type SelectedItem = {
  quantity: number
  refundAmount: number
}

const INITIAL_STATE: ReturnFormState = null

export function ReturnForm({ memoId, memoNumber, items }: Props) {
  const [state, action, isPending] = useActionState(createReturn, INITIAL_STATE)

  const [selected, setSelected] = useState<Record<string, SelectedItem>>({})

  function toggleItem(item: ReturnableItem, checked: boolean) {
    if (!checked) {
      setSelected((prev) => {
        const next = { ...prev }
        delete next[item.memoItemId]
        return next
      })
      return
    }
    const unitRefund = item.quantity > 0 ? item.lineTotal / item.quantity : 0
    setSelected((prev) => ({
      ...prev,
      [item.memoItemId]: {
        quantity: 1,
        refundAmount: parseFloat((unitRefund * 1).toFixed(2)),
      },
    }))
  }

  function changeQty(item: ReturnableItem, raw: string) {
    const qty = Math.min(Math.max(parseInt(raw, 10) || 1, 1), item.maxReturnable)
    const unitRefund = item.quantity > 0 ? item.lineTotal / item.quantity : 0
    setSelected((prev) => ({
      ...prev,
      [item.memoItemId]: {
        quantity: qty,
        refundAmount: parseFloat((unitRefund * qty).toFixed(2)),
      },
    }))
  }

  const totalRefund = Object.values(selected).reduce((s, v) => s + v.refundAmount, 0)
  const selectedCount = Object.keys(selected).length

  const itemsJson = JSON.stringify(
    Object.entries(selected).map(([memoItemId, sel]) => {
      const item = items.find((i) => i.memoItemId === memoItemId)!
      return {
        memo_item_id:      memoItemId,
        product_id:        item.productId,
        quantity_returned: sel.quantity,
        refund_amount:     sel.refundAmount,
      }
    }),
  )

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <input type="hidden" name="memo_id" value={memoId} />
      <input type="hidden" name="items"   value={itemsJson} />

      {/* Memo reference */}
      <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <span className="text-gray-500">Memo: </span>
        <span className="font-medium text-gray-900">#{memoNumber}</span>
      </div>

      {/* Items */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Select items to return</p>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">
            All items from this memo have already been fully returned.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2 w-8" />
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">Orig. qty</th>
                  <th className="px-3 py-2 text-right">Returnable</th>
                  <th className="px-3 py-2 text-right w-28">Return qty</th>
                  <th className="px-3 py-2 text-right">Refund est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const sel = selected[item.memoItemId]
                  const isChecked = !!sel
                  const unitRefund = item.quantity > 0 ? item.lineTotal / item.quantity : 0

                  return (
                    <tr key={item.memoItemId} className={isChecked ? 'bg-blue-50/40' : ''}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleItem(item, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{item.productName}</div>
                        {item.productSku && (
                          <div className="text-xs text-gray-400 font-mono">{item.productSku}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                        {item.quantity} {item.productUnit}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                        {item.maxReturnable} {item.productUnit}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isChecked ? (
                          <input
                            type="number"
                            min={1}
                            max={item.maxReturnable}
                            value={sel.quantity}
                            onChange={(e) => changeQty(item, e.target.value)}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                          />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                        {isChecked
                          ? formatPrice(unitRefund * sel.quantity)
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reason">
          Reason
        </label>
        <input
          id="reason"
          name="reason"
          type="text"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          placeholder="e.g. Defective product, wrong item…"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {/* Total */}
      {selectedCount > 0 && (
        <div className="rounded border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Estimated refund ({selectedCount} {selectedCount === 1 ? 'item' : 'items'})
          </span>
          <span className="text-base font-semibold text-gray-900">{formatPrice(totalRefund)}</span>
        </div>
      )}

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || selectedCount === 0}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? 'Submitting…' : 'Raise return'}
        </button>
        <a
          href="/dashboard/returns"
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:border-gray-500"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
