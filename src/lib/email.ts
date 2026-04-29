type EmailCta = {
  label: string
  url: string
}

type EmailShellOptions = {
  brandName?: string | null
  eyebrow?: string
  heading: string
  intro?: string
  bodyHtml?: string
  cta?: EmailCta
  footerNote?: string
}

type SendTransactionalEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
  fromName?: string | null
  replyTo?: string
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]/g, ' ').trim()
}

export function firstName(fullName?: string | null) {
  const value = fullName?.trim()
  if (!value) return null
  return value.split(/\s+/)[0]
}

export function formatDuration(minutes?: number | null) {
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (!hours) return `${mins}m`
  return `${hours}h${mins ? ` ${mins}m` : ''}`
}

export function renderEmailShell({ brandName, eyebrow, heading, intro, bodyHtml, cta, footerNote }: EmailShellOptions) {
  const safeBrand = escapeHtml(brandName || 'Cleerd')
  const safeEyebrow = escapeHtml(eyebrow || 'Cleerd')
  const safeHeading = escapeHtml(heading)
  const safeIntro = intro ? `<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${escapeHtml(intro)}</p>` : ''
  const ctaHtml = cta ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td align="center">
              <a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;">
                ${escapeHtml(cta.label)}
              </a>
            </td></tr>
          </table>` : ''
  const safeFooter = footerNote ? escapeHtml(footerNote) : `Sent by ${safeBrand} · Powered by Cleerd`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#111827;border-radius:14px 14px 0 0;padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#ffffff;font-size:17px;font-weight:800;">${safeBrand}</td>
              <td align="right" style="color:#93c5fd;font-size:13px;font-weight:600;">${safeEyebrow}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;">
          <h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;color:#111827;">${safeHeading}</h1>
          ${safeIntro}
          ${bodyHtml ?? ''}
          ${ctaHtml}
        </td></tr>
        <tr><td style="background:#f9fafb;border-radius:0 0 14px 14px;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">${safeFooter}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendTransactionalEmail({ to, subject, html, text, fromName, replyTo }: SendTransactionalEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const configuredFrom = process.env.FROM_EMAIL || 'support@cleerd.io'
  const fromAddressMatch = configuredFrom.match(/<([^>]+)>/)
  const fromAddress = fromAddressMatch?.[1] || configuredFrom
  const safeFromName = sanitizeHeader(fromName || 'Cleerd')
  const safeFrom = configuredFrom.includes('<') ? sanitizeHeader(configuredFrom) : `${safeFromName} <${fromAddress}>`
  const safeReplyTo = sanitizeHeader(replyTo || process.env.REPLY_TO_EMAIL || fromAddress)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: safeFrom,
      reply_to: safeReplyTo,
      to,
      subject: sanitizeHeader(subject),
      html,
      text,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend error: ${errorText}`)
  }

  return response.json()
}
