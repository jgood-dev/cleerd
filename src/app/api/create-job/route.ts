import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const JOB_LIMITS: Record<string, number | null> = {
  solo: 50,
  growth: null,
  pro: null,
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { org_id } = body

  const { data: org } = await supabase.from('organizations').select('id, plan').eq('id', org_id).single()
  if (!org) return Response.json({ error: 'Org not found' }, { status: 404 })

  const limit = JOB_LIMITS[org.plan ?? 'solo']
  if (limit !== null) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .gte('created_at', monthStart.toISOString())
    if ((count ?? 0) >= limit) {
      return Response.json(
        { error: `You've reached the ${limit} job/month limit on the ${org.plan ?? 'solo'} plan. Upgrade to schedule more jobs.` },
        { status: 403 }
      )
    }
  }

  const { data, error } = await supabase.from('jobs').insert({
    org_id: body.org_id,
    property_id: body.property_id,
    team_id: body.team_id,
    package_id: body.package_id,
    custom_items: body.custom_items,
    duration_minutes: body.duration_minutes,
    recurrence: body.recurrence,
    scheduled_at: body.scheduled_at,
    notes: body.notes,
    status: 'scheduled',
    price: body.price,
    size: body.size,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
