import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId, role, name, phone } = await request.json()
  if (!memberId) return Response.json({ error: 'Missing memberId' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify the requester is the org owner
  const { data: member } = await admin
    .from('org_members')
    .select('org_id')
    .eq('id', memberId)
    .single()

  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 })

  const { data: org } = await admin
    .from('organizations')
    .select('owner_id')
    .eq('id', member.org_id)
    .single()

  if (org?.owner_id !== user.id) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const updates: Record<string, any> = {}
  if (role !== undefined) updates.role = role
  if (name !== undefined) updates.name = name || null
  if (phone !== undefined) updates.phone = phone || null

  const { error } = await admin.from('org_members').update(updates).eq('id', memberId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
