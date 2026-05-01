import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/analytics'
import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { sendTransactionalEmail } from '@/lib/email'
import { userCanAccessOrg } from '@/lib/org-access'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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

  if (!inspection) return Response.json({ error: 'Inspection not found' }, { status: 404 })

  const property = inspection.properties as any
  const orgId = inspection.org_id ?? property?.org_id
  if (!(await userCanAccessOrg(supabase, orgId, user.id))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!property?.client_email) {
    return Response.json({ error: 'No client email' }, { status: 400 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, review_link')
    .eq('id', (inspection.properties as any).org_id ?? inspection.org_id)
    .single()

  // Generate share token if not already set
  let token = inspection.share_token
  if (!token) {
    token = randomUUID()
    await supabase.from('inspections').update({ share_token: token }).eq('id', inspectionId)
  }

  const team = inspection.teams as any
  const companyName = org?.name ?? 'Your Service Company'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const reportUrl = `${appUrl}/report/${token}`
  const address = property.address ?? property.name ?? 'your property'
  const ownerFirst = property.owner_name ? property.owner_name.split(' ')[0] : null
  const greeting = ownerFirst ? `Hi ${ownerFirst},` : 'Hi,'
  const safeCompanyName = escapeHtml(companyName)
  const safeAddress = escapeHtml(address)
  const safeGreeting = escapeHtml(greeting)
  const safeReportUrl = escapeHtml(reportUrl)
  const safeClientNote = inspection.client_note ? escapeHtml(inspection.client_note) : null
  const safeTeamName = team?.name ? escapeHtml(team.name) : null
  const safeReviewLink = org?.review_link ? escapeHtml(org.review_link) : null

  const reviewBlock = safeReviewLink ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;text-align:center;">
              <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#92400e;">Happy with the work?</p>
              <p style="margin:0 0 14px;font-size:13px;color:#78350f;line-height:1.5;">A quick review helps other customers find ${safeCompanyName} and helps the team know what went well.</p>
              <a href="${safeReviewLink}" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:8px;">Leave a review</a>
            </td></tr>
          </table>` : ''

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
              <td style="color:#ffffff;font-size:17px;font-weight:700;">${safeCompanyName}</td>
              <td align="right" style="color:#9ca3af;font-size:13px;">Verified Job Summary</td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;">

          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">${safeGreeting}</p>
          <p style="margin:0 0 22px;font-size:15px;color:#374151;line-height:1.6;">
            Your job at <strong>${safeAddress}</strong> is complete. ${safeCompanyName} put together a private summary with proof photos, completed task items, and any notes from the team.
          </p>

          ${safeClientNote ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:6px;padding:14px 16px;">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${safeClientNote}</p>
              ${safeTeamName ? `<p style=”margin:8px 0 0;font-size:13px;color:#9ca3af;”>&mdash; ${safeTeamName}</p>` : ''}
            </td></tr>
          </table>` : ''}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${safeReportUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;">
                View Your Job Summary
              </a>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr>
              <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
                  If anything needs attention, reply to this email while the details are fresh. If you want another visit scheduled, replying here is the fastest next step.
                </p>
              </td>
            </tr>
          </table>

          ${reviewBlock}

          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
            You can also save or forward the summary link as a record of the work completed at ${safeAddress}.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by <strong style="color:#6b7280;">${safeCompanyName}</strong> &middot; Powered by Cleerd</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const plainText = `${greeting}\n\nYour job at ${address} is complete. ${companyName} put together a private summary with proof photos, completed task items, and notes from the team.${inspection.client_note ? `\n\n${inspection.client_note}` : ''}\n\nView your job summary here:\n${reportUrl}\n\nIf anything needs attention, reply to this email while the details are fresh. If you want another visit scheduled, replying here is the fastest next step.${org?.review_link ? `\n\nHappy with the work? Leave a review here:\n${org.review_link}` : ''}\n\n— ${companyName}`

  try {
    await sendTransactionalEmail({
      to: property.client_email,
      subject: `Job complete - ${address}`,
      html,
      text: plainText,
      fromName: companyName,
    })
  } catch (error) {
    console.error('Failed to send report email:', error)
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
      has_review_link: Boolean(org?.review_link),
      report_url_created: Boolean(token),
    },
  })

  return Response.json({ success: true })
}
