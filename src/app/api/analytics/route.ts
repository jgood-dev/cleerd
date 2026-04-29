import { NextRequest } from 'next/server'
import { trackServerEvent, type AnalyticsProperties } from '@/lib/analytics'
import { getOrgForUser } from '@/lib/get-org'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_EVENTS = new Set([
  'checkout_clicked',
  'checkout_redirected',
  'checkout_failed',
  'billing_portal_clicked',
  'billing_portal_redirected',
  'billing_portal_failed',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!isRecord(body) || typeof body.eventName !== 'string') {
    return Response.json({ error: 'Invalid analytics payload' }, { status: 400 })
  }

  if (!ALLOWED_EVENTS.has(body.eventName)) {
    return Response.json({ error: 'Unsupported analytics event' }, { status: 400 })
  }

  const { org } = await getOrgForUser(supabase, user.id, user.email)
  await trackServerEvent({
    eventName: body.eventName,
    eventSource: typeof body.eventSource === 'string' ? body.eventSource : 'client',
    orgId: org?.id,
    userId: user.id,
    dedupeKey: typeof body.dedupeKey === 'string' ? body.dedupeKey : undefined,
    properties: isRecord(body.properties) ? body.properties as AnalyticsProperties : undefined,
  })

  return Response.json({ ok: true })
}
