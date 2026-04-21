'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Sparkles, Send, CheckSquare, Square, Loader2, CheckCircle, Trash2 } from 'lucide-react'

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const beforeRef = useRef<HTMLInputElement>(null)
  const afterRef = useRef<HTMLInputElement>(null)
  const issueRef = useRef<HTMLInputElement>(null)

  const [inspection, setInspection] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [checklist, setChecklist] = useState<any[]>([])
  const [generatingReport, setGeneratingReport] = useState(false)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [reportSent, setReportSent] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: insp }, { data: ph }, { data: cl }] = await Promise.all([
      supabase.from('inspections').select('*, properties(name, client_email), teams(name)').eq('id', id).single(),
      supabase.from('inspection_photos').select('*').eq('inspection_id', id).order('created_at'),
      supabase.from('checklist_items').select('*').eq('inspection_id', id).order('created_at'),
    ])
    setInspection(insp)
    setPhotos(ph ?? [])
    setChecklist(cl ?? [])
  }

  async function toggleChecklist(item: any) {
    await supabase.from('checklist_items').update({ completed: !item.completed }).eq('id', item.id)
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c))
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>, photoType: 'before' | 'after' | 'issue') {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingType(photoType)
    const path = `${id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('inspection-photos').upload(path, file)
    if (!error) {
      await supabase.from('inspection_photos').insert({ inspection_id: id, storage_path: path, photo_type: photoType })
      await load()
    }
    setUploadingType(null)
    e.target.value = ''
  }

  async function deletePhoto(photo: any) {
    if (!confirm('Delete this photo?')) return
    await supabase.storage.from('inspection-photos').remove([photo.storage_path])
    await supabase.from('inspection_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  async function completeInspection() {
    if (!confirm('Mark this inspection as complete?')) return
    await supabase.from('inspections').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  async function generateReport() {
    setGeneratingReport(true)
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId: id }),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Report generation failed: ${data.error}`)
        return
      }
      if (data.report) {
        await supabase.from('inspections').update({
          ai_report: data.report,
          overall_score: data.score,
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', id)
        await load()
      }
    } catch (err) {
      alert('Report generation failed. Please try again.')
    } finally {
      setGeneratingReport(false)
    }
  }

  async function sendReport() {
    const clientEmail = inspection?.properties?.client_email
    if (!clientEmail) {
      alert('No client email on this property. Add one in Settings → Properties.')
      return
    }
    const res = await fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionId: id }),
    })
    if (res.ok) {
      await supabase.from('inspections').update({ status: 'report_sent' }).eq('id', id)
      setReportSent(true)
      await load()
    } else {
      alert('Failed to send report. Check that your Resend API key is set in Vercel.')
    }
  }

  if (!inspection) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )

  const completedItems = checklist.filter(c => c.completed).length
  const checklistScore = checklist.length > 0 ? Math.round((completedItems / checklist.length) * 100) : 0
  const beforePhotos = photos.filter(p => p.photo_type === 'before')
  const afterPhotos = photos.filter(p => p.photo_type === 'after')
  const issuePhotos = photos.filter(p => p.photo_type === 'issue')
  const isInProgress = inspection.status === 'in_progress'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{inspection.properties?.name ?? 'Inspection'}</h1>
          <p className="text-gray-400">
            {inspection.teams?.name ?? 'No team'} · {new Date(inspection.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={inspection.status === 'completed' ? 'success' : inspection.status === 'report_sent' ? 'default' : 'warning'}>
            {inspection.status.replace('_', ' ')}
          </Badge>
          {isInProgress && (
            <Button size="sm" variant="outline" onClick={completeInspection} className="border-green-500/30 text-green-400 hover:bg-green-500/10">
              <CheckCircle className="mr-2 h-4 w-4" /> Complete
            </Button>
          )}
        </div>
      </div>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Checklist</CardTitle>
            <span className="text-sm text-gray-500">{completedItems}/{checklist.length} · {checklistScore}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${checklistScore}%` }} />
          </div>
        </CardHeader>
        <CardContent>
          {checklist.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No checklist items.</p>
          ) : (
            <ul className="space-y-2">
              {checklist.map(item => (
                <li key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-white/5"
                  onClick={() => toggleChecklist(item)}>
                  {item.completed
                    ? <CheckSquare className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    : <Square className="h-5 w-5 text-gray-500 flex-shrink-0" />}
                  <span className={item.completed ? 'text-gray-500 line-through' : 'text-gray-200'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Photos — 3 sections */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {([
          { type: 'before' as const, label: 'Before', ref: beforeRef, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { type: 'after' as const, label: 'After', ref: afterRef, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
          { type: 'issue' as const, label: 'Issues', ref: issueRef, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
        ]).map(({ type, label, ref, color, bg, border }) => {
          const sectionPhotos = type === 'before' ? beforePhotos : type === 'after' ? afterPhotos : issuePhotos
          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${color}`}>{label}</span>
                    <span className="text-xs text-gray-500">{sectionPhotos.length}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => ref.current?.click()}
                    disabled={uploadingType === type}
                    className="h-7 px-2 text-xs text-gray-400 hover:text-white"
                  >
                    {uploadingType === type
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Camera className="h-3.5 w-3.5" />}
                  </Button>
                  <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => uploadPhoto(e, type)} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {sectionPhotos.length === 0 ? (
                  <button
                    onClick={() => ref.current?.click()}
                    className={`w-full rounded-lg border border-dashed ${border} ${bg} py-6 flex flex-col items-center gap-2 text-xs ${color} hover:opacity-80 transition-opacity`}
                  >
                    <Camera className="h-5 w-5" />
                    Add {label.toLowerCase()} photos
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {sectionPhotos.map(photo => (
                      <PhotoThumb key={photo.id} photo={photo} supabase={supabase} onDelete={deletePhoto} />
                    ))}
                    <button
                      onClick={() => ref.current?.click()}
                      className={`rounded-lg border border-dashed ${border} ${bg} flex items-center justify-center h-20 ${color} hover:opacity-80 transition-opacity`}
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* AI Report */}
      <Card>
        <CardHeader><CardTitle>AI Quality Report</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {inspection.ai_report ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg font-bold text-gray-100">Score:</span>
                <span className={`text-2xl font-bold ${inspection.overall_score >= 80 ? 'text-green-400' : inspection.overall_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {inspection.overall_score}%
                </span>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-sm text-gray-300 whitespace-pre-wrap">
                {inspection.ai_report}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Generate a report based on your photos and checklist. The inspection will be marked complete.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={generateReport} disabled={generatingReport} variant={inspection.ai_report ? 'outline' : 'default'}>
              {generatingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {generatingReport ? 'Generating...' : inspection.ai_report ? 'Regenerate Report' : 'Generate AI Report'}
            </Button>
            {inspection.ai_report && (
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-400" onClick={async () => {
                if (!confirm('Delete this report? The inspection will remain but the AI report and score will be cleared.')) return
                await supabase.from('inspections').update({ ai_report: null, overall_score: null, status: 'in_progress', completed_at: null }).eq('id', id)
                setReportSent(false)
                await load()
              }}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete report
              </Button>
            )}
            {inspection.ai_report && (
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={sendReport} disabled={reportSent}>
                  <Send className="mr-2 h-4 w-4" />
                  {reportSent ? 'Sent' : inspection.status === 'report_sent' ? 'Resend to Client' : 'Send to Client'}
                </Button>
                {reportSent && (
                  <span className="flex items-center gap-1.5 text-sm text-green-400">
                    <CheckCircle className="h-4 w-4" /> Report sent successfully
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PhotoThumb({ photo, supabase, onDelete }: { photo: any, supabase: any, onDelete: (photo: any) => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    supabase.storage.from('inspection-photos').createSignedUrl(photo.storage_path, 3600)
      .then(({ data }: any) => { if (data?.signedUrl) setUrl(data.signedUrl) })
  }, [photo.storage_path])

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 h-20 group">
      {url
        ? <img src={url} alt="" className="h-full w-full object-cover" />
        : <div className="h-full w-full bg-white/5 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-gray-500" /></div>
      }
      <button
        onClick={() => onDelete(photo)}
        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-5 w-5 text-red-400" />
      </button>
    </div>
  )
}
