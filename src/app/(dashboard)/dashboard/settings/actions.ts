'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath }     from 'next/cache'
import type { Role }          from '@/lib/types'

export type SettingsFormState = { error?: string; success?: string } | null
export type ActionResult      = { error: string } | void

const VALID_ROLES: Role[] = ['super_admin', 'admin', 'manager', 'sales_staff']

// ── Guard: caller must be super_admin ─────────────────────────────────────────

async function requireSuperAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'super_admin' ? user.id : null
}

// ── Invite user ───────────────────────────────────────────────────────────────

export async function inviteUser(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const callerId = await requireSuperAdmin()
  if (!callerId) return { error: 'Not authorized.' }

  const email     = (formData.get('email')     as string)?.trim().toLowerCase()
  const full_name = (formData.get('full_name') as string)?.trim()
  const role      = formData.get('role') as Role

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'A valid email address is required.' }
  }
  if (!full_name) return { error: 'Full name is required.' }
  if (!VALID_ROLES.includes(role)) return { error: 'Invalid role.' }

  const admin = createAdminClient()

  // Invite creates the auth.users record and emails the invite link
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data:       { full_name },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
    },
  )
  if (inviteErr) {
    if (inviteErr.message.toLowerCase().includes('already been registered')) {
      return { error: 'A user with this email already exists.' }
    }
    return { error: inviteErr.message }
  }

  // DB trigger auto-creates profile; update role and full_name immediately
  if (invited.user) {
    await admin
      .from('profiles')
      .update({ role, full_name })
      .eq('id', invited.user.id)
  }

  revalidatePath('/dashboard/settings')
  return { success: `Invite sent to ${email}.` }
}

// ── Change role ───────────────────────────────────────────────────────────────

export async function changeUserRole(
  userId: string,
  role: Role,
): Promise<ActionResult> {
  const callerId = await requireSuperAdmin()
  if (!callerId) return { error: 'Not authorized.' }
  if (userId === callerId) return { error: 'You cannot change your own role.' }
  if (!VALID_ROLES.includes(role)) return { error: 'Invalid role.' }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
}

// ── Toggle active ─────────────────────────────────────────────────────────────

export async function toggleUserActive(
  userId: string,
  activate: boolean,
): Promise<ActionResult> {
  const callerId = await requireSuperAdmin()
  if (!callerId) return { error: 'Not authorized.' }
  if (userId === callerId) return { error: 'You cannot deactivate your own account.' }

  const admin = createAdminClient()

  // Ban / unban in auth — prevents token refresh for deactivated users
  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: activate ? 'none' : '87600h',
  })
  if (authErr) return { error: authErr.message }

  // Keep profiles.is_active in sync (layout reads this to force sign-out)
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ is_active: activate })
    .eq('id', userId)
  if (profileErr) return { error: profileErr.message }

  revalidatePath('/dashboard/settings')
}
