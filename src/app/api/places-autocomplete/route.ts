import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const input = req.nextUrl.searchParams.get('input')?.trim()
  if (!input || input.length < 2) return NextResponse.json({ predictions: [] })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) {
    console.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for places autocomplete')
    return NextResponse.json({ predictions: [], error: 'Places autocomplete is not configured' }, { status: 503 })
  }

  const params = new URLSearchParams({ input, key, types: 'address', components: 'country:us' })
  const res = await fetch('https://maps.googleapis.com/maps/api/place/autocomplete/json?' + params.toString())
  const data = await res.json()
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('Places API error:', data.status, data.error_message)
    return NextResponse.json({ predictions: [], error: data.status })
  }
  const predictions = (data.predictions ?? []).map((p: any) => ({
    description: p.description,
    place_id: p.place_id,
  }))
  return NextResponse.json({ predictions })
}
