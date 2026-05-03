import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'POS', template: '%s — POS' },
  description: 'Point of Sale — staff access only',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
