import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function readEnv(name: string): string | undefined {
  const v = process.env[name]
  if (v == null) return undefined
  const t = v.trim()
  return t.length > 0 ? t : undefined
}

function getClient(): SupabaseClient {
  if (_client) return _client

  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseServiceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    const missing: string[] = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(', ')}. ` +
        'In Vercel: Project → Settings → Environment Variables — use exact names, non-empty values, scope that includes this deployment (e.g. All Environments), then redeploy (Deployments → … → Redeploy). New variables are not applied to already-built deployments until you redeploy.',
    )
  }

  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  return _client
}

// Proxy object so callers use `supabaseAdmin.from(...)` directly
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
