import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/analytics'
import { sendTransactionalEmail } from '@/lib/email'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { jobId } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: job } = await supabase
    .from('jobs')
    .select('*, properties(name, address, client_email, owner_name, org_id), teams(name), organizations(name, timezone)')
    .eq('id', jobId)
    .single()

  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })

  const property = job.properties as any
  if (!property?.client_email) return Response.json({ error: 'No client email' }, { status: 400 })

  const org = job.organizations as any
  const team = job.teams as any
  const companyName = org?.name ?? 'Your Service Company'
  const address = property.address ?? property.name ?? 'your property'
  const ownerFirst = property.owner_name ? property.owner_name.split(' ')[0] : null
  const greeting = ownerFirst ? `Hi ${ownerFirst},` : 'Hi,'
  const tz = org?.timezone ?? 'America/New_York'
  const scheduledDate = new Date(job.scheduled_at).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: tz,
  })
  const durationText = job.duration_minutes
    ? `${Math.floor(job.duration_minutes / 60)}h${job.duration_minutes % 60 ? ` ${job.duration_minutes % 60}m` : ''}`
    : null

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
              <td align="right" style="color:#6b7280;font-size:13px;">Booking Confirmation</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="background:#ffffff;padding:32px;">
          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Your appointment at <strong>${address}</strong> has been confirmed.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;width:40%;">Date &amp; Time</td>
                  <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${scheduledDate}</td>
                </tr>
                ${team?.name ? `<tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;">Team</td>
                  <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${team.name}</td>
                </tr>` : ''}
                ${durationText ? `<tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:14px;">Estimated Duration</td>
                  <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${durationText}</td>
                </tr>` : ''}
              </table>
            </td></tr>
          </table>

          ${job.notes ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:6px;padding:14px 16px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#3b82f6;text-transform:uppercase;letter-spacing:0.05em;">Note from us</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${job.notes}</p>
            </td></tr>
          </table>` : ''}

          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
            After the job is complete, we'll send you a full summary with photos and a list of everything completed.
          </p>
        </td></tr>

        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by <strong style="color:#6b7280;">${companyName}</strong> Â· Powered by Cleerd</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const plainText = `${greeting}\n\nYour appointment at ${address} has been confirmed.\n\nDate & Time: ${scheduledDate}${team?.name ? `\nTeam: ${team.name}` : ''}${durationText ? `\nEstimated Duration: ${durationText}` : ''}${job.notes ? `\n\nNote: ${job.notes}` : ''}\n\nAfter the job is complete, we'll send you a full summary.\n\nâ€” ${companyName}`

  try {
    await sendTransactionalEmail({
      to: property.client_email,
      subject: `Booking confirmed - ${scheduledDate}`,
      html,
      text: plainText,
      fromName: companyName,
    })
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }

  await supabase.from('jobs').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', jobId)

  await trackServerEvent({
    eventName: 'first_confirmation_email_sent',
    eventSource: 'send_confirmation',
    orgId: job.org_id ?? property.org_id,
    userId: user.id,
    dedupeKey: `first_confirmation_email_sent:${job.org_id ?? property.org_id}`,
    properties: {
      job_id: jobId,
      property_id: job.property_id ?? null,
      has_team: Boolean(job.team_id),
      has_duration: Boolean(job.duration_minutes),
    },
  })

  return Response.json({ success: true })
}
