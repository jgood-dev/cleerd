import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user!.id).single()

  const { data: inspections } = await supabase
    .from('inspections')
    .select('*, properties(name)')
    .eq('org_id', org?.id)
    .not('ai_report', 'is', null)
    .order('completed_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      <Card>
        <CardHeader><CardTitle>Completed Reports</CardTitle></CardHeader>
        <CardContent>
          {!inspections?.length ? (
            <div className="py-12 text-center text-gray-500">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p>No reports yet. Complete an inspection and generate an AI report.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {inspections.map(i => (
                <Link key={i.id} href={`/inspections/${i.id}`} className="flex items-center justify-between py-4 px-2 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{(i.properties as any)?.name ?? 'Unknown Property'}</p>
                    <p className="text-sm text-gray-500">{i.completed_at ? new Date(i.completed_at).toLocaleDateString() : '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {i.overall_score && (
                      <span className={`text-sm font-semibold ${i.overall_score >= 80 ? 'text-green-600' : i.overall_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {i.overall_score}%
                      </span>
                    )}
                    <Badge variant={i.status === 'report_sent' ? 'success' : 'secondary'}>
                      {i.status === 'report_sent' ? 'Sent' : 'Not sent'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
