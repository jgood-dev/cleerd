export type PlanId = 'solo' | 'growth' | 'pro'

export type BillingPlan = {
  id: PlanId
  name: string
  price: number
  priceEnv: string
  teamLimit: number | null
  jobLimit: number | null
  description: string
  features: string[]
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'solo',
    name: 'Solo',
    price: 39,
    priceEnv: 'STRIPE_PRICE_SOLO',
    teamLimit: 1,
    jobLimit: 50,
    description: 'For owner-operators who need scheduling, proof, and clean client updates.',
    features: ['1 team', 'Up to 50 jobs/month', 'Photo documentation', 'AI quality reports', 'Client email delivery', 'Booking confirmations'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 69,
    priceEnv: 'STRIPE_PRICE_GROWTH',
    teamLimit: 3,
    jobLimit: null,
    description: 'For growing field-service businesses with multiple crews and recurring work.',
    features: ['Up to 3 teams', 'Unlimited jobs', 'Photo documentation', 'AI quality reports', 'Client email delivery', 'Appointment reminders'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    priceEnv: 'STRIPE_PRICE_PRO',
    teamLimit: null,
    jobLimit: null,
    description: 'For established service businesses that want more automation and priority support.',
    features: ['Unlimited teams', 'Unlimited jobs', 'Photo documentation', 'AI quality reports', 'Review requests', 'Priority support'],
  },
]

export function getBillingPlan(planId?: string | null) {
  return BILLING_PLANS.find(plan => plan.id === planId) ?? BILLING_PLANS[0]
}

export function getStripePriceId(planId: PlanId) {
  const plan = getBillingPlan(planId)
  return process.env[plan.priceEnv]
}

export function inferPlanFromPriceId(priceId?: string | null): PlanId | null {
  if (!priceId) return null
  for (const plan of BILLING_PLANS) {
    if (process.env[plan.priceEnv] === priceId) return plan.id
  }
  return null
}
