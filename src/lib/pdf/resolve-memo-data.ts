import type { SupabaseClient } from '@supabase/supabase-js'
import type { Memo, MemoItem } from '@/lib/types'
import type { Database } from '@/lib/types'
import type { PdfMemoData } from './generate-memo-pdf'

type ItemRow = MemoItem & {
  product: { name: string; sku: string | null; unit: string } | null
}

export async function resolveMemoData(
  supabase: SupabaseClient<Database>,
  memo: Memo,
): Promise<PdfMemoData> {
  const { data: rawItems } = await supabase
    .from('memo_items')
    .select('*, product:product_id(name, sku, unit)')
    .eq('memo_id', memo.id)
    .order('sort_order')
  const items = (rawItems ?? []) as unknown as ItemRow[]

  let customerName  = '—'
  let customerPhone = ''
  let tradePartner  = ''

  if (memo.customer_type === 'direct' && memo.direct_customer_id) {
    const { data } = await supabase
      .from('direct_customers')
      .select('name, phone')
      .eq('id', memo.direct_customer_id)
      .single()
    customerName  = data?.name  ?? '—'
    customerPhone = data?.phone ?? ''
  } else if (memo.customer_type === 'tp_customer' && memo.tp_customer_id) {
    const { data: tc } = await supabase
      .from('tp_customers')
      .select('name, phone, trade_partner_id')
      .eq('id', memo.tp_customer_id)
      .single()
    if (tc) {
      customerName  = tc.name
      customerPhone = tc.phone
      const { data: tp } = await supabase
        .from('trade_partners')
        .select('name')
        .eq('id', tc.trade_partner_id)
        .single()
      tradePartner = tp?.name ?? ''
    }
  }

  return {
    memo_number:         memo.memo_number,
    memo_type:           memo.memo_type,
    status:              memo.status,
    created_at:          memo.created_at,
    delivery_address:    memo.delivery_address,
    payment_method:      memo.payment_method ?? null,
    paid_at:             memo.paid_at,
    delivered_at:        memo.delivered_at,
    notes:               memo.notes,
    subtotal:            memo.subtotal,
    line_discount_total: memo.line_discount_total,
    memo_discount_type:  memo.memo_discount_type,
    memo_discount_value: memo.memo_discount_value,
    tax_amount:          memo.tax_amount,
    total_amount:        memo.total_amount,
    customerName,
    customerPhone,
    tradePartner,
    items: items.map((item) => ({
      productName:    item.product?.name ?? '—',
      productSku:     item.product?.sku  ?? null,
      productUnit:    item.product?.unit ?? '',
      quantity:       item.quantity,
      unit_price:     item.unit_price,
      discount_type:  item.discount_type,
      discount_value: item.discount_value,
      line_total:     item.line_total,
    })),
  }
}
