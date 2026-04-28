import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgForUser } from '@/lib/get-org'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const { org, isOwner } = await getOrgForUser(supabase, user.id, user.email)
    if (!org || !isOwner) return Response.json({ error: 'Only account owners can manage billing' }, { status: 403 })

    if (!org.stripe_customer_id) {
      return Response.json({ error: 'No billing account has been created yet' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
    const session = await getStripe().billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/settings/billing`,
    })

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('Stripe portal failed', error)
    return Response.json({ error: 'Unable to open billing portal' }, { status: 500 })
  }
}
