import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Public endpoint — uses service role to look up an invite by token
// Safe because the token is 48 random hex chars and we only return non-sensitive fields
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await admin
    .from('org_members')
    .select('id, email, invite_accepted_at, organizations(name)')
    .eq('invite_token', token)
    .single()

  if (!data) return Response.json({ error: 'Invalid invite' }, { status: 404 })
  if (data.invite_accepted_at) return Response.json({ error: 'Invite already used' }, { status: 410 })

  return Response.json({
    email: data.email,
    orgName: (data.organizations as any)?.name ?? '',
  })
}
