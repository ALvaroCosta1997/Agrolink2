import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PREVIEW_PATTERN = /^https:\/\/agrolink2-[^.]+\.vercel\.app$/

function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null
  if (origin === 'https://agrowlink.app') return origin
  if (PREVIEW_PATTERN.test(origin)) return origin
  return null
}

Deno.serve(async (req) => {
  const allowedOrigin = resolveAllowedOrigin(req.headers.get('Origin'))
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: allowedOrigin ? 204 : 403, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const jwt = authHeader.slice('Bearer '.length)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Admin client (service role) — verifies the JWT and later wipes the auth record
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt)
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Delete storage files before the RPC. Orphan storage is recoverable; orphan auth records are not.
  try {
    const { data: files } = await adminClient.storage.from('listing-photos').list(user.id, { limit: 1000 })
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`)
      await adminClient.storage.from('listing-photos').remove(paths)
    }
  } catch (storageErr) {
    console.error('Storage cleanup failed (non-fatal):', storageErr)
  }

  // User-scoped client — passes the JWT so auth.uid() resolves correctly inside SECURITY DEFINER
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })

  const { error: rpcError } = await userClient.rpc('delete_user_account')
  if (rpcError) {
    return new Response(JSON.stringify({ error: rpcError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Auth record must be deleted after public.* rows — if this fails, the account
  // is already anonymized in public schema; retrying is safe.
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
