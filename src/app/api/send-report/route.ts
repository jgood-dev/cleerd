import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/analytics'
import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  const { inspectionId } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, properties(name, address, client_email, owner_name, org_id), teams(name)')
    .eq('id', inspectionId)
    .single()

  if (!inspection?.properties?.client_email) {
    return Response.json({ error: 'No client email' }, { status: 400 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', (inspection.properties as any).org_id ?? inspection.org_id)
    .single()

  // Generate share token if not already set
  let token = inspection.share_token
  if (!token) {
    token = randomUUID()
    await supabase.from('inspections').update({ share_token: token }).eq('id', inspectionId)
  }

  const property = inspection.properties as any
  const team = inspection.teams as any
  const companyName = org?.name ?? 'Your Service Company'
  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${token}`
  const address = property.address ?? property.name ?? 'your property'
  const ownerFirst = property.owner_name ? property.owner_name.split(' ')[0] : null
  const greeting = ownerFirst ? `Hi ${ownerFirst},` : 'Hi,'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#161b27;border-radius:12px 12px 0 0;padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#ffffff;font-size:17px;font-weight:700;">${companyName}</td>
              <td align="right" style="color:#6b7280;font-size:13px;">Job Summary</td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;">

          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Your job at <strong>${address}</strong> is complete. We've put together a quick summary for you.
          </p>

          ${inspection.client_note ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:6px;padding:14px 16px;">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${inspection.client_note}</p>
              ${team?.name ? `<p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">— ${team.name}</p>` : ''}
            </td></tr>
          </table>` : ''}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${reportUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;">
                View Your Job Summary
              </a>
            </td></tr>
          </table>

          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
            Your summary includes photos, completed task items, and any notes from the team. The link above will always show the latest version.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by <strong style="color:#6b7280;">${companyName}</strong> · Powered by Cleerd</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const plainText = `${greeting}\n\nYour job at ${address} is complete.${inspection.client_note ? `\n\n${inspection.client_note}` : ''}\n\nView your job summary here:\n${reportUrl}\n\nYour summary includes photos, completed items, and notes from the team.\n\n— ${companyName}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${companyName} <support@cleerd.io>`,
      reply_to: 'support@cleerd.io',
      to: property.client_email,
      subject: `Job complete — ${address}`,
      html,
      text: plainText,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }

  await trackServerEvent({
    eventName: 'first_client_report_sent',
    eventSource: 'send_report',
    orgId: (inspection.properties as any).org_id ?? inspection.org_id,
    userId: user.id,
    dedupeKey: `first_client_report_sent:${(inspection.properties as any).org_id ?? inspection.org_id}`,
    properties: {
      inspection_id: inspectionId,
      property_id: inspection.property_id ?? null,
      has_client_note: Boolean(inspection.client_note),
      report_url_created: Boolean(token),
    },
  })

  return Response.json({ success: true })
}
