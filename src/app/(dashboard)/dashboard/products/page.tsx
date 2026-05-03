import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { formatPrice } from '@/lib/format'
import { ProductSearch } from './_components/product-search'
import { BarcodeScanner } from './_components/barcode-scanner'
import { ToggleActive } from './_components/toggle-active'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Products' }

const LOW_STOCK_THRESHOLD = 10

const VALID_SORT = [
  'name', 'sku', 'barcode', 'category', 'price', 'stock_qty',
] as const
type SortCol = (typeof VALID_SORT)[number]

type SearchParams = Promise<{
  q?: string
  sort?: string
  order?: string
}>

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q = '', sort = 'name', order = 'asc' } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const role       = profile.role as Role
  const canManage  = isAtLeast(role, 'manager')
  const canToggle  = isAtLeast(role, 'admin')

  const sortCol: SortCol = (VALID_SORT as readonly string[]).includes(sort)
    ? (sort as SortCol)
    : 'name'
  const ascending = order !== 'desc'

  let query = supabase.from('products').select('*')
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`,
    )
  }
  const { data } = await query.order(sortCol, { ascending })
  const products = data ?? []

  // Build a sort link URL preserving the current search query
  function sortHref(col: SortCol): string {
    const isActive  = sortCol === col
    const nextOrder = isActive && ascending ? 'desc' : 'asc'
    const p         = new URLSearchParams()
    if (q) p.set('q', q)
    p.set('sort', col)
    p.set('order', nextOrder)
    return `/dashboard/products?${p.toString()}`
  }

  function SortIndicator({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span className="text-gray-300 ml-0.5">↕</span>
    return (
      <span className="ml-0.5 text-gray-700">{ascending ? '↑' : '↓'}</span>
    )
  }

  const colSpan = canManage ? 8 : 7

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Products</h1>
        {canManage && (
          <Link
            href="/dashboard/products/new"
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add product
          </Link>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <ProductSearch defaultValue={q} />
        <BarcodeScanner />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">
                <Link href={sortHref('name')} className="flex items-center hover:text-gray-900">
                  Name <SortIndicator col="name" />
                </Link>
              </th>
              <th className="px-4 py-3">
                <Link href={sortHref('sku')} className="flex items-center hover:text-gray-900">
                  SKU <SortIndicator col="sku" />
                </Link>
              </th>
              <th className="px-4 py-3">
                <Link href={sortHref('barcode')} className="flex items-center hover:text-gray-900">
                  Barcode <SortIndicator col="barcode" />
                </Link>
              </th>
              <th className="px-4 py-3">
                <Link href={sortHref('category')} className="flex items-center hover:text-gray-900">
                  Category <SortIndicator col="category" />
                </Link>
              </th>
              <th className="px-4 py-3 text-right">
                <Link href={sortHref('price')} className="flex items-center justify-end hover:text-gray-900">
                  Price <SortIndicator col="price" />
                </Link>
              </th>
              <th className="px-4 py-3 text-right">
                <Link href={sortHref('stock_qty')} className="flex items-center justify-end hover:text-gray-900">
                  Stock <SortIndicator col="stock_qty" />
                </Link>
              </th>
              <th className="px-4 py-3 text-center">Status</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  {q ? `No products matching "${q}"` : 'No products yet.'}
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.sku ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.barcode ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StockCell qty={p.stock_qty} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleActive
                      productId={p.id}
                      isActive={p.is_active}
                      canToggle={canToggle}
                    />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/products/${p.id}/edit`}
                        className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {products.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          {products.length} product{products.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

function StockCell({ qty }: { qty: number }) {
  if (qty === 0) {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700">
        Out of stock
      </span>
    )
  }
  if (qty <= LOW_STOCK_THRESHOLD) {
    return (
      <span
        className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700"
        title={`Low stock — threshold is ${LOW_STOCK_THRESHOLD}`}
      >
        {qty} low
      </span>
    )
  }
  return <span className="tabular-nums text-gray-900">{qty}</span>
}
