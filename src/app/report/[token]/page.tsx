import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { CheckCircle, Clock, Users, Calendar, Star, Camera, AlertCircle, ShieldCheck, Send, Share2 } from 'lucide-react'

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

function fmtShortDateTime(iso: string) {
  const date = new Date(iso)
  return `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
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
  const address = property?.address ?? property?.name ?? 'your property'
  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/report/${token}`
  const shareSubject = encodeURIComponent(`${companyName} completed the job at ${address}`)
  const shareBody = encodeURIComponent(`Here is the completed job summary from ${companyName}:\n\n${reportUrl}`)
  const completionRate = checklist.length ? Math.round((completedItems.length / checklist.length) * 100) : null

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-gray-800" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#161b27', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '18px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 18 }}>{companyName}</span>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>Verified Job Summary</span>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
            <ShieldCheck size={14} /> Work completed and documented
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            {ownerName ? `Hi ${ownerName} — your job is complete!` : 'Your job is complete!'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15, margin: 0 }}>
            {address} · {fmtDate(completedAt)}
          </p>
        </div>

        {/* Summary promise */}
        <div style={{ background: 'linear-gradient(135deg, #eff6ff, #ffffff)', border: '1px solid #bfdbfe', borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
          <p style={{ color: '#1e3a8a', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            This summary gives you a clean record of what was completed, who handled the visit, and any photos or notes captured by the team. If anything looks off, reply to the email that brought you here and {companyName} can take care of it.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          {/* Items completed */}
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <CheckCircle size={16} color="#22c55e" />
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Items Completed</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
              {completedItems.length}<span style={{ fontSize: 14, color: '#9ca3af', fontWeight: 400 }}>/{checklist.length}</span>
            </p>
            {completionRate !== null && <p style={{ fontSize: 12, color: '#16a34a', margin: '4px 0 0', fontWeight: 600 }}>{completionRate}% complete</p>}
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
                <img key={photo.id} src={photoUrls[photo.id]} alt="After work"
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

        {/* Next visit and rebooking */}
        <div style={{ background: nextJob ? '#eff6ff' : '#f0fdf4', border: nextJob ? '1px solid #bfdbfe' : '1px solid #bbf7d0', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Calendar size={18} color={nextJob ? '#2563eb' : '#16a34a'} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: nextJob ? '#1e40af' : '#166534', margin: 0 }}>
                {nextJob ? 'Next Visit Scheduled' : 'Need another visit?'}
              </p>
              <p style={{ fontSize: 14, color: nextJob ? '#3b82f6' : '#15803d', margin: '4px 0 0', lineHeight: 1.5 }}>
                {nextJob ? fmtShortDateTime(nextJob.scheduled_at) : `Reply to your summary email and ${companyName} can help schedule the next appointment while the details are fresh.`}
              </p>
            </div>
          </div>
        </div>

        {/* Share/referral prompt */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ background: '#eef2ff', borderRadius: 10, padding: 10, flexShrink: 0 }}>
              <Share2 size={20} color="#4f46e5" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Want to keep or share this proof of work?</h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 14px', lineHeight: 1.55 }}>
                Save this page for your records, forward it to a property manager, or share it with someone who asked who handled the job.
              </p>
              <a href={`mailto:?subject=${shareSubject}&body=${shareBody}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '11px 16px', borderRadius: 8 }}>
                <Send size={14} /> Share summary
              </a>
            </div>
          </div>
        </div>

        {/* Review request */}
        {org?.review_link && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '24px 22px', marginBottom: 20, textAlign: 'center' }}>
            <Star size={30} color="#f59e0b" style={{ margin: '0 auto 10px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Happy with the work?</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.55 }}>
              A quick review helps other customers find a team they can trust. It also helps {companyName} know what went well.
            </p>
            <a href={org.review_link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#f59e0b', color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 8 }}>
              Leave a Review
            </a>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', margin: '32px 0 0', lineHeight: 1.6 }}>
          Summary prepared by <strong style={{ color: '#6b7280' }}>{companyName}</strong> · Powered by Cleerd<br />
          Private job link with photos, tasks, and notes captured for your records.
        </p>
      </main>
    </div>
  )
}
