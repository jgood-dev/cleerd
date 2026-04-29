'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, CheckCircle, CheckSquare, Mail } from 'lucide-react'

type PlanId = 'solo' | 'growth' | 'pro'

const planOptions: Record<PlanId, { name: string; price: number; note: string; fit: string }> = {
  solo: {
    name: 'Starter',
    price: 39,
    note: '1 team · 50 jobs/month',
    fit: 'Best for owner-operators and first workflows.',
  },
  growth: {
    name: 'Growth',
    price: 69,
    note: '3 teams · unlimited jobs',
    fit: 'Best value for recurring clients and small teams.',
  },
  pro: {
    name: 'Pro',
    price: 99,
    note: 'Unlimited teams · priority support',
    fit: 'Best for established teams that want more automation.',
  },
}

const trialSteps = [
  'Create your account',
  'Confirm your email',
  'Add one client and schedule one job',
]

function normalizePlan(value: string | null): PlanId {
  if (value === 'growth' || value === 'pro' || value === 'solo') return value
  return 'solo'
}

export default function SignupPage() {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('solo')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmPending, setConfirmPending] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setSelectedPlan(normalizePlan(new URLSearchParams(window.location.search).get('plan')))
  }, [])

  function choosePlan(planId: PlanId) {
    setSelectedPlan(planId)
    const params = new URLSearchParams(window.location.search)
    params.set('plan', planId)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { business_name: businessName, selected_plan: selectedPlan },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation not required — create org and go
      await supabase.from('organizations').insert({
        name: businessName,
        owner_id: data.user!.id,
        plan: selectedPlan,
      })
      router.push('/dashboard')
    } else if (data.user) {
      // Email confirmation required — org will be created in /auth/confirm
      setConfirmPending(true)
      setLoading(false)
    }
  }

  const plan = planOptions[selectedPlan]

  if (confirmPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1117]">
        <div className="w-full max-w-md px-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-blue-500/10 p-4">
              <Mail className="h-10 w-10 text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="mt-3 text-gray-400">
            We sent a confirmation link to <span className="text-white">{email}</span>.
            Click it to activate your account and start your {plan.name} trial.
          </p>
          <div className="mt-6 rounded-xl border border-white/10 bg-[#161b27] p-4 text-left">
            <p className="text-sm font-semibold text-white">Your first win after confirming</p>
            <p className="mt-1 text-sm text-gray-400">
              Open the dashboard, add one client location, and schedule one real job. Cleerd will keep the next step visible so you are not hunting around like it is a tax portal.
            </p>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Already confirmed?{' '}
            <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117] py-10">
      <div className="w-full max-w-lg px-4">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">Cleerd</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Start your free trial</h1>
          <p className="mt-1 text-gray-400">14 days free, no credit card required</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#161b27] p-8 shadow-xl">
          <div className="mb-5 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Pick your trial plan</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(Object.keys(planOptions) as PlanId[]).map(planId => {
                const option = planOptions[planId]
                const active = selectedPlan === planId
                return (
                  <button
                    key={planId}
                    type="button"
                    onClick={() => choosePlan(planId)}
                    className={`rounded-lg border p-3 text-left transition-colors ${active ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 bg-[#0f1117] hover:border-blue-500/40 hover:bg-white/5'}`}
                    aria-pressed={active}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
                      {option.name}
                      {active && <CheckCircle className="h-4 w-4 text-blue-300" />}
                    </span>
                    <span className="mt-1 block text-xs text-gray-400">${option.price}/mo after trial</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-[#0f1117]/70 p-3">
              <p className="font-semibold text-white">{plan.name} · ${plan.price}/month after trial</p>
              <p className="mt-1 text-sm text-blue-200">{plan.note}</p>
              <p className="mt-1 text-sm text-gray-400">{plan.fit}</p>
            </div>
          </div>

          <div className="mb-5 rounded-lg border border-white/10 bg-[#0f1117] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">What happens next</p>
            <div className="mt-3 space-y-2">
              {trialSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-300">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Business name</label>
              <Input placeholder="Acme Services" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
              <Input type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? 'Creating account...' : `Start free on ${plan.name}`}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-3 text-center text-xs text-gray-500">
            No credit card · Cancel anytime · Takes about 2 minutes to get into the dashboard
          </p>
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
