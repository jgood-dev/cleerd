'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { PlanId } from '@/lib/billing'

type BillingActionsProps = {
  planId?: PlanId
  mode: 'checkout' | 'portal'
  label: string
}

export function BillingActions({ planId, mode, label }: BillingActionsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/billing/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planId ? { plan: planId } : {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Billing action failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Billing action failed')
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
