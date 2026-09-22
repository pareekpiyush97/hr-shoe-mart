import { createClient } from '@supabase/supabase-js'

// The publishable key is meant to ship to the browser; every table is guarded
// by row-level security and all money/stock logic lives in Postgres functions.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://fttmkanlhpvedbitbool.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_m8xABMgmYioC3y-9eLR_QA__TNh196f'

export const supabase = createClient(url, key, {
  auth: {
    // PKCE puts the confirmation token in `?code=` instead of the URL hash,
    // which the HashRouter owns — the two would otherwise fight over `#`.
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const FUNCTIONS_URL = `${url}/functions/v1`

/** Where Supabase should send people back after they click an email link. */
export const siteUrl = () => `${window.location.origin}${window.location.pathname}`

export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `${name} failed`)
  return data as T
}
