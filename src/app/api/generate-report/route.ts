import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const completedItems = checklist?.filter(c => c.completed) ?? []
  const totalItems = checklist?.length ?? 0
  const checklistScore = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 100

  const checklistSummary = checklist?.map(c => `${c.completed ? '✓' : '✗'} ${c.label}`).join('\n') ?? ''

  // Get signed URLs for photos to pass to Claude vision
  const photoUrls: string[] = []
  for (const photo of photos ?? []) {
    const { data } = await supabase.storage.from('inspection-photos').createSignedUrl(photo.storage_path, 300)
    if (data?.signedUrl) photoUrls.push(data.signedUrl)
    if (photoUrls.length >= 5) break // cap at 5 photos for cost control
  }

  const content: Anthropic.MessageParam['content'] = []

  // Add photos as vision inputs
  for (const url of photoUrls) {
    try {
      const imgRes = await fetch(url)
      const buffer = await imgRes.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: contentType as any, data: base64 },
      })
    } catch { /* skip failed image */ }
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

Write a professional quality control report with:
1. Overall assessment (1-2 sentences)
2. What was done well
3. Areas for improvement (if any)
4. Specific observations from photos (if provided)
5. Recommendation for client communication

Also provide a numeric quality score from 0-100 based on checklist completion and photo evidence.

Format your response as:
SCORE: [number]
REPORT:
[your report text]`,
  })

  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'ANTHROPIC_API_KEY not set in environment' }, { status: 500 })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  const scoreMatch = responseText.match(/SCORE:\s*(\d+)/)
  const reportMatch = responseText.match(/REPORT:\s*([\s\S]+)/)
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : checklistScore
  const report = reportMatch ? reportMatch[1].trim() : responseText

  return Response.json({ report, score })
}

export async function GET() {
  return Response.json({
    ok: true,
    hasKey: !!process.env.ANTHROPIC_API_KEY,
  })
}
