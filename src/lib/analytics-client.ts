import type { AnalyticsProperties } from '@/lib/analytics'

type TrackClientEventInput = {
  eventName: string
  eventSource?: string
  dedupeKey?: string
  properties?: AnalyticsProperties
}

export function trackClientEvent({
  eventName,
  eventSource = 'client',
  dedupeKey,
  properties,
}: TrackClientEventInput) {
  if (typeof window === 'undefined') return

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, eventSource, dedupeKey, properties }),
    keepalive: true,
  }).catch(() => {
    // Analytics should never interrupt activation, checkout, or first-value flows.
  })
}
