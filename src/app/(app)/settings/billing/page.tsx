import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, CheckCircle, CreditCard, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { getOrgForUser } from '@/lib/get-org'
import { redirect } from 'next/navigation'
import { BILLING_PLANS, getBillingPlan, type PlanId } from '@/lib/billing'
import { BillingActions } from '@/components/billing/billing-actions'

function statusLabel(status: string) {
  if (status === 'trialing') return 'Free trial active'
  if (status === 'active') return 'Subscription active'
  if (status === 'past_due') return 'Payment needs attention'
  if (status === 'canceled') return 'Canceled'
  return 'Manual / Trial'
}

type BillingPageProps = {
  searchParams?: Promise<{ checkout?: string }>
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams
  const checkoutStatus = params?.checkout
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { org, isOwner } = await getOrgForUser(supabase, user!.id)
  if (!isOwner) redirect('/settings')
  const currentPlan = getBillingPlan(org?.plan)
  const subscriptionStatus = org?.subscription_status ?? 'manual'
  const hasStripeCustomer = Boolean(org?.stripe_customer_id)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Plan</h1>
          <p className="text-sm text-gray-400 mt-0.5">Choose the plan that matches the amount of admin work Cleerd is taking off your plate.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: TrendingUp, label: 'Revenue logic', value: '1 saved hour can cover Starter' },
          { icon: Sparkles, label: 'Upgrade trigger', value: 'More teams, more jobs, more automation' },
          { icon: CreditCard, label: 'Billing status', value: statusLabel(subscriptionStatus) },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Icon className="h-4 w-4 text-blue-300" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">{label}</p>
                <p className="mt-1 text-sm text-gray-300">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {checkoutStatus === 'success' && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
            <div>
              <p className="font-semibold text-emerald-100">Checkout complete.</p>
              <p className="mt-1 text-sm text-emerald-100/80">Stripe is syncing your subscription now. If this page still shows the old plan, refresh in a moment.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {checkoutStatus === 'cancelled' && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
            <div>
              <p className="font-semibold text-amber-100">Checkout was cancelled.</p>
              <p className="mt-1 text-sm text-amber-100/80">No changes were made. Pick a plan below when you are ready, or contact support if you want help choosing.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Current Plan</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold text-white capitalize">{currentPlan.name}</p>
              <p className="text-gray-400 text-sm">${currentPlan.price}/month · {currentPlan.description}</p>
              <p className="mt-1 text-xs text-gray-500">Subscription status: <span className="capitalize text-gray-300">{statusLabel(subscriptionStatus)}</span></p>
            </div>
            {hasStripeCustomer ? (
              <BillingActions mode="portal" label="Manage billing" />
            ) : (
              <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400 uppercase tracking-wide self-start sm:self-auto">Free trial / setup mode</span>
            )}
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        <CardHeader>
          <CardTitle>Pick the plan that protects your time</CardTitle>
          <p className="pt-1 text-sm text-gray-400">Starter is for proving the workflow. Growth is the practical default once recurring clients and multiple jobs are flowing. Pro is for owners who want fewer operational ceilings.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {BILLING_PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan.id
            return (
              <div key={plan.id} className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${isCurrent ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/10 bg-white/5'}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-100">{plan.name} — ${plan.price}/mo</p>
                    {plan.id === 'growth' && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">Best value</span>}
                    {isCurrent && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-300">Current</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{plan.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{plan.features.join(' · ')}</p>
                </div>
                {isCurrent ? (
                  hasStripeCustomer ? <BillingActions mode="portal" label="Manage" /> : <Button variant="outline" size="sm" disabled>Current trial</Button>
                ) : (
                  <BillingActions planId={plan.id as PlanId} mode="checkout" label={`Choose ${plan.name}`} />
                )}
              </div>
            )
          })}
          <p className="text-xs text-gray-500 pt-1">Need help choosing? Tell us how many teams and monthly jobs you run, and we will point you at the lowest plan that fits.</p>
          <Link href="mailto:support@cleerd.io"><Button variant="outline" size="sm">Contact support</Button></Link>
        </CardContent>
      </Card>
    </div>
  )
}
