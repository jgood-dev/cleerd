'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Sparkles, Send, CheckSquare, Square, Loader2, CheckCircle, Trash2, MessageSquare, DollarSign } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

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
  const [clientNote, setClientNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [job, setJob] = useState<any>(null)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [dialog, setDialog] = useState<{ title: string; message: string; confirmLabel?: string; destructive?: boolean; onConfirm: () => void } | null>(null)

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
    setClientNote(insp?.client_note ?? '')
    if (insp?.job_id) {
      const { data: j } = await supabase.from('jobs').select('id, paid_at, invoice_sent_at, price, payment_method').eq('id', insp.job_id).single()
      setJob(j)
      if (j && !j.paid_at) {
        setPaymentAmount(j.price != null ? String(j.price) : '')
        setPaymentMethod(j.payment_method ?? '')
      }
    }
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

  function deletePhoto(photo: any) {
    setDialog({
      title: 'Delete photo?',
      message: 'This photo will be permanently removed.',
      onConfirm: async () => {
        await supabase.storage.from('inspection-photos').remove([photo.storage_path])
        await supabase.from('inspection_photos').delete().eq('id', photo.id)
        setPhotos(prev => prev.filter(p => p.id !== photo.id))
        setDialog(null)
      },
    })
  }

  function completeInspection() {
    setDialog({
      title: 'Mark job as complete?',
      message: 'The job will be marked complete. You can still add photos and generate a report.',
      confirmLabel: 'Complete',
      destructive: false,
      onConfirm: async () => {
        await supabase.from('inspections').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
        setDialog(null)
        await load()
      },
    })
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

  async function saveClientNote() {
    setSavingNote(true)
    await supabase.from('inspections').update({ client_note: clientNote || null }).eq('id', id)
    setSavingNote(false)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  async function markAsPaid() {
    if (!job?.id) return
    setMarkingPaid(true)
    const res = await fetch('/api/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        amount: paymentAmount ? parseFloat(paymentAmount) : null,
        paymentMethod: paymentMethod || null,
      }),
    })
    setMarkingPaid(false)
    if (res.ok) {
      await load()
    } else {
      alert('Failed to send invoice. Check that your Resend API key is set.')
    }
  }

  async function sendReport() {
    const clientEmail = (inspection?.properties as any)?.client_email
    if (!clientEmail) {
      alert('No client email on this client. Add one in Settings → Clients.')
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
              <CheckCircle className="mr-2 h-4 w-4" /> Mark Complete
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

      {/* Client Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-400" /> Client Summary
            </CardTitle>
            <Badge variant={inspection.status === 'report_sent' ? 'success' : 'secondary'}>
              {inspection.status === 'report_sent' ? 'Sent' : 'Not sent'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">This is what gets sent to the client — checklist, after photos, issues noted, and your personal note. The AI quality report stays internal.</p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Note to client <span className="text-gray-500 font-normal">(optional)</span></label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Everything came out great today! We noticed the grout near the master bath could use a deep clean — let us know if you'd like to add that next visit."
              value={clientNote}
              onChange={e => setClientNote(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={saveClientNote} disabled={savingNote}>
              {savingNote ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              {savingNote ? 'Saving…' : 'Save note'}
            </Button>
            {noteSaved && <span className="text-sm text-green-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Saved</span>}
            <Button onClick={sendReport} disabled={reportSent}>
              <Send className="mr-2 h-4 w-4" />
              {reportSent ? 'Sent' : inspection.status === 'report_sent' ? 'Resend to Client' : 'Send to Client'}
            </Button>
            {reportSent && <span className="text-sm text-green-400 flex items-center gap-1.5"><CheckCircle className="h-4 w-4" /> Sent successfully</span>}
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      {job && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-400" /> Payment
              </CardTitle>
              {job.paid_at && (
                <Badge variant="success">Paid</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.paid_at ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-400">
                  Marked as paid on {new Date(job.paid_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                  {job.invoice_sent_at && ' Invoice sent to client.'}
                </p>
                {(job.price != null || job.payment_method) && (
                  <p className="text-sm text-gray-500">
                    {job.price != null && <span className="text-green-400 font-semibold">${Number(job.price).toFixed(2)}</span>}
                    {job.price != null && job.payment_method && <span> · </span>}
                    {job.payment_method && <span>{job.payment_method}</span>}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Amount</label>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number" min="0" step="0.01" placeholder="0.00"
                        className="flex h-9 w-32 rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 pl-6 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Payment method</label>
                    <select
                      className="flex h-9 rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                    >
                      <option value="">Not specified</option>
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Venmo">Venmo</option>
                      <option value="Zelle">Zelle</option>
                      <option value="Card">Card</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <Button onClick={markAsPaid} disabled={markingPaid} variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                  {markingPaid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                  {markingPaid ? 'Sending…' : 'Mark as Paid & Send Invoice'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-400" onClick={() => setDialog({
                title: 'Delete report?',
                message: 'The AI report and score will be cleared. The inspection will remain and you can regenerate.',
                onConfirm: async () => {
                  await supabase.from('inspections').update({ ai_report: null, overall_score: null, status: 'in_progress', completed_at: null }).eq('id', id)
                  setReportSent(false)
                  setDialog(null)
                  await load()
                },
              })}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel}
        destructive={dialog?.destructive}
        onConfirm={dialog?.onConfirm ?? (() => {})}
        onCancel={() => setDialog(null)}
      />
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
