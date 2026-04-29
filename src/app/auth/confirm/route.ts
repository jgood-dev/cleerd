import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { renderEmailShell, sendTransactionalEmail } from '@/lib/email'
import { trackServerEvent } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.verifyOtp({ type: type as any, token_hash })

    if (!error && data.user) {
      // Use service role to bypass RLS — session may not be queryable yet in this request
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      // Check if this user is already linked to an org invite
      const { count: memberCount } = await admin
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.user.id)

      if (memberCount && memberCount > 0) {
        await trackServerEvent({
          eventName: 'account_confirmed_existing_member',
          eventSource: 'auth_confirm',
          userId: data.user.id,
          dedupeKey: `account_confirmed_existing_member:${data.user.id}`,
          properties: { email_domain: data.user.email?.split('@')[1] ?? null },
        })
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Check for a pending invite by email (user_id not yet linked)
      const { data: pendingInvite } = await admin
        .from('org_members')
        .select('id')
        .eq('email', data.user.email ?? '')
        .is('user_id', null)
        .maybeSingle()

      if (pendingInvite) {
        const { data: acceptedInvite } = await admin.from('org_members').update({
          user_id: data.user.id,
          invite_accepted_at: new Date().toISOString(),
        }).eq('id', pendingInvite.id).select('org_id').single()
        await trackServerEvent({
          eventName: 'invite_accepted',
          eventSource: 'auth_confirm',
          orgId: acceptedInvite?.org_id,
          userId: data.user.id,
          dedupeKey: `invite_accepted:${data.user.id}`,
          properties: { email_domain: data.user.email?.split('@')[1] ?? null },
        })
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Normal owner signup — create org if none exists
      const { count } = await admin
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', data.user.id)

      if (count === 0) {
        const businessName = data.user.user_metadata?.business_name ?? 'My Business'
        const selectedPlan = ['solo', 'growth', 'pro'].includes(data.user.user_metadata?.selected_plan)
          ? data.user.user_metadata.selected_plan
          : 'solo'
        const { data: org } = await admin.from('organizations').insert({
          name: businessName,
          owner_id: data.user.id,
          plan: selectedPlan,
        }).select('id, plan').single()

        await trackServerEvent({
          eventName: 'owner_signup_activated',
          eventSource: 'auth_confirm',
          orgId: org?.id,
          userId: data.user.id,
          dedupeKey: `owner_signup_activated:${data.user.id}`,
          properties: {
            plan: org?.plan ?? 'solo',
            business_name_provided: Boolean(data.user.user_metadata?.business_name),
            email_domain: data.user.email?.split('@')[1] ?? null,
          },
        })

        if (data.user.email) {
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL('/dashboard', request.url).origin
            const html = renderEmailShell({
              brandName: 'Cleerd',
              eyebrow: 'Welcome',
              heading: `Welcome to Cleerd, ${businessName}`,
              intro: `Your ${selectedPlan === 'solo' ? 'Starter' : selectedPlan === 'growth' ? 'Growth' : 'Pro'} trial is ready. The fastest path to value is to add one client, schedule one job, and send one confirmation email today.`,
              bodyHtml: `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
            <tr><td style="padding:18px 20px;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;">Your quick-start checklist</p>
              <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">1. Add your first client or service location.</p>
              <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">2. Create one team, even if it is just you.</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">3. Schedule a job and send the client confirmation.</p>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Cleerd is built to replace spreadsheet chaos, text-message scheduling, and manual customer follow-ups for field-service businesses.</p>`,
              cta: { label: 'Open Cleerd Dashboard', url: `${appUrl}/dashboard` },
              footerNote: 'You are receiving this because you created a Cleerd account.',
            })
            await sendTransactionalEmail({
              to: data.user.email,
              subject: 'Welcome to Cleerd — your account is ready',
              html,
              text: `Welcome to Cleerd, ${businessName}.\n\nYour ${selectedPlan === 'solo' ? 'Starter' : selectedPlan === 'growth' ? 'Growth' : 'Pro'} trial is ready. Start by adding one client, creating one team, and scheduling one job.\n\nOpen your dashboard: ${appUrl}/dashboard`,
              fromName: 'Cleerd',
            })
          } catch (welcomeError) {
            console.warn('Welcome email failed', welcomeError)
          }
        }
      }

      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?message=confirmation-failed', request.url))
}
