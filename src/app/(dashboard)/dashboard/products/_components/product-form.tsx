'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { upsertProduct, type ProductFormState } from '../actions'
import type { Product } from '@/lib/types'

interface Props {
  product?: Product
}

const INITIAL_STATE: ProductFormState = null

export function ProductForm({ product }: Props) {
  const [state, action, pending] = useActionState(upsertProduct, INITIAL_STATE)
  const isEdit = !!product

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {product && <input type="hidden" name="id" value={product.id} />}

      {state?.error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={product?.name}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {/* SKU + Barcode */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
            SKU
          </label>
          <input
            id="sku"
            name="sku"
            type="text"
            defaultValue={product?.sku ?? ''}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
            Barcode
          </label>
          <input
            id="barcode"
            name="barcode"
            type="text"
            defaultValue={product?.barcode ?? ''}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Category + Unit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <input
            id="category"
            name="category"
            type="text"
            defaultValue={product?.category ?? ''}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
            Unit
          </label>
          <input
            id="unit"
            name="unit"
            type="text"
            defaultValue={product?.unit ?? 'pcs'}
            placeholder="pcs"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Price + Stock qty */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price (₹) <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              ₹
            </span>
            <input
              id="price"
              name="price"
              type="number"
              required
              min="0"
              step="0.01"
              defaultValue={product?.price ?? ''}
              className="block w-full rounded border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        </div>
        <div>
          <label htmlFor="stock_qty" className="block text-sm font-medium text-gray-700">
            Stock qty
          </label>
          <input
            id="stock_qty"
            name="stock_qty"
            type="number"
            required
            min="0"
            step="1"
            defaultValue={product?.stock_qty ?? 0}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={product?.description ?? ''}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
        />
      </div>

      {/* is_active — edit only; on create always starts active */}
      {isEdit && (
        <div className="flex items-center gap-3">
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            value="true"
            defaultChecked={product.is_active}
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
        </button>
        <Link
          href="/dashboard/products"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
