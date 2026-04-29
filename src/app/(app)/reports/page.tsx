'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Link from 'next/link'
import { AlertCircle, ArrowRight, CheckCircle, ExternalLink, FileText, Send, Trash2 } from 'lucide-react'
import { getOrgForUser } from '@/lib/get-org'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

type ReportInspection = {
  id: string
  status: string | null
  ai_report?: string | null
  overall_score?: number | null
  completed_at?: string | null
  created_at?: string | null
  share_token?: string | null
  properties?: {
    name?: string | null
    address?: string | null
    client_email?: string | null
  } | null
  jobs?: {
    team_id?: string | null
  } | null
}

function getDisplayName(inspection: ReportInspection) {
  return inspection.properties?.address ?? inspection.properties?.name ?? 'Unknown Client'
}

function getClientEmail(inspection: ReportInspection) {
  return inspection.properties?.client_email ?? undefined
}

export default function ReportsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [inspections, setInspections] = useState<ReportInspection[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { org, isOwner, memberTeamId } = await getOrgForUser(supabase, user.id, user.email)
    if (!org) return
    const query = supabase
      .from('inspections')
      .select('*, properties(name, address, client_email), jobs(team_id)')
      .eq('org_id', org.id)
      .not('ai_report', 'is', null)
      .order('completed_at', { ascending: false })
    const { data } = await query
    const filtered = (!isOwner && memberTeamId)
      ? ((data ?? []) as ReportInspection[]).filter(i => i.jobs?.team_id === memberTeamId)
      : ((data ?? []) as ReportInspection[])
    const prioritized = [...filtered].sort((a, b) => {
      const aSent = a.status === 'report_sent'
      const bSent = b.status === 'report_sent'
      if (aSent !== bSent) return aSent ? 1 : -1
      return new Date(b.completed_at ?? b.created_at ?? 0).getTime() - new Date(a.completed_at ?? a.created_at ?? 0).getTime()
    })
    setInspections(prioritized)
  }, [supabase])

  async function previewReport(inspection: ReportInspection) {
    setPreviewingId(inspection.id)
    let token = inspection.share_token
    if (!token) {
      token = crypto.randomUUID()
      const { error } = await supabase.from('inspections').update({ share_token: token }).eq('id', inspection.id)
      if (error) {
        setPreviewingId(null)
        alert('Could not create preview link. Please try again.')
        return
      }
      setInspections(prev => prev.map(i => i.id === inspection.id ? { ...i, share_token: token } : i))
    }
    setPreviewingId(null)
    window.open(`/report/${token}`, '_blank', 'noopener,noreferrer')
  }

  async function sendReport(inspection: ReportInspection) {
    const clientEmail = getClientEmail(inspection)
    if (!clientEmail) {
      alert('No client email on this client. Add one in Settings → Clients before sending the report.')
      return
    }
    setSendingId(inspection.id)
    const res = await fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionId: inspection.id }),
    })
    setSendingId(null)
    if (res.ok) {
      setInspections(prev => prev
        .map(i => i.id === inspection.id ? { ...i, status: 'report_sent' } : i)
        .sort((a, b) => {
          const aSent = a.status === 'report_sent'
          const bSent = b.status === 'report_sent'
          if (aSent !== bSent) return aSent ? 1 : -1
          return new Date(b.completed_at ?? b.created_at ?? 0).getTime() - new Date(a.completed_at ?? a.created_at ?? 0).getTime()
        }))
    } else {
      alert('Failed to send report. Check that your Resend API key is set in Vercel.')
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  function confirmDeleteReport(id: string) {
    setDialog({
      title: 'Delete report?',
      message: 'The AI report and score will be cleared. The job will remain and you can regenerate the report.',
      onConfirm: async () => {
        await supabase.from('inspections').update({
          ai_report: null, overall_score: null, status: 'in_progress', completed_at: null,
        }).eq('id', id)
        setInspections(prev => prev.filter(i => i.id !== id))
        setDialog(null)
      },
    })
  }

  const unsentReports = inspections.filter(i => i.status !== 'report_sent')
  const sentReports = inspections.filter(i => i.status === 'report_sent')
  const readyToSend = unsentReports.filter(i => !!getClientEmail(i))
  const missingEmailCount = unsentReports.length - readyToSend.length
  const nextReport = unsentReports[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="mt-1 text-sm text-gray-400">Find completed work that is ready for a client recap, then preview or send it before the momentum gets stale.</p>
        </div>
        <Link href="/inspections" className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300">
          Open inspections <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Ready to send</p>
            <p className="mt-2 text-3xl font-bold text-white">{readyToSend.length}</p>
            <p className="mt-1 text-xs text-gray-500">completed reports with client emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Needs email</p>
            <p className="mt-2 text-3xl font-bold text-white">{missingEmailCount}</p>
            <p className="mt-1 text-xs text-gray-500">reports blocked by missing client contact</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Already sent</p>
            <p className="mt-2 text-3xl font-bold text-white">{sentReports.length}</p>
            <p className="mt-1 text-xs text-gray-500">client recaps delivered</p>
          </CardContent>
        </Card>
      </div>

      {nextReport && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge variant="success" className="mb-3">Next report opportunity</Badge>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-400" />
                  Send the next client recap
                </CardTitle>
                <p className="mt-2 max-w-2xl text-sm text-gray-400">
                  The fastest follow-up win is usually the most recently completed job that has not reached the customer yet.
                </p>
              </div>
              <Badge variant={getClientEmail(nextReport) ? 'success' : 'secondary'}>
                {getClientEmail(nextReport) ? 'Email ready' : 'Missing client email'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#111722]/80 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-white">{getDisplayName(nextReport)}</p>
                <p className="mt-1 text-sm text-gray-400">Completed {formatDate(nextReport.completed_at)} · Score {nextReport.overall_score ?? '—'}%</p>
                {!getClientEmail(nextReport) && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-yellow-300">
                    <AlertCircle className="h-4 w-4" /> Add a client email before this report can be sent.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => previewReport(nextReport)} disabled={previewingId === nextReport.id}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Preview
                </Button>
                {getClientEmail(nextReport) ? (
                  <Button size="sm" onClick={() => sendReport(nextReport)} disabled={sendingId === nextReport.id}>
                    <Send className="mr-2 h-4 w-4" /> {sendingId === nextReport.id ? 'Sending…' : 'Send report'}
                  </Button>
                ) : (
                  <Link href="/settings/properties" className="inline-flex h-7 items-center justify-center rounded-lg border border-white/10 px-2.5 text-[0.8rem] font-medium text-gray-200 transition-colors hover:bg-white/5">
                    Add email
                  </Link>
                )}
                <Link href={`/inspections/${nextReport.id}`} className="inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-[0.8rem] font-medium text-blue-300 transition-colors hover:bg-blue-500/10">
                  Open details
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Completed Reports</CardTitle></CardHeader>
        <CardContent>
          {!inspections.length ? (
            <div className="py-12 text-center text-gray-400">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-600" />
              <p>No reports yet. Complete a job visit and generate a quality report.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {inspections.map(i => {
                const displayName = getDisplayName(i)
                const clientEmail = getClientEmail(i)
                const isSent = i.status === 'report_sent'
                return (
                  <div key={i.id} className="flex flex-col gap-3 py-4 px-2 rounded-lg hover:bg-white/5 group lg:flex-row lg:items-center lg:justify-between">
                    <Link href={`/inspections/${i.id}`} className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-100">{displayName}</p>
                        <Badge variant={isSent ? 'success' : 'secondary'}>
                          {isSent ? 'Sent' : 'Not sent'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">Completed {formatDate(i.completed_at)}{clientEmail ? ` · ${clientEmail}` : ' · Missing client email'}</p>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      {i.overall_score && (
                        <span className={`text-sm font-semibold ${i.overall_score >= 80 ? 'text-green-400' : i.overall_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {i.overall_score}%
                        </span>
                      )}
                      <Button variant="outline" size="sm" onClick={() => previewReport(i)} disabled={previewingId === i.id}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Preview
                      </Button>
                      {!isSent && clientEmail && (
                        <Button size="sm" onClick={() => sendReport(i)} disabled={sendingId === i.id}>
                          <Send className="mr-2 h-4 w-4" /> {sendingId === i.id ? 'Sending…' : 'Send'}
                        </Button>
                      )}
                      {!isSent && !clientEmail && (
                        <Link href="/settings/properties" className="inline-flex h-7 items-center justify-center rounded-lg border border-yellow-500/20 px-2.5 text-[0.8rem] font-medium text-yellow-300 transition-colors hover:bg-yellow-500/10">
                          Add email
                        </Link>
                      )}
                      {isSent && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                      <Button variant="ghost" size="icon" onClick={() => confirmDeleteReport(i.id)}
                        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        onConfirm={dialog?.onConfirm ?? (() => {})}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
