import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgForUser } from '@/lib/get-org'
import { BILLING_PLANS, getBillingPlan, getStripePriceId, type PlanId } from '@/lib/billing'
import { getStripe } from '@/lib/stripe'
import { trackServerEvent } from '@/lib/analytics'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const { org, isOwner } = await getOrgForUser(supabase, user.id, user.email)
    if (!org || !isOwner) return Response.json({ error: 'Only account owners can manage billing' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const planId = body.plan as PlanId
    if (!BILLING_PLANS.some(plan => plan.id === planId)) {
      return Response.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const priceId = getStripePriceId(planId)
    if (!priceId) {
      return Response.json({ error: `Stripe price for ${planId} is not configured yet` }, { status: 500 })
    }

    const stripe = getStripe()
    let customerId = org.stripe_customer_id as string | null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: org.name ?? undefined,
        metadata: { org_id: org.id, owner_id: user.id },
      })
      customerId = customer.id
      await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', org.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
    const plan = getBillingPlan(planId)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { org_id: org.id, plan: plan.id },
      },
      metadata: { org_id: org.id, plan: plan.id },
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=cancelled`,
    })

    await trackServerEvent({
      eventName: 'checkout_session_created',
      eventSource: 'stripe_checkout',
      orgId: org.id,
      userId: user.id,
      dedupeKey: `checkout_session_created:${session.id}`,
      properties: {
        plan: plan.id,
        price: plan.price,
        price_id: priceId,
        stripe_customer_id: customerId,
        checkout_session_id: session.id,
      },
    })

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout failed', error)
    return Response.json({ error: 'Unable to start checkout' }, { status: 500 })
  }
}
