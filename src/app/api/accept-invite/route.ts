import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { token, name, phone } = await request.json()
  if (!token) return Response.json({ error: 'Missing params' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: member } = await admin
    .from('org_members')
    .select('id, email, invite_accepted_at')
    .eq('invite_token', token)
    .single()

  if (!member) return Response.json({ error: 'Invalid invite' }, { status: 404 })
  if (member.invite_accepted_at) return Response.json({ error: 'Already accepted' }, { status: 410 })
  if (String(member.email).trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    return Response.json({ error: 'This invite is only valid for the invited email address.' }, { status: 403 })
  }

  await admin.from('org_members').update({
    user_id: user.id,
    invite_accepted_at: new Date().toISOString(),
    name: name ?? null,
    phone: phone ?? null,
  }).eq('invite_token', token)

  return Response.json({ success: true })
}
