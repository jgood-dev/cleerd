import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/analytics'
import { userCanAccessOrg } from '@/lib/org-access'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

export async function POST(request: NextRequest) {
  const { inspectionId } = await request.json()
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: `Auth failed: ${authError?.message ?? 'no session'}` }, { status: 401 })

  const [{ data: inspection, error: inspErr }, { data: photos }, { data: checklist }] = await Promise.all([
    supabase.from('inspections').select('*, properties(name, address), teams(name)').eq('id', inspectionId).single(),
    supabase.from('inspection_photos').select('*').eq('inspection_id', inspectionId),
    supabase.from('checklist_items').select('*').eq('inspection_id', inspectionId),
  ])

  if (!inspection) return Response.json({ error: `Inspection not found: ${inspErr?.message}` }, { status: 404 })

  if (!(await userCanAccessOrg(supabase, inspection.org_id, user.id))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const completedItems = checklist?.filter(c => c.completed) ?? []
  const totalItems = checklist?.length ?? 0
  const checklistScore = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 100

  const checklistSummary = checklist?.map(c => `${c.completed ? '✓' : '✗'} ${c.label}`).join('\n') ?? ''
  const photoSummary = photos?.map(p => `- ${p.photo_type ?? 'photo'} photo${p.caption ? `: ${p.caption}` : ''}`).join('\n') ?? 'No photo metadata.'

  // Get signed URLs for photos to pass to Claude vision
  const photoUrls: string[] = []
  for (const photo of photos ?? []) {
    const { data } = await supabase.storage.from('inspection-photos').createSignedUrl(photo.storage_path, 300)
    if (data?.signedUrl) photoUrls.push(data.signedUrl)
    if (photoUrls.length >= 5) break // cap at 5 photos for cost control
  }

  const content: Anthropic.MessageParam['content'] = []

  // Add photos as vision inputs via URL (avoids base64 size limits)
  for (const url of photoUrls) {
    content.push({
      type: 'image',
      source: { type: 'url', url },
    })
  }

  content.push({
    type: 'text',
    text: `You are a professional field-service quality inspector. Analyze this completed job and write a concise professional quality report.

Property: ${inspection.properties?.name ?? 'Unknown'}
Address: ${inspection.properties?.address ?? 'Not provided'}
Team: ${inspection.teams?.name ?? 'Not assigned'}
Date: ${new Date(inspection.created_at).toLocaleDateString()}
Notes: ${inspection.notes ?? 'None'}

Checklist (${completedItems.length}/${totalItems} completed):
${checklistSummary}

${photoUrls.length > 0 ? `${photoUrls.length} inspection photo(s) have been provided above.` : 'No photos were provided for this inspection.'}

Photo metadata:
${photoSummary}

Write two clearly separated outputs:

1. CLIENT-SAFE SUMMARY SUGGESTION: A short, polished customer-facing note the owner can copy into the client note field. Keep it friendly, specific, and confidence-building. Mention only completed work, helpful observations, and suggested next steps that would be appropriate for a customer to read. Do not mention quality score, internal defects, team performance, missed checklist items, or coaching language.

2. INTERNAL QUALITY COACHING: A concise internal-only quality control report for the business owner. Include the overall assessment, what went well, areas for improvement, specific photo observations, checklist concerns, and suggested follow-up before sending the report. This section may be candid because customers will not see it.

Also provide a numeric quality score from 0-100 based on checklist completion and photo evidence.

Format your response exactly as:
SCORE: [number]
REPORT:
CLIENT-SAFE SUMMARY SUGGESTION:
[your customer-safe note]

INTERNAL QUALITY COACHING:
[your internal quality report]`,
  })

  const anthropic = getAnthropicClient()
  if (!anthropic) return Response.json({ error: 'ANTHROPIC_API_KEY not set in environment' }, { status: 500 })

  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })
  } catch (err: any) {
    return Response.json({ error: `Anthropic API error: ${err?.message ?? String(err)}` }, { status: 500 })
  }

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  const scoreMatch = responseText.match(/SCORE:\s*(\d+)/)
  const reportMatch = responseText.match(/REPORT:\s*([\s\S]+)/)
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : checklistScore
  const report = reportMatch ? reportMatch[1].trim() : responseText

  await trackServerEvent({
    eventName: 'first_ai_report_generated',
    eventSource: 'generate_report',
    orgId: inspection.org_id,
    userId: user.id,
    dedupeKey: `first_ai_report_generated:${inspection.org_id}`,
    properties: {
      inspection_id: inspectionId,
      score,
      checklist_items: totalItems,
      completed_items: completedItems.length,
      photo_count: photos?.length ?? 0,
      photos_analyzed: photoUrls.length,
    },
  })

  return Response.json({ report, score })
}

export async function GET() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}
