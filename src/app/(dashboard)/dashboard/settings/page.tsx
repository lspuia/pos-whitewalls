import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteForm } from './_components/invite-form'
import { UserTable, type UserRow } from './_components/user-table'
import type { Role } from '@/lib/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: self } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (self?.role !== 'super_admin') redirect('/')

  const admin = createAdminClient()

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    admin.from('profiles').select('id, full_name, role, is_active').order('full_name'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? '']),
  )

  const users: UserRow[] = (profiles ?? []).map((p) => ({
    id:        p.id,
    full_name: p.full_name,
    email:     emailMap.get(p.id) ?? '',
    role:      p.role as Role,
    is_active: p.is_active ?? true,
  }))

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Settings</h1>

      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Invite user
        </h2>
        <InviteForm />
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Staff users
        </h2>
        <UserTable users={users} currentUserId={user.id} />
      </section>
    </div>
  )
}
