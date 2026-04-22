import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
        await admin.from('org_members').update({
          user_id: data.user.id,
          invite_accepted_at: new Date().toISOString(),
        }).eq('id', pendingInvite.id)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Normal owner signup — create org if none exists
      const { count } = await admin
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', data.user.id)

      if (count === 0) {
        const businessName = data.user.user_metadata?.business_name ?? 'My Business'
        await admin.from('organizations').insert({
          name: businessName,
          owner_id: data.user.id,
          plan: 'solo',
        })
      }

      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?message=confirmation-failed', request.url))
}
