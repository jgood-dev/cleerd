import { createClient as createAdminClient } from '@supabase/supabase-js'

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type AnalyticsProperties = Record<string, JsonValue | undefined>

type TrackServerEventInput = {
  eventName: string
  eventSource?: string
  orgId?: string | null
  userId?: string | null
  dedupeKey?: string | null
  properties?: AnalyticsProperties
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) return null
  return createAdminClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
}

function cleanProperties(properties?: AnalyticsProperties): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(properties ?? {}).filter((entry): entry is [string, JsonValue] => entry[1] !== undefined)
  )
}

export async function trackServerEvent({
  eventName,
  eventSource = 'server',
  orgId,
  userId,
  dedupeKey,
  properties,
}: TrackServerEventInput) {
  const admin = getAdminClient()
  const payload = {
    event_name: eventName,
    event_source: eventSource,
    org_id: orgId ?? null,
    user_id: userId ?? null,
    dedupe_key: dedupeKey ?? null,
    properties: cleanProperties(properties),
  }

  if (!admin) {
    console.info('Analytics event skipped: Supabase admin credentials are not configured', payload)
    return
  }

  const { error } = await admin.from('analytics_events').insert(payload)

  if (error) {
    if (error.code === '23505') return
    console.warn('Analytics event skipped', { eventName, message: error.message })
  }
}
