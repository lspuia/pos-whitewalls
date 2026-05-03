import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMemoPdf } from '@/lib/pdf/generate-memo-pdf'
import { resolveMemoData } from '@/lib/pdf/resolve-memo-data'
import type { Memo } from '@/lib/types'

type Params = Promise<{ id: string }>

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: memo } = await supabase.from('memos').select('*').eq('id', id).single()
  if (!memo) return new Response('Not found', { status: 404 })

  const typedMemo = memo as Memo
  if (!['confirmed', 'paid', 'delivered'].includes(typedMemo.status)) {
    return new Response('PDF not available for this memo status', { status: 400 })
  }

  const pdfData = await resolveMemoData(supabase, typedMemo)
  const pdfBytes = generateMemoPdf(pdfData)

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="memo-${typedMemo.memo_number}.pdf"`,
      'Cache-Control':       'private, no-cache',
    },
  })
}
