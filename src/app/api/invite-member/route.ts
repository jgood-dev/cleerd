import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { renderEmailShell, sendTransactionalEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase.from('organizations').select('id, name').eq('owner_id', user.id).single()
  if (!org) return Response.json({ error: 'Not an org owner' }, { status: 403 })

  if (typeof email !== 'string' || !email.trim()) {
    return Response.json({ error: 'Email is required' }, { status: 400 })
  }

  const inviteToken = randomBytes(24).toString('hex')
  const normalizedEmail = email.trim().toLowerCase()

  const { data: invite, error } = await supabase.from('org_members').insert({
    org_id: org.id,
    email: normalizedEmail,
    role: 'member',
    invite_token: inviteToken,
  }).select('id').single()

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'This email has already been invited.' }, { status: 409 })
    return Response.json({ error: error.message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const inviteUrl = `${appUrl}/join?token=${inviteToken}`
  const companyName = org.name ?? 'a service business'

  const html = renderEmailShell({
    brandName: companyName,
    eyebrow: 'Team Invitation',
    heading: "You're invited!",
    intro: `You've been invited to join ${companyName} on Cleerd — a tool for scheduling jobs, tracking checklists, and delivering client reports.`,
    bodyHtml: `
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        This link will let you create an account and join the team. If you didn't expect this invitation, you can ignore this email.
      </p>`,
    cta: { label: 'Accept Invitation', url: inviteUrl },
    footerNote: `Sent by ${companyName} · Powered by Cleerd`,
  })

  try {
    await sendTransactionalEmail({
      to: normalizedEmail,
      subject: `You're invited to join ${companyName} on Cleerd`,
      html,
      text: `You've been invited to join ${companyName} on Cleerd.\n\nAccept your invitation here:\n${inviteUrl}\n\nIf you didn't expect this, you can ignore this email.`,
      fromName: companyName,
    })
  } catch (error) {
    if (invite?.id) {
      await supabase.from('org_members').delete().eq('id', invite.id).eq('org_id', org.id)
    }
    console.error('Invite email failed:', error)
    return Response.json({ error: 'Failed to send invite email' }, { status: 500 })
  }

  return Response.json({ success: true })
}
