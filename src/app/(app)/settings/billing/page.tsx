import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { getOrgForUser } from '@/lib/get-org'
import { redirect } from 'next/navigation'
import { BILLING_PLANS, getBillingPlan, type PlanId } from '@/lib/billing'
import { BillingActions } from '@/components/billing/billing-actions'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { org, isOwner } = await getOrgForUser(supabase, user!.id)
  if (!isOwner) redirect('/settings')
  const currentPlan = getBillingPlan(org?.plan)
  const subscriptionStatus = org?.subscription_status ?? 'manual'
  const hasStripeCustomer = Boolean(org?.stripe_customer_id)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Plan</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your Cleerd subscription and plan limits.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Current Plan</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold text-white capitalize">{currentPlan.name}</p>
              <p className="text-gray-400 text-sm">${currentPlan.price}/month · {currentPlan.description}</p>
              <p className="mt-1 text-xs text-gray-500">Subscription status: <span className="capitalize text-gray-300">{subscriptionStatus}</span></p>
            </div>
            {hasStripeCustomer ? (
              <BillingActions mode="portal" label="Manage billing" />
            ) : (
              <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400 uppercase tracking-wide self-start sm:self-auto">Manual / Trial</span>
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {currentPlan.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Plan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {BILLING_PLANS.filter(plan => plan.id !== org?.plan).map(plan => (
            <div key={plan.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-100">{plan.name} — ${plan.price}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">{plan.features.join(' · ')}</p>
              </div>
              <BillingActions planId={plan.id as PlanId} mode="checkout" label="Choose plan" />
            </div>
          ))}
          <p className="text-xs text-gray-500 pt-1">Stripe checkout and the customer portal require production Stripe environment variables. If a button reports that pricing is not configured yet, add the matching Stripe price ID in Vercel/Supabase environment settings.</p>
          <Link href="mailto:support@cleerd.io"><Button variant="outline" size="sm">Contact support</Button></Link>
        </CardContent>
      </Card>
    </div>
  )
}
