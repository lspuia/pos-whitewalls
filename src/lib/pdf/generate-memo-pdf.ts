import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import path from 'path'
import fs from 'fs'

// ── Font (cached per server instance) ────────────────────────────────────────

let _geistBase64: string | null = null

function loadGeistFont(): string {
  if (_geistBase64) return _geistBase64
  try {
    const nextPkg = require.resolve('next/package.json')
    const fontPath = path.join(
      path.dirname(nextPkg),
      'dist/compiled/@vercel/og/Geist-Regular.ttf',
    )
    _geistBase64 = fs.readFileSync(fontPath).toString('base64')
    return _geistBase64
  } catch {
    return ''
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PdfItemRow = {
  productName:    string
  productSku:     string | null
  productUnit:    string
  quantity:       number
  unit_price:     number
  discount_type:  'flat' | 'percent'
  discount_value: number
  line_total:     number
}

export type PdfMemoData = {
  memo_number:         string
  memo_type:           'sales' | 'delivery'
  status:              string
  created_at:          string
  delivery_address:    string | null
  payment_method:      string | null
  paid_at:             string | null
  delivered_at:        string | null
  notes:               string | null
  subtotal:            number
  line_discount_total: number
  memo_discount_type:  'flat' | 'percent'
  memo_discount_value: number
  tax_amount:          number
  total_amount:        number
  customerName:        string
  customerPhone:       string
  tradePartner:        string
  items:               PdfItemRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inr = new Intl.NumberFormat('en-IN', {
  style:                 'currency',
  currency:              'INR',
  minimumFractionDigits: 2,
})
const fmt = (n: number) => inr.format(n)

function dateStr(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function paymentMethodLabel(m: string) {
  return m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Generator ─────────────────────────────────────────────────────────────────

export function generateMemoPdf(data: PdfMemoData): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W  = doc.internal.pageSize.getWidth()
  const ML = 15
  const MR = 15
  const CW = W - ML - MR

  const geist = loadGeistFont()
  if (geist) {
    doc.addFileToVFS('Geist-Regular.ttf', geist)
    doc.addFont('Geist-Regular.ttf', 'Geist', 'normal')
    doc.addFont('Geist-Regular.ttf', 'Geist', 'bold')
    doc.setFont('Geist', 'normal')
  }
  const font = geist ? 'Geist' : 'Helvetica'

  function setFont(size: number, _style: 'normal' | 'bold' = 'normal', color = '#1e1e1e') {
    doc.setFont(font, geist ? 'normal' : _style)
    doc.setFontSize(size)
    const c = color.replace('#', '')
    doc.setTextColor(
      parseInt(c.substring(0, 2), 16),
      parseInt(c.substring(2, 4), 16),
      parseInt(c.substring(4, 6), 16),
    )
  }

  let y = 15

  // ── Header ──────────────────────────────────────────────────────────────────
  setFont(16, 'bold', '#111111')
  doc.text('White Walls Interior Design Studio', ML, y)
  y += 6
  setFont(9, 'normal', '#888888')
  doc.text('Aizawl, Mizoram, India', ML, y)

  const docType = data.memo_type === 'sales' ? 'SALES MEMO' : 'DELIVERY MEMO'
  setFont(14, 'bold', '#111111')
  doc.text(docType, W - MR, y - 6, { align: 'right' })

  setFont(9, 'normal', '#555555')
  doc.text(`Memo #: ${data.memo_number}`, W - MR, y, { align: 'right' })
  y += 5
  doc.text(`Date: ${dateStr(data.created_at)}`, W - MR, y, { align: 'right' })
  y += 5
  const statusColor =
    data.status === 'paid' || data.status === 'delivered' ? '#22c55e' : '#3b82f6'
  setFont(9, 'bold', statusColor)
  doc.text(
    `Status: ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
    W - MR, y, { align: 'right' },
  )
  y += 8

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(ML, y, W - MR, y)
  y += 7

  // ── Bill To / Deliver To ─────────────────────────────────────────────────────
  setFont(7, 'bold', '#888888')
  doc.text('BILL TO', ML, y)
  y += 4
  setFont(11, 'bold', '#111111')
  doc.text(data.customerName, ML, y)
  y += 5
  if (data.customerPhone) {
    setFont(9, 'normal', '#555555')
    doc.text(data.customerPhone, ML, y)
    y += 4
  }
  if (data.tradePartner) {
    setFont(9, 'normal', '#888888')
    doc.text(`Trade Partner: ${data.tradePartner}`, ML, y)
    y += 4
  }

  if (data.memo_type === 'delivery' && data.delivery_address) {
    const addrY = y - (data.customerPhone ? 9 : 5) - (data.tradePartner ? 4 : 0)
    setFont(7, 'bold', '#888888')
    doc.text('DELIVER TO', W - MR, addrY - 4, { align: 'right' })
    setFont(9, 'normal', '#444444')
    const lines = doc.splitTextToSize(data.delivery_address, CW / 2 - 5) as string[]
    lines.forEach((line: string, i: number) => {
      doc.text(line, W - MR, addrY + i * 4.5, { align: 'right' })
    })
  }

  y += 4
  doc.setDrawColor(220, 220, 220)
  doc.line(ML, y, W - MR, y)
  y += 6

  // ── Meta line ────────────────────────────────────────────────────────────────
  const hasMeta = data.payment_method || data.delivered_at || data.notes
  if (hasMeta) {
    setFont(8, 'normal', '#888888')
    let metaLine = ''
    if (data.payment_method) {
      metaLine += `Payment: ${paymentMethodLabel(data.payment_method)}`
      if (data.paid_at) metaLine += ` on ${dateStr(data.paid_at)}`
    }
    if (data.delivered_at) {
      if (metaLine) metaLine += '   ·   '
      metaLine += `Delivered: ${dateStr(data.delivered_at)}`
    }
    if (metaLine) { doc.text(metaLine, ML, y); y += 4.5 }
    if (data.notes) { doc.text(`Note: ${data.notes}`, ML, y); y += 4.5 }
    y += 2
  }

  // ── Line items table ─────────────────────────────────────────────────────────
  const tableBody = data.items.map((item, idx) => {
    const gross   = item.quantity * item.unit_price
    const discAmt =
      item.discount_type === 'flat'
        ? Math.min(item.discount_value, gross)
        : (gross * item.discount_value) / 100
    return [
      String(idx + 1),
      item.productName,
      item.productSku ?? '',
      `${item.quantity} ${item.productUnit}`.trim(),
      fmt(item.unit_price),
      discAmt > 0 ? `-${fmt(discAmt)}` : '—',
      fmt(item.line_total),
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [['#', 'Product', 'SKU', 'Qty', 'Unit price', 'Discount', 'Total']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [245, 245, 245], textColor: [100, 100, 100],
      fontSize: 8, fontStyle: 'normal',
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
    },
    bodyStyles: {
      textColor: [40, 40, 40], fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 55 },
      2: { textColor: [140, 140, 140], fontSize: 8 },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right', textColor: [180, 60, 60] },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    styles: { font: geist ? 'Geist' : 'helvetica' },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Totals ───────────────────────────────────────────────────────────────────
  const afterLine      = data.subtotal - data.line_discount_total
  const memoDiscActual =
    data.memo_discount_type === 'flat'
      ? Math.min(data.memo_discount_value, afterLine)
      : (afterLine * data.memo_discount_value) / 100

  const totalsX  = W - MR - 70
  const colLabel = totalsX
  const colValue = W - MR

  function totalsRow(label: string, value: string, big = false, red = false) {
    const size  = big ? 11 : 9
    const color = red ? '#b03c3c' : big ? '#111111' : '#555555'
    setFont(size, big ? 'bold' : 'normal', color)
    doc.text(label, colLabel, y)
    doc.text(value, colValue, y, { align: 'right' })
    y += big ? 6 : 5
  }

  totalsRow('Subtotal', fmt(data.subtotal))
  if (data.line_discount_total > 0) {
    totalsRow('Item discounts', `-${fmt(data.line_discount_total)}`, false, true)
  }
  if (memoDiscActual > 0) {
    const discLabel =
      data.memo_discount_type === 'percent'
        ? `Memo discount (${data.memo_discount_value}%)`
        : 'Memo discount'
    totalsRow(discLabel, `-${fmt(memoDiscActual)}`, false, true)
  }
  if (data.tax_amount > 0) {
    totalsRow('Tax', fmt(data.tax_amount))
  }
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(totalsX, y, colValue, y)
  y += 4
  totalsRow('Total', fmt(data.total_amount), true)

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  setFont(7.5, 'normal', '#aaaaaa')
  doc.text(`Generated on ${dateStr(new Date().toISOString())}`, ML, pageH - 10)
  doc.text(
    'White Walls Interior Design Studio  ·  Aizawl, Mizoram',
    W - MR, pageH - 10, { align: 'right' },
  )

  return doc.output('arraybuffer')
}
