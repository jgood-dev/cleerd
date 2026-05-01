import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { renderEmailShell, sendTransactionalEmail } from '@/lib/email'
import { userCanAccessOrg } from '@/lib/org-access'

export async function POST(request: NextRequest) {
  const { inspectionId } = await request.json()
  if (!inspectionId) return Response.json({ error: 'Missing inspectionId' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, properties(name, address, client_email, owner_name, org_id)')
    .eq('id', inspectionId)
    .single()

  if (!inspection) return Response.json({ error: 'Inspection not found' }, { status: 404 })

  const property = inspection.properties as any
  const orgId = inspection.org_id ?? property?.org_id
  if (!(await userCanAccessOrg(supabase, orgId, user.id))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!property?.client_email) {
    return Response.json({ error: 'No client email on this property.' }, { status: 400 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, review_link')
    .eq('id', orgId)
    .single()

  if (!org?.review_link) {
    return Response.json({ error: 'No review link configured. Add one in Settings → Business Info.' }, { status: 400 })
  }

  const companyName = org.name ?? 'Your Service Company'
  const address = property.address ?? property.name ?? 'your property'
  const ownerFirst = property.owner_name ? property.owner_name.split(' ')[0] : null

  const html = renderEmailShell({
    brandName: companyName,
    eyebrow: 'Quick favour',
    heading: ownerFirst ? `${ownerFirst}, how did we do?` : 'How did we do?',
    intro: `We recently completed a job at ${address}. If you were happy with the work, a quick review makes a huge difference for a small team like ours.`,
    bodyHtml: `
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        It only takes 30 seconds and helps other customers find us &mdash; plus it helps the crew know what went well.
      </p>`,
    cta: { label: 'Leave a Review', url: org.review_link },
    footerNote: `Sent by ${companyName} &middot; Powered by Cleerd`,
  })

  const text = `${ownerFirst ? `Hi ${ownerFirst},` : 'Hi,'}\n\nWe recently completed a job at ${address}. If you were happy with the work, a quick review makes a huge difference for a small team like ours.\n\nLeave a review here:\n${org.review_link}\n\nThank you!\n— ${companyName}`

  try {
    await sendTransactionalEmail({
      to: property.client_email,
      subject: `How did we do? — ${companyName}`,
      html,
      text,
      fromName: companyName,
    })
  } catch (err) {
    console.error('Failed to send review request:', err)
    return Response.json({ error: 'Failed to send email.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
