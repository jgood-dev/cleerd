import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { inspectionId } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, properties(name, address, client_email), organizations(name)')
    .eq('id', inspectionId)
    .single()

  if (!inspection?.properties?.client_email) {
    return Response.json({ error: 'No client email' }, { status: 400 })
  }

  // For now, log the report — email provider (Resend) will be wired up after domain is verified
  console.log('Report would be sent to:', inspection.properties.client_email)
  console.log('Report:', inspection.ai_report)

  return Response.json({ success: true })
}
