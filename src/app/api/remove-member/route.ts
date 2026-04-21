import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { memberId } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the caller is the org owner
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!org) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Get the member record before deleting
  const { data: member } = await supabase
    .from('org_members')
    .select('id, user_id, org_id')
    .eq('id', memberId)
    .eq('org_id', org.id)
    .single()
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 })

  // Delete the org_members record
  await supabase.from('org_members').delete().eq('id', memberId)

  // If the invite was accepted, delete the auth user too
  if (member.user_id) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await admin.auth.admin.deleteUser(member.user_id)
  }

  return Response.json({ success: true })
}
