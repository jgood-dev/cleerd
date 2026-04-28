import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { CheckCircle, Clock, Users, Calendar, Star, Camera, AlertCircle } from 'lucide-react'

function fmtDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return null
  const totalMins = Math.round(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m} minute${m !== 1 ? 's' : ''}`
  if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`
  return `${h} hr ${m} min`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function ClientReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, properties(name, address, owner_name, org_id), teams(name, team_members(*)), inspection_photos(*), checklist_items(*)')
    .eq('share_token', token)
    .single()

  if (!inspection) notFound()

  const property = inspection.properties as any
  const team = inspection.teams as any
  const members: any[] = team?.team_members ?? []
  const photos = (inspection.inspection_photos as any[]) ?? []
  const checklist = (inspection.checklist_items as any[]) ?? []

  // Fetch org for name + review link
  const orgId = property?.org_id ?? inspection.org_id
  const { data: org } = await supabase.from('organizations').select('name, review_link').eq('id', orgId).single()

  // Fetch next scheduled job for this property
  const { data: nextJob } = await supabase
    .from('jobs')
    .select('scheduled_at')
    .eq('property_id', inspection.property_id)
    .gt('scheduled_at', new Date().toISOString())
    .neq('status', 'done')
    .order('scheduled_at')
    .limit(1)
    .single()

  // Generate signed URLs for photos
  const photoUrls: Record<string, string> = {}
  for (const photo of photos) {
    const { data } = await supabase.storage.from('inspection-photos').createSignedUrl(photo.storage_path, 604800)
    if (data?.signedUrl) photoUrls[photo.id] = data.signedUrl
  }

  const completedItems = checklist.filter((c: any) => c.completed)
  const issuePhotos = photos.filter(p => p.photo_type === 'issue')
  const afterPhotos = photos.filter(p => p.photo_type === 'after')
  const completedAt = inspection.completed_at ?? inspection.created_at
  const timeOnSite = inspection.completed_at ? fmtDuration(inspection.created_at, inspection.completed_at) : null
  const companyName = org?.name ?? 'Your Service Company'
  const ownerName = property?.owner_name ? property.owner_name.split(' ')[0] : null

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-gray-800" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#161b27', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '18px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 18 }}>{companyName}</span>
          <span style={{ color: '#6b7280', fontSize: 13 }}>Job Summary</span>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
            {ownerName ? `Hi ${ownerName} — your job is complete!` : 'Your job is complete!'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15, margin: 0 }}>
            {property?.address ?? property?.name} · {fmtDate(completedAt)}
          </p>
        </div>

        {/* Personal note */}
        {inspection.client_note && (
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderLeft: '4px solid #3b82f6', borderRadius: 10, padding: '18px 20px', marginBottom: 24 }}>
            <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{inspection.client_note}</p>
            {team?.name && <p style={{ color: '#9ca3af', fontSize: 13, margin: '10px 0 0' }}>— {team.name}</p>}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          {/* Items completed */}
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <CheckCircle size={16} color="#22c55e" />
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Items Completed</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
              {completedItems.length}<span style={{ fontSize: 14, color: '#9ca3af', fontWeight: 400 }}>/{checklist.length}</span>
            </p>
          </div>

          {/* Time on site */}
          {timeOnSite && (
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Clock size={16} color="#3b82f6" />
                <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Time on Site</span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>{timeOnSite}</p>
            </div>
          )}

          {/* Team */}
          {team?.name && (
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Users size={16} color="#8b5cf6" />
                <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Completed by</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>{team.name}</p>
              {members.length > 0 && (
                <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
                  {members.map((m: any) => m.name).join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* After photos */}
        {afterPhotos.length > 0 && (
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Camera size={18} color="#3b82f6" />
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>After Photos</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {afterPhotos.map((photo: any) => photoUrls[photo.id] && (
                <img key={photo.id} src={photoUrls[photo.id]} alt="After cleaning"
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              ))}
            </div>
          </div>
        )}

        {/* Completed items */}
        {completedItems.length > 0 && (
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>What We Completed</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px 16px' }}>
              {completedItems.map((item: any) => (
                <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151' }}>
                  <CheckCircle size={14} color="#22c55e" style={{ flexShrink: 0 }} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues noted */}
        {issuePhotos.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <AlertCircle size={18} color="#d97706" />
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#92400e', margin: 0 }}>A Few Things We Noted</h2>
            </div>
            <p style={{ fontSize: 14, color: '#78350f', margin: '0 0 14px', lineHeight: 1.5 }}>
              We wanted to make you aware of the following items we came across. These are pre-existing conditions or areas that needed extra attention.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {issuePhotos.map((photo: any) => photoUrls[photo.id] && (
                <img key={photo.id} src={photoUrls[photo.id]} alt="Item noted"
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid #fde68a' }} />
              ))}
            </div>
          </div>
        )}

        {/* Next visit */}
        {nextJob && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#2563eb" />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1e40af', margin: 0 }}>Next Visit Scheduled</p>
                <p style={{ fontSize: 14, color: '#3b82f6', margin: '2px 0 0' }}>
                  {new Date(nextJob.scheduled_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {' at '}
                  {new Date(nextJob.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Review request */}
        {org?.review_link && (
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px 22px', marginBottom: 20, textAlign: 'center' }}>
            <Star size={28} color="#f59e0b" style={{ margin: '0 auto 10px' }} />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>How did we do?</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>
              We'd love to hear your feedback. A quick review means the world to our small team.
            </p>
            <a href={org.review_link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#f59e0b', color: '#ffffff', textDecoration: 'none', fontWeight: 600, fontSize: 14, padding: '12px 28px', borderRadius: 8 }}>
              Leave a Review
            </a>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', margin: '32px 0 0' }}>
          Summary prepared by <strong style={{ color: '#6b7280' }}>{companyName}</strong> · Powered by Cleerd
        </p>
      </main>
    </div>
  )
}
