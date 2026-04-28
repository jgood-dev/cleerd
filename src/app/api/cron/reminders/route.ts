import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all orgs with their reminder lead time
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, reminder_lead_hours')

  if (!orgs?.length) return Response.json({ sent: 0 })

  let totalSent = 0

  for (const org of orgs) {
    const leadHours = org.reminder_lead_hours ?? 48
    const now = new Date()
    const windowStart = new Date(now.getTime() + (leadHours - 2) * 3600000) // ±2h buffer
    const windowEnd = new Date(now.getTime() + (leadHours + 2) * 3600000)

    const { data: jobs } = await supabase
      .from('jobs')
      .select('*, properties(name, address, client_email, owner_name), teams(name), organizations(name)')
      .eq('org_id', org.id)
      .eq('status', 'scheduled')
      .is('reminder_sent_at', null)
      .gte('scheduled_at', windowStart.toISOString())
      .lte('scheduled_at', windowEnd.toISOString())

    if (!jobs?.length) continue

    for (const job of jobs) {
      const property = job.properties as any
      if (!property?.client_email) continue

      const companyName = org.name ?? 'Your Cleaning Service'
      const address = property.address ?? property.name ?? 'your property'
      const ownerFirst = property.owner_name ? property.owner_name.split(' ')[0] : null
      const greeting = ownerFirst ? `Hi ${ownerFirst},` : 'Hi,'
      const teamName = (job.teams as any)?.name

      const apptDate = new Date(job.scheduled_at)
      const apptFormatted = apptDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      })
      const apptTime = apptDate.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
      })

      const leadLabel = leadHours >= 48 ? `${Math.round(leadHours / 24)} days` : `${leadHours} hours`

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#161b27;border-radius:12px 12px 0 0;padding:20px 32px;">
          <table width="100%"><tr>
            <td style="color:#ffffff;font-size:17px;font-weight:700;">${companyName}</td>
            <td align="right" style="color:#6b7280;font-size:13px;">Appointment Reminder</td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Just a friendly reminder — your service appointment is coming up in <strong>${leadLabel}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">Your Appointment</p>
              <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e40af;">${apptFormatted}</p>
              <p style="margin:0 0 8px;font-size:16px;color:#3b82f6;">${apptTime}</p>
              <p style="margin:0;font-size:14px;color:#374151;">${address}</p>
              ${teamName ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Team: ${teamName}</p>` : ''}
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
            If you need to reschedule or have any questions, reply to this email and we'll take care of it.
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

      const text = `${greeting}\n\nYour service appointment at ${address} is coming up in ${leadLabel}.\n\n${apptFormatted} at ${apptTime}${teamName ? `\nTeam: ${teamName}` : ''}\n\nIf you need to reschedule, just reply to this email.\n\n— ${companyName}`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${companyName} <support@cleerd.io>`,
          reply_to: 'support@cleerd.io',
          to: property.client_email,
          subject: `Reminder: service appointment at ${address} on ${apptFormatted}`,
          html,
          text,
        }),
      })

      if (res.ok) {
        await supabase.from('jobs').update({ reminder_sent_at: new Date().toISOString() }).eq('id', job.id)
        totalSent++
      } else {
        console.error('Reminder send failed for job', job.id, await res.text())
      }
    }
  }

  return Response.json({ sent: totalSent })
}
