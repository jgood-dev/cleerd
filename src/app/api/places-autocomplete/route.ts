import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')
  if (!input || input.length < 2) return NextResponse.json({ predictions: [] })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return NextResponse.json({ predictions: [] })

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${key}&types=address&components=country:us`
  const res = await fetch(url)
  const data = await res.json()

  const predictions = (data.predictions ?? []).map((p: any) => ({
    description: p.description,
    place_id: p.place_id,
  }))

  return NextResponse.json({ predictions })
}
