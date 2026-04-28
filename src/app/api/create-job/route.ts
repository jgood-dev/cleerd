import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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

  // Use service role to bypass any RLS issues on the server side
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify user owns this org
  const { data: org } = await admin
    .from('organizations')
    .select('id, plan, owner_id')
    .eq('id', org_id)
    .single()

  if (!org) return Response.json({ error: 'Org not found' }, { status: 404 })
  if (org.owner_id !== user.id) {
    // Check if user is an org member
    const { count } = await admin
      .from('org_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .eq('user_id', user.id)
      .not('invite_accepted_at', 'is', null)
    if (!count) return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const limit = JOB_LIMITS[org.plan ?? 'solo']
  if (limit !== null) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { count } = await admin
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

  const { data, error } = await admin.from('jobs').insert({
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
