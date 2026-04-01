import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Untyped alias for insert/update calls where the typed client is too strict.
// All read operations still go through the typed `supabase` client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any

export async function getAuthUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
