'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isAtLeast } from '@/lib/roles'
import type { Role } from '@/types/supabase'
import { signOut } from '@/app/(dashboard)/dashboard/actions'

interface SidebarProps {
  role:     Role
  fullName: string
}

export function Sidebar({ role, fullName }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen]   = useState(false)
  const visible = NAV_ITEMS.filter((item) => isAtLeast(role, item.minRole))

  function NavLinks() {
    return (
      <>
        {visible.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center px-4 py-3 text-sm ${
                active
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </>
    )
  }

  function UserFooter() {
    return (
      <div className="border-t border-gray-200 px-4 py-3">
        <p className="truncate text-sm font-medium text-gray-900">{fullName}</p>
        <p className="text-xs text-gray-400 capitalize">{role.replace('_', ' ')}</p>
        <form action={signOut} className="mt-2">
          <button type="submit" className="text-xs text-gray-400 hover:text-gray-700">
            Sign out
          </button>
        </form>
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile top bar ──────────────────────────────────────── */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-30 flex h-12 items-center border-b border-gray-200 bg-white px-4">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="mr-3 rounded p-1.5 text-gray-500 hover:bg-gray-100 active:bg-gray-200"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900">White Walls</span>
      </header>

      {/* ── Mobile drawer overlay ───────────────────────────────── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────────────── */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">POS</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded p-1 text-gray-400 hover:text-gray-900"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-1">
          <NavLinks />
        </nav>
        <UserFooter />
      </aside>

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex h-screen w-52 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">POS</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-1">
          <NavLinks />
        </nav>
        <UserFooter />
      </aside>
    </>
  )
}
