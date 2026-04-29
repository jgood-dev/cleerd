import { createClient } from '@supabase/supabase-js'
import { inferPlanFromPriceId } from '@/lib/billing'
import { getStripe } from '@/lib/stripe'
import { trackServerEvent } from '@/lib/analytics'
import Stripe from 'stripe'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) throw new Error('Supabase admin credentials are not configured')
  return createClient(url, serviceRole)
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id
  const plan = (subscription.metadata.plan as string | undefined) ?? inferPlanFromPriceId(priceId) ?? undefined
  const currentPeriodEnd = firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000).toISOString() : null

  const update: Record<string, string | null> = {
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_current_period_end: currentPeriodEnd,
  }

  if (plan) update.plan = plan

  const { data: org, error } = await getAdminClient()
    .from('organizations')
    .update(update)
    .eq('stripe_customer_id', customerId)
    .select('id, owner_id, plan')
    .maybeSingle()

  if (error) throw error
  return { org, customerId, plan }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return Response.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }, { status: 500 })

  const stripe = getStripe()
  const signature = request.headers.get('stripe-signature')
  if (!signature) return Response.json({ error: 'Missing Stripe signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const body = await request.text()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Invalid Stripe webhook signature', error)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const { org, customerId, plan } = await syncSubscription(subscription)
        await trackServerEvent({
          eventName: 'checkout_completed',
          eventSource: 'stripe_webhook',
          orgId: org?.id,
          userId: org?.owner_id,
          dedupeKey: `checkout_completed:${session.id}`,
          properties: {
            plan: plan ?? org?.plan ?? null,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            checkout_session_id: session.id,
            payment_status: session.payment_status,
            subscription_status: subscription.status,
          },
        })
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription
      const { org, customerId, plan } = await syncSubscription(subscription)
      await trackServerEvent({
        eventName: 'subscription_synced',
        eventSource: 'stripe_webhook',
        orgId: org?.id,
        userId: org?.owner_id,
        dedupeKey: `subscription_synced:${event.id}`,
        properties: {
          plan: plan ?? org?.plan ?? null,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          stripe_event_type: event.type,
        },
      })
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
      await getAdminClient()
        .from('organizations')
        .update({ subscription_status: subscription.status })
        .eq('stripe_customer_id', customerId)
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook sync failed', error)
    return Response.json({ error: 'Webhook sync failed' }, { status: 500 })
  }
}
