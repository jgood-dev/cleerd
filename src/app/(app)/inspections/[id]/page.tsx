'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Sparkles, Send, CheckSquare, Square, Loader2 } from 'lucide-react'

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [inspection, setInspection] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [checklist, setChecklist] = useState<any[]>([])
  const [generatingReport, setGeneratingReport] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoType, setPhotoType] = useState<'before' | 'after' | 'issue'>('after')

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

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)

    const path = `${id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('inspection-photos').upload(path, file)
    if (!error) {
      await supabase.from('inspection_photos').insert({
        inspection_id: id,
        storage_path: path,
        photo_type: photoType,
      })
      await load()
    }
    setUploadingPhoto(false)
    e.target.value = ''
  }

  async function getPhotoUrl(path: string) {
    const { data } = await supabase.storage.from('inspection-photos').createSignedUrl(path, 3600)
    return data?.signedUrl ?? ''
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
      if (data.report) {
        await supabase.from('inspections').update({
          ai_report: data.report,
          overall_score: data.score,
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', id)
        await load()
      }
    } finally {
      setGeneratingReport(false)
    }
  }

  async function sendReport() {
    const clientEmail = inspection?.properties?.client_email
    if (!clientEmail) {
      alert('No client email on this property. Add one in the Properties settings.')
      return
    }
    const res = await fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionId: id }),
    })
    if (res.ok) {
      await supabase.from('inspections').update({ status: 'report_sent' }).eq('id', id)
      await load()
    }
  }

  if (!inspection) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>

  const completedItems = checklist.filter(c => c.completed).length
  const checklistScore = checklist.length > 0 ? Math.round((completedItems / checklist.length) * 100) : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {inspection.properties?.name ?? 'Inspection'}
          </h1>
          <p className="text-gray-500">
            {inspection.teams?.name ?? 'No team'} · {new Date(inspection.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={inspection.status === 'completed' ? 'success' : inspection.status === 'report_sent' ? 'default' : 'warning'}>
          {inspection.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Checklist</CardTitle>
            <span className="text-sm text-gray-500">{completedItems}/{checklist.length} · {checklistScore}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${checklistScore}%` }} />
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {checklist.map(item => (
              <li key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                onClick={() => toggleChecklist(item)}>
                {item.completed
                  ? <CheckSquare className="h-5 w-5 text-blue-600" />
                  : <Square className="h-5 w-5 text-gray-400" />}
                <span className={item.completed ? 'text-gray-400 line-through' : 'text-gray-700'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Photos ({photos.length})</CardTitle>
            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={photoType}
                onChange={e => setPhotoType(e.target.value as any)}
              >
                <option value="before">Before</option>
                <option value="after">After</option>
                <option value="issue">Issue</option>
              </select>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadingPhoto}>
                {uploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                Add Photo
              </Button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadPhoto} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Camera className="mx-auto mb-2 h-10 w-10" />
              <p>No photos yet. Add before/after photos to document the job.</p>
            </div>
          ) : (
            <PhotoGrid photos={photos} getPhotoUrl={getPhotoUrl} />
          )}
        </CardContent>
      </Card>

      {/* AI Report */}
      <Card>
        <CardHeader>
          <CardTitle>AI Quality Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {inspection.ai_report ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg font-bold text-gray-900">Score:</span>
                <span className={`text-2xl font-bold ${inspection.overall_score >= 80 ? 'text-green-600' : inspection.overall_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {inspection.overall_score}%
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {inspection.ai_report}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Generate an AI report based on photos and checklist completion.</p>
          )}
          <div className="flex gap-3">
            <Button onClick={generateReport} disabled={generatingReport} variant={inspection.ai_report ? 'outline' : 'default'}>
              {generatingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {generatingReport ? 'Generating...' : inspection.ai_report ? 'Regenerate Report' : 'Generate AI Report'}
            </Button>
            {inspection.ai_report && inspection.properties?.client_email && (
              <Button variant="outline" onClick={sendReport}>
                <Send className="mr-2 h-4 w-4" />
                Send to Client
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PhotoGrid({ photos, getPhotoUrl }: { photos: any[], getPhotoUrl: (p: string) => Promise<string> }) {
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadUrls() {
      const entries = await Promise.all(photos.map(async p => [p.id, await getPhotoUrl(p.storage_path)]))
      setUrls(Object.fromEntries(entries))
    }
    loadUrls()
  }, [photos])

  const typeColor: Record<string, string> = { before: 'bg-blue-100 text-blue-700', after: 'bg-green-100 text-green-700', issue: 'bg-red-100 text-red-700' }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map(photo => (
        <div key={photo.id} className="relative overflow-hidden rounded-lg border border-gray-200">
          {urls[photo.id] ? (
            <img src={urls[photo.id]} alt={photo.photo_type} className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-36 items-center justify-center bg-gray-100">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}
          <div className="absolute bottom-2 left-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[photo.photo_type] ?? 'bg-gray-100 text-gray-700'}`}>
              {photo.photo_type}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
