import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { getOrgForUser } from '@/lib/get-org'
import { redirect } from 'next/navigation'

const plans = [
  { id: 'solo', name: 'Solo', price: 49, features: ['1 team', 'Up to 30 jobs/month', 'AI reports', 'Photo uploads'] },
  { id: 'growth', name: 'Growth', price: 79, features: ['Up to 3 teams', 'Unlimited jobs', 'AI reports', 'Client email delivery'] },
  { id: 'pro', name: 'Pro', price: 99, features: ['Unlimited teams', 'Unlimited jobs', 'AI reports', 'Client portal', 'Priority support'] },
]

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { org, isOwner } = await getOrgForUser(supabase, user!.id)
  if (!isOwner) redirect('/settings')
  const currentPlan = plans.find(p => p.id === org?.plan) ?? plans[0]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Plan</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your subscription.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Current Plan</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-white capitalize">{currentPlan.name}</p>
              <p className="text-gray-400 text-sm">${currentPlan.price}/month</p>
            </div>
            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400 uppercase tracking-wide">Active</span>
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
        <CardHeader><CardTitle>Upgrade Plan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {plans.filter(p => p.id !== org?.plan).map(plan => (
            <div key={plan.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-semibold text-gray-100">{plan.name} — ${plan.price}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">{plan.features.join(' · ')}</p>
              </div>
              <Button size="sm" disabled className="ml-4 flex-shrink-0">Coming soon</Button>
            </div>
          ))}
          <p className="text-xs text-gray-500 pt-1">Online plan management coming soon. Contact support@cleancheck.io to change your plan.</p>
        </CardContent>
      </Card>
    </div>
  )
}
