import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase.from('organizations').select('id, name').eq('owner_id', user.id).single()
  if (!org) return Response.json({ error: 'Not an org owner' }, { status: 403 })

  const inviteToken = randomBytes(24).toString('hex')
  const normalizedEmail = email.trim().toLowerCase()

  const { error } = await supabase.from('org_members').insert({
    org_id: org.id,
    email: normalizedEmail,
    role: 'member',
    invite_token: inviteToken,
  })

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'This email has already been invited.' }, { status: 409 })
    return Response.json({ error: error.message }, { status: 500 })
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join?token=${inviteToken}`
  const companyName = org.name ?? 'a service business'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#161b27;border-radius:12px 12px 0 0;padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#ffffff;font-size:17px;font-weight:700;">${companyName}</td>
              <td align="right" style="color:#6b7280;font-size:13px;">Team Invitation</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;">
          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">You're invited!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            You've been invited to join <strong>${companyName}</strong> on Cleerd — a tool for scheduling jobs, tracking checklists, and delivering client reports.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${inviteUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;">
                Accept Invitation
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
            This link will let you create an account and join the team. If you didn't expect this invitation, you can ignore this email.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by <strong style="color:#6b7280;">${companyName}</strong> · Powered by Cleerd</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${companyName} <support@cleerd.io>`,
      reply_to: 'support@cleerd.io',
      to: normalizedEmail,
      subject: `You're invited to join ${companyName} on Cleerd`,
      html,
      text: `You've been invited to join ${companyName} on Cleerd.\n\nAccept your invitation here:\n${inviteUrl}\n\nIf you didn't expect this, you can ignore this email.`,
    }),
  })

  if (!res.ok) {
    console.error('Resend error:', await res.text())
    return Response.json({ error: 'Failed to send invite email' }, { status: 500 })
  }

  return Response.json({ success: true })
}
