'use client'

import { useState, useRef } from 'react'

interface Props {
  memoId:       string
  memoNumber:   string
  customerName: string
  customerPhone: string
  totalAmount:  number
  memoType:     string
  memoDate:     string
  memoStatus:   string
}

// ── WhatsApp helpers ──────────────────────────────────────────────────────────

function cleanPhone(raw: string): string {
  let p = raw.replace(/[\s\-().+]/g, '')
  if (p.length === 10 && /^[6-9]/.test(p)) p = '91' + p
  return p
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = cleanPhone(phone)
  const base  = clean ? `https://wa.me/${clean}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(message)}`
}

// ── Email form state ──────────────────────────────────────────────────────────

type EmailState = 'idle' | 'open' | 'sending' | 'sent' | 'error'

// ── Component ────────────────────────────────────────────────────────────────

export function PdfButtons({
  memoId,
  memoNumber,
  customerName,
  customerPhone,
  totalAmount,
  memoType,
  memoDate,
  memoStatus,
}: Props) {
  const [copied,     setCopied]     = useState(false)
  const [emailState, setEmailState] = useState<EmailState>('idle')
  const [emailError, setEmailError] = useState('')
  const emailRef = useRef<HTMLInputElement | null>(null)

  const pdfUrl = `/api/memos/${memoId}/pdf`

  // ── PDF link ────────────────────────────────────────────────────────────────
  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${pdfUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── WhatsApp ────────────────────────────────────────────────────────────────
  const inr = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2,
  })
  const whatsAppMessage = [
    `Hi ${customerName},`,
    '',
    `Here is your ${memoType === 'sales' ? 'sales memo' : 'delivery memo'} from White Walls Interior Design Studio:`,
    '',
    `Memo #: ${memoNumber}`,
    `Date:   ${memoDate}`,
    `Status: ${memoStatus.charAt(0).toUpperCase() + memoStatus.slice(1)}`,
    `Total:  ${inr.format(totalAmount)}`,
    '',
    `Download PDF: ${typeof window !== 'undefined' ? window.location.origin : ''}${pdfUrl}`,
  ].join('\n')

  const whatsAppUrl = buildWhatsAppUrl(customerPhone, whatsAppMessage)

  // ── Email send ──────────────────────────────────────────────────────────────
  async function sendEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const recipientEmail = emailRef.current?.value.trim() ?? ''
    if (!recipientEmail) return

    setEmailState('sending')
    setEmailError('')

    try {
      const res = await fetch(`/api/memos/${memoId}/email`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail, recipientName: customerName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEmailError(data.error ?? 'Failed to send email.')
        setEmailState('error')
      } else {
        setEmailState('sent')
      }
    } catch {
      setEmailError('Network error. Please try again.')
      setEmailState('error')
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {/* Download PDF */}
      <a
        href={pdfUrl}
        download={`memo-${memoNumber}.pdf`}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-gray-500"
      >
        Download PDF
      </a>

      {/* Copy shareable link */}
      <button
        onClick={copyLink}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-gray-500"
      >
        {copied ? 'Copied!' : 'Copy PDF link'}
      </button>

      {/* WhatsApp */}
      <a
        href={whatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded border border-green-600 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50"
      >
        Share on WhatsApp
      </a>

      {/* Email — toggle form */}
      {emailState === 'sent' ? (
        <span className="rounded border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700">
          Email sent ✓
        </span>
      ) : (
        <div className="flex flex-wrap items-start gap-2">
          {emailState === 'idle' ? (
            <button
              onClick={() => setEmailState('open')}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-gray-500"
            >
              Send via Email
            </button>
          ) : (
            <form
              onSubmit={sendEmail}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                ref={emailRef}
                type="email"
                required
                placeholder="Recipient email"
                disabled={emailState === 'sending'}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-50 w-56"
              />
              <button
                type="submit"
                disabled={emailState === 'sending'}
                className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {emailState === 'sending' ? 'Sending…' : 'Send'}
              </button>
              <button
                type="button"
                onClick={() => { setEmailState('idle'); setEmailError('') }}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-500"
              >
                Cancel
              </button>
              {emailState === 'error' && emailError && (
                <p className="w-full text-xs text-red-600 mt-0.5">{emailError}</p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
