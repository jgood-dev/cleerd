import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { token, email, password, name, phone } = await request.json()
  if (!token || !email || !password) return Response.json({ error: 'Missing params' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify invite is valid and unused
  const { data: member } = await admin
    .from('org_members')
    .select('id, email, invite_accepted_at')
    .eq('invite_token', token)
    .single()

  if (!member) return Response.json({ error: 'Invalid invite' }, { status: 404 })
  if (member.invite_accepted_at) return Response.json({ error: 'Invite already used' }, { status: 410 })

  // Create user with email pre-confirmed — no confirmation email sent
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    // User already exists — just link the invite
    const { data: existingData } = await admin.auth.admin.listUsers()
    const existingUser = existingData?.users?.find((u: any) => u.email === email)
    if (!existingUser) return Response.json({ error: createError.message }, { status: 400 })

    await admin.from('org_members').update({
      user_id: existingUser.id,
      invite_accepted_at: new Date().toISOString(),
      name: name ?? null,
      phone: phone ?? null,
    }).eq('invite_token', token)

    return Response.json({ success: true })
  }

  // Link the invite to the new user
  await admin.from('org_members').update({
    user_id: userData.user.id,
    invite_accepted_at: new Date().toISOString(),
    name: name ?? null,
    phone: phone ?? null,
  }).eq('invite_token', token)

  return Response.json({ success: true })
}
