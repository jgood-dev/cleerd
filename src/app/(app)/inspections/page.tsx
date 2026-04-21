'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Trash2, Mail, MailCheck } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function InspectionsPage() {
  const supabase = createClient()
  const [inspections, setInspections] = useState<any[]>([])
  const [orgId, setOrgId] = useState('')
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user!.id).single()
    if (!org) return
    setOrgId(org.id)
    const { data } = await supabase
      .from('inspections')
      .select('*, properties(name), teams(name)')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
    setInspections(data ?? [])
  }

  function deleteInspection(id: string) {
    setDialog({
      title: 'Delete job?',
      message: 'This job and all its photos and checklist items will be permanently deleted.',
      onConfirm: async () => {
        await supabase.from('inspections').delete().eq('id', id)
        setInspections(prev => prev.filter(i => i.id !== id))
        setDialog(null)
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Jobs</h1>
        <Link href="/schedule">
          <Button><Plus className="mr-2 h-4 w-4" />Schedule Job</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>All Jobs</CardTitle></CardHeader>
        <CardContent>
          {!inspections.length ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No jobs yet. Schedule one to begin tracking quality.</p>
              <Link href="/schedule">
                <Button className="mt-4">Schedule first job</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-500">
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Team</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Date</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Report</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {inspections.map(i => (
                    <tr key={i.id} className="hover:bg-white/5 group">
                      <td className="py-3 font-medium text-gray-100">
                        {(i.properties as any)?.name ?? '—'}
                      </td>
                      <td className="py-3 text-gray-400 hidden sm:table-cell">{(i.teams as any)?.name ?? '—'}</td>
                      <td className="py-3 text-gray-400 hidden sm:table-cell">{new Date(i.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        {i.overall_score ? (
                          <span className={`font-semibold ${i.overall_score >= 80 ? 'text-green-400' : i.overall_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {i.overall_score}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3">
                        <Badge variant={i.status === 'completed' || i.status === 'report_sent' ? 'success' : 'warning'}>
                          {i.status === 'report_sent' ? 'completed' : i.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        {i.status === 'report_sent'
                          ? <span className="flex items-center gap-1.5 text-xs text-green-400"><MailCheck className="h-3.5 w-3.5" />Sent</span>
                          : i.status === 'completed'
                          ? <span className="flex items-center gap-1.5 text-xs text-gray-500"><Mail className="h-3.5 w-3.5" />Not sent</span>
                          : <span className="text-xs text-gray-600">—</span>}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/inspections/${i.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteInspection(i.id)}
                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
