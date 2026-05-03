import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAtLeast } from '@/lib/roles'
import { ProductForm } from '../../_components/product-form'
import type { Role } from '@/lib/types'

export const metadata = { title: 'Edit product' }

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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

  if (!profile || !isAtLeast(profile.role as Role, 'manager')) {
    redirect('/forbidden')
  }

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) notFound()

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/products"
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← Products
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">
          Edit product
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">{product.name}</p>
      </div>
      <ProductForm product={product} />
    </div>
  )
}
