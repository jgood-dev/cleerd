'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Link from 'next/link'
import { FileText, Trash2 } from 'lucide-react'
import { getOrgForUser } from '@/lib/get-org'

export default function ReportsPage() {
  const supabase = createClient()
  const [inspections, setInspections] = useState<any[]>([])
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { org, isOwner, memberTeamId } = await getOrgForUser(supabase, user!.id, user!.email)
    if (!org) return
    const query = supabase
      .from('inspections')
      .select('*, properties(name, address), jobs(team_id)')
      .eq('org_id', org.id)
      .not('ai_report', 'is', null)
      .order('completed_at', { ascending: false })
    const { data } = await query
    const filtered = (!isOwner && memberTeamId)
      ? (data ?? []).filter((i: any) => (i.jobs as any)?.team_id === memberTeamId)
      : (data ?? [])
    setInspections(filtered)
  }

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>
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
                const property = i.properties as any
                const displayName = property?.address ?? property?.name ?? 'Unknown Property'
                return (
                  <div key={i.id} className="flex items-center justify-between py-4 px-2 rounded-lg hover:bg-white/5 group">
                    <Link href={`/inspections/${i.id}`} className="flex-1 min-w-0 mr-4">
                      <p className="font-medium text-gray-100">{displayName}</p>
                      <p className="text-sm text-gray-400">{i.completed_at ? new Date(i.completed_at).toLocaleDateString() : '—'}</p>
                    </Link>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {i.overall_score && (
                        <span className={`text-sm font-semibold ${i.overall_score >= 80 ? 'text-green-400' : i.overall_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {i.overall_score}%
                        </span>
                      )}
                      <Badge variant={i.status === 'report_sent' ? 'success' : 'secondary'}>
                        {i.status === 'report_sent' ? 'Sent' : 'Not sent'}
                      </Badge>
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
