import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const TEAM_LIMITS: Record<string, number | null> = {
  solo: 1,
  growth: 3,
  pro: null,
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { org_id, name } = await request.json()

  const { data: org } = await supabase.from('organizations').select('id, plan, owner_id').eq('id', org_id).single()
  if (!org) return Response.json({ error: 'Org not found' }, { status: 404 })

  if (org.owner_id !== user.id) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', org_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const limit = TEAM_LIMITS[org.plan ?? 'solo']
  if (limit !== null) {
    const { count } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
    if ((count ?? 0) >= limit) {
      return Response.json(
        { error: `Your ${org.plan ?? 'solo'} plan allows up to ${limit} team${limit === 1 ? '' : 's'}. Upgrade to add more.` },
        { status: 403 }
      )
    }
  }

  const { data, error } = await supabase.from('teams').insert({ org_id, name: name.trim() }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

