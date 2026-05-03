import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') ?? '/dashboard/memos'

  const supabase = await createClient()
  let success = false

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    success = !error
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    success = !error
  }

  if (!success) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`)
  }

  // recovery = password reset, invite = new user setting first password
  const isPasswordFlow =
    type === 'recovery' || type === 'invite' || next === '/reset-password'

  return NextResponse.redirect(
    `${origin}${isPasswordFlow ? '/reset-password' : next}`,
  )
}
