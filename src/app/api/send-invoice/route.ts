import { createClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { jobId, amount, paymentMethod } = await request.json()
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
  const companyName = org?.name ?? 'Your Service Company'
  const address = property.address ?? property.name ?? 'your property'
  const ownerFirst = property.owner_name ? property.owner_name.split(' ')[0] : null
  const greeting = ownerFirst ? `Hi ${ownerFirst},` : 'Hi,'
  const tz = org?.timezone ?? 'America/New_York'
  const scheduledDate = new Date(job.scheduled_at).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz,
  })
  const now = new Date().toISOString()

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
              <td align="right" style="color:#6b7280;font-size:13px;">Invoice</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="background:#ffffff;padding:32px;">
          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Thank you for choosing ${companyName}! Here is your invoice for the service completed at <strong>${address}</strong> on ${scheduledDate}.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Description</th>
                <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-top:1px solid #e5e7eb;">
                <td style="padding:14px 16px;font-size:14px;color:#374151;">Service â€” ${address}${paymentMethod ? `<br><span style="font-size:12px;color:#9ca3af;">Paid via ${paymentMethod}</span>` : ''}</td>
                <td style="padding:14px 16px;font-size:14px;color:#374151;text-align:right;font-weight:600;">${amount != null ? `$${Number(amount).toFixed(2)}` : 'See invoice'}</td>
              </tr>
            </tbody>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
            This invoice is marked as <strong style="color:#10b981;">paid</strong>. Thank you for your payment!
          </p>
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
            If you have any questions, please don't hesitate to reach out.
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

  const amountLine = amount != null ? `Amount: $${Number(amount).toFixed(2)}\n` : ''
  const methodLine = paymentMethod ? `Payment method: ${paymentMethod}\n` : ''
  const plainText = `${greeting}\n\nThank you for choosing ${companyName}!\n\nInvoice for service at ${address} on ${scheduledDate}.\n${amountLine}${methodLine}\nThis invoice is marked as PAID. Thank you for your payment!\n\nIf you have questions, please reach out.\n\nâ€” ${companyName}`

  try {
    await sendTransactionalEmail({
      to: property.client_email,
      subject: `Invoice - service at ${address}`,
      html,
      text: plainText,
      fromName: companyName,
    })
  } catch (error) {
    console.error('Failed to send invoice email:', error)
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }

  await supabase.from('jobs').update({
    paid_at: now,
    invoice_sent_at: now,
    ...(amount != null ? { price: amount } : {}),
    ...(paymentMethod ? { payment_method: paymentMethod } : {}),
  }).eq('id', jobId)

  return Response.json({ success: true })
}
