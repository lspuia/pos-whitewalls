import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

/**
 * Service-role client — bypasses RLS and has full auth.admin access.
 * Only instantiate inside server actions / route handlers, never in client code.
 */
export function createAdminClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svcKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.')
  }
  return createClient<Database>(url, svcKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
