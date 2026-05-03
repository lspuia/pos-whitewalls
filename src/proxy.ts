import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLE_HIERARCHY, ROUTE_MIN_ROLES } from '@/lib/roles'
import type { Role } from '@/types/supabase'

export async function proxy(request: NextRequest) {
  // Supabase SSR requires a mutable response so it can refresh session cookies
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() is the only safe way to verify the session in proxy context
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/reset-password')

  if (!user) {
    if (isAuthRoute) return supabaseResponse
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  // Authenticated user hitting /login → go to dashboard
  if (isAuthRoute) {
    const redirect = NextResponse.redirect(
      new URL('/dashboard/memos', request.url),
    )
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  // Role-based route guard (role stored in httpOnly cookie set at sign-in)
  const role = (request.cookies.get('user_role')?.value ?? 'sales_staff') as Role

  for (const [routePrefix, minRole] of ROUTE_MIN_ROLES) {
    if (pathname.startsWith(routePrefix)) {
      if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
        const redirect = NextResponse.redirect(
          new URL('/forbidden', request.url),
        )
        supabaseResponse.cookies.getAll().forEach((c) =>
          redirect.cookies.set(c),
        )
        return redirect
      }
    }
  }

  // Forward role to layouts via request header
  supabaseResponse.headers.set('x-user-role', role)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api).*)',
  ],
}
