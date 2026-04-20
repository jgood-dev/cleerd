import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function InspectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: inspections } = await supabase
    .from('inspections')
    .select('*, properties(name), teams(name)')
    .eq('org_id', org?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Inspections</h1>
        <Link href="/inspections/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Inspection
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          {!inspections?.length ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No inspections yet. Start one to begin tracking quality.</p>
              <Link href="/inspections/new">
                <Button className="mt-4">Create first inspection</Button>
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
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {inspections.map(i => (
                    <tr key={i.id} className="hover:bg-white/5">
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
                        <Badge variant={i.status === 'completed' ? 'success' : i.status === 'report_sent' ? 'default' : 'warning'}>
                          {i.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Link href={`/inspections/${i.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
