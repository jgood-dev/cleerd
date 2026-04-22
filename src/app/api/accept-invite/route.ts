import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { token, userId, name, phone } = await request.json()
  if (!token || !userId) return Response.json({ error: 'Missing params' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: member } = await admin
    .from('org_members')
    .select('id, invite_accepted_at')
    .eq('invite_token', token)
    .single()

  if (!member) return Response.json({ error: 'Invalid invite' }, { status: 404 })
  if (member.invite_accepted_at) return Response.json({ error: 'Already accepted' }, { status: 410 })

  await admin.from('org_members').update({
    user_id: userId,
    invite_accepted_at: new Date().toISOString(),
    name: name ?? null,
    phone: phone ?? null,
  }).eq('invite_token', token)

  return Response.json({ success: true })
}
