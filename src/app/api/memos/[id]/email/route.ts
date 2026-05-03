import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMemoPdf } from '@/lib/pdf/generate-memo-pdf'
import { resolveMemoData } from '@/lib/pdf/resolve-memo-data'
import type { Memo } from '@/lib/types'

type Params = Promise<{ id: string }>

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email'

const STORE_NAME  = 'White Walls Interior Design Studio'
const STORE_EMAIL = process.env.BREVO_SENDER_EMAIL ?? 'noreply@whitewalls.in'

function buildHtml(data: {
  recipientName: string
  memoNumber:    string
  memoType:      string
  status:        string
  date:          string
  total:         string
  customerName:  string
  itemRows:      { name: string; qty: string; total: string }[]
}) {
  const itemRowsHtml = data.itemRows
    .map(
      (r) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${r.name}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:center;">${r.qty}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">${r.total}</td>
        </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#111111;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">${STORE_NAME}</p>
            <p style="margin:4px 0 0;color:#999999;font-size:13px;">Aizawl, Mizoram, India</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#333333;font-size:15px;">Hi ${data.recipientName},</p>
            <p style="margin:0 0 24px;color:#555555;font-size:14px;">
              Please find your memo details below. The PDF is attached to this email.
            </p>

            <!-- Memo meta -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr>
                <td style="padding:4px 0;">
                  <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Memo #</span><br>
                  <span style="color:#111;font-size:15px;font-weight:bold;">${data.memoNumber}</span>
                </td>
                <td style="padding:4px 0;text-align:right;">
                  <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Status</span><br>
                  <span style="color:#16a34a;font-size:15px;font-weight:bold;">${data.status}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;">
                  <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Type</span><br>
                  <span style="color:#333;font-size:14px;">${data.memoType}</span>
                </td>
                <td style="padding:4px 0;text-align:right;">
                  <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Date</span><br>
                  <span style="color:#333;font-size:14px;">${data.date}</span>
                </td>
              </tr>
            </table>

            <!-- Items summary -->
            <p style="margin:0 0 8px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Items</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;overflow:hidden;margin-bottom:16px;">
              <thead>
                <tr style="background:#f5f5f5;">
                  <th style="padding:8px;text-align:left;font-size:12px;color:#888;font-weight:normal;">Product</th>
                  <th style="padding:8px;text-align:center;font-size:12px;color:#888;font-weight:normal;">Qty</th>
                  <th style="padding:8px;text-align:right;font-size:12px;color:#888;font-weight:normal;">Total</th>
                </tr>
              </thead>
              <tbody>${itemRowsHtml}</tbody>
            </table>

            <!-- Grand total -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:16px;font-weight:bold;color:#111;">Total</td>
                <td style="text-align:right;font-size:20px;font-weight:bold;color:#111;">${data.total}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:12px;text-align:center;">
              ${STORE_NAME} · Aizawl, Mizoram, India
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse body
  let recipientEmail: string
  let recipientName:  string
  try {
    const body   = await request.json()
    recipientEmail = (body.recipientEmail as string)?.trim()
    recipientName  = (body.recipientName  as string)?.trim() || 'Customer'
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  // Check Brevo key
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Email service is not configured.' }, { status: 503 })
  }

  // Fetch memo
  const { data: memo } = await supabase.from('memos').select('*').eq('id', id).single()
  if (!memo) return Response.json({ error: 'Memo not found.' }, { status: 404 })

  const typedMemo = memo as Memo
  if (!['confirmed', 'paid', 'delivered'].includes(typedMemo.status)) {
    return Response.json({ error: 'Only confirmed, paid, or delivered memos can be emailed.' }, { status: 400 })
  }

  // Build PDF data and generate PDF
  const pdfData  = await resolveMemoData(supabase, typedMemo)
  const pdfBytes = generateMemoPdf(pdfData)
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

  // Format helpers for email
  const inr  = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
  const date = new Date(pdfData.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const htmlContent = buildHtml({
    recipientName,
    memoNumber:   pdfData.memo_number,
    memoType:     pdfData.memo_type === 'sales' ? 'Sales Memo' : 'Delivery Memo',
    status:       pdfData.status.charAt(0).toUpperCase() + pdfData.status.slice(1),
    date,
    total:        inr.format(pdfData.total_amount),
    customerName: pdfData.customerName,
    itemRows: pdfData.items.map((item) => ({
      name:  item.productName,
      qty:   `${item.quantity} ${item.productUnit}`.trim(),
      total: inr.format(item.line_total),
    })),
  })

  // Send via Brevo
  const brevoPayload = {
    sender:   { name: STORE_NAME, email: STORE_EMAIL },
    to:       [{ email: recipientEmail, name: recipientName }],
    subject:  `Your Memo #${pdfData.memo_number} — ${STORE_NAME}`,
    htmlContent,
    attachment: [
      {
        content: pdfBase64,
        name:    `memo-${pdfData.memo_number}.pdf`,
      },
    ],
  }

  const brevoRes = await fetch(BREVO_SEND_URL, {
    method:  'POST',
    headers: {
      'api-key':      apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(brevoPayload),
  })

  if (!brevoRes.ok) {
    const errText = await brevoRes.text()
    console.error('Brevo error:', brevoRes.status, errText)
    return Response.json(
      { error: `Failed to send email (${brevoRes.status}). Check Brevo configuration.` },
      { status: 502 },
    )
  }

  return Response.json({ ok: true })
}
