import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { CheckSquare, CheckCircle, XCircle, Camera } from 'lucide-react'

export default async function ClientReportPage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, properties(name, address), inspection_photos(*), checklist_items(*)')
    .eq('share_token', params.token)
    .single()

  if (!inspection) notFound()
  if (!inspection.ai_report) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center px-4">
          <CheckSquare className="h-10 w-10 text-blue-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Report Not Ready</h1>
          <p className="text-gray-400">This inspection hasn't been completed yet. Check back soon.</p>
        </div>
      </div>
    )
  }

  const property = inspection.properties as any
  const photos = (inspection.inspection_photos as any[]) ?? []
  const checklist = (inspection.checklist_items as any[]) ?? []
  const completedCount = checklist.filter((c: any) => c.completed).length
  const score = inspection.overall_score

  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'
  const scoreBg = score >= 80 ? 'bg-green-500/10 border-green-500/30' : score >= 60 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'

  // Generate signed URLs for photos
  const photoUrls: Record<string, string> = {}
  for (const photo of photos) {
    const { data } = await supabase.storage.from('inspection-photos').createSignedUrl(photo.storage_path, 3600)
    if (data?.signedUrl) photoUrls[photo.id] = data.signedUrl
  }

  const beforePhotos = photos.filter(p => p.photo_type === 'before')
  const afterPhotos = photos.filter(p => p.photo_type === 'after')
  const issuePhotos = photos.filter(p => p.photo_type === 'issue')

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#161b27] px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-bold text-white">CleanCheck</span>
          </div>
          <span className="text-sm text-gray-400">Quality Report</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        {/* Title block */}
        <div className="rounded-xl border border-white/10 bg-[#161b27] p-6">
          <h1 className="text-2xl font-bold text-white mb-1">{property?.name ?? 'Cleaning Inspection'}</h1>
          {property?.address && <p className="text-gray-400 text-sm">{property.address}</p>}
          <p className="text-gray-500 text-sm mt-2">
            Completed {new Date(inspection.completed_at ?? inspection.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Score */}
        {score != null && (
          <div className={`rounded-xl border p-6 text-center ${scoreBg}`}>
            <p className="text-sm text-gray-400 mb-2">Overall Quality Score</p>
            <div className="text-6xl font-bold mb-1" style={{ color: scoreColor }}>{score}%</div>
            <p className="text-gray-400 text-sm">
              {score >= 90 ? 'Excellent — outstanding quality' : score >= 80 ? 'Great — high quality clean' : score >= 60 ? 'Good — meets standards' : 'Needs improvement'}
            </p>
          </div>
        )}

        {/* AI Report */}
        <div className="rounded-xl border border-white/10 bg-[#161b27] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Inspector Notes</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{inspection.ai_report}</p>
        </div>

        {/* Checklist */}
        {checklist.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#161b27] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Checklist</h2>
              <span className="text-sm text-gray-400">{completedCount}/{checklist.length} completed</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 mb-4">
              <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.round((completedCount / checklist.length) * 100)}%` }} />
            </div>
            <ul className="space-y-2">
              {checklist.map((item: any) => (
                <li key={item.id} className="flex items-center gap-3">
                  {item.completed
                    ? <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-400" />
                    : <XCircle className="h-4 w-4 flex-shrink-0 text-red-400" />}
                  <span className={`text-sm ${item.completed ? 'text-gray-300' : 'text-gray-500 line-through'}`}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#161b27] p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-400" /> Photos
            </h2>
            <div className="space-y-6">
              {[
                { label: 'After', photos: afterPhotos, labelClass: 'bg-green-500/20 text-green-300' },
                { label: 'Before', photos: beforePhotos, labelClass: 'bg-blue-500/20 text-blue-300' },
                { label: 'Issues', photos: issuePhotos, labelClass: 'bg-red-500/20 text-red-300' },
              ].filter(g => g.photos.length > 0).map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${group.labelClass}`}>{group.label}</span>
                    <span className="text-xs text-gray-500">{group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {group.photos.map((photo: any) => (
                      <div key={photo.id} className="overflow-hidden rounded-lg border border-white/10">
                        {photoUrls[photo.id] && (
                          <img src={photoUrls[photo.id]} alt={photo.photo_type} className="h-40 w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 pb-6">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckSquare className="h-3.5 w-3.5 text-blue-400/60" />
            <span>Report generated by CleanCheck</span>
          </div>
          <p>This report was automatically generated using AI analysis of inspection photos and checklist data.</p>
        </div>
      </main>
    </div>
  )
}
