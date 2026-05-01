import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getOrgForUser } from '@/lib/get-org'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { org, isOwner } = await getOrgForUser(supabase, user.id)
  if (!org || !isOwner) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('org_members')
    .select('id, email, name')
    .eq('org_id', org.id)
    .not('invite_accepted_at', 'is', null)
    .order('created_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data ?? [])
}
