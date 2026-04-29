'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { trackClientEvent } from '@/lib/analytics-client'
import type { PlanId } from '@/lib/billing'

type BillingActionsProps = {
  planId?: PlanId
  mode: 'checkout' | 'portal'
  label: string
}

function getCustomerSafeBillingError(message: string) {
  if (message.toLowerCase().includes('not configured')) {
    return 'Online checkout is almost ready for this plan. Please contact support and we can activate it for you.'
  }
  if (message.toLowerCase().includes('no billing account')) {
    return 'Start a paid plan first, then the billing portal will be available here.'
  }
  return message
}

export function BillingActions({ planId, mode, label }: BillingActionsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    const eventPrefix = mode === 'checkout' ? 'checkout' : 'billing_portal'
    setLoading(true)
    setError('')
    trackClientEvent({
      eventName: `${eventPrefix}_clicked`,
      properties: { plan_id: planId ?? null, label },
    })
    try {
      const res = await fetch(`/api/billing/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planId ? { plan: planId } : {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Billing action failed')
      trackClientEvent({
        eventName: `${eventPrefix}_redirected`,
        properties: { plan_id: planId ?? null, label },
      })
      window.location.href = data.url
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Billing action failed'
      const message = getCustomerSafeBillingError(rawMessage)
      trackClientEvent({
        eventName: `${eventPrefix}_failed`,
        properties: { plan_id: planId ?? null, label, error: message },
      })
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button size="sm" onClick={handleClick} disabled={loading} className="ml-0 flex-shrink-0">
        {loading ? 'Opening…' : label}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
