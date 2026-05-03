'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signIn(_prev: unknown, formData: FormData) {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut()
    return { error: 'Could not load your profile. Contact your administrator.' }
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return { error: 'Account is inactive. Contact your administrator.' }
  }

  // Cache role in an httpOnly cookie for proxy-level route gating.
  // Real enforcement is at the DB/RLS layer — this is a UX guard only.
  const cookieStore = await cookies()
  cookieStore.set('user_role', profile.role as string, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 7, // 1 week
  })

  redirect('/dashboard/memos')
}
