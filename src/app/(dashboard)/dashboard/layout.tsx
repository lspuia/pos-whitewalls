import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { ToastProvider } from '@/components/toast-provider'
import type { Role } from '@/types/supabase'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    // Sign out before redirecting so the proxy doesn't bounce them back
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={profile.role as Role} fullName={profile.full_name} />
      <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        {children}
      </main>
      <ToastProvider />
    </div>
  )
}
