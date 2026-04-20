import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ClipboardCheck, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user!.id)
    .single()

  const { data: inspections } = await supabase
    .from('inspections')
    .select('*, properties(name)')
    .eq('org_id', org?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { count: totalInspections } = await supabase
    .from('inspections')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id)

  const { count: completedThisMonth } = await supabase
    .from('inspections')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id)
    .eq('status', 'completed')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const { count: pendingCount } = await supabase
    .from('inspections')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id)
    .eq('status', 'in_progress')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">{org?.name}</p>
        </div>
        <Link href="/inspections/new">
          <Button>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            New Inspection
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-50 p-3">
              <ClipboardCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Inspections</p>
              <p className="text-2xl font-bold text-gray-900">{totalInspections ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-50 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed This Month</p>
              <p className="text-2xl font-bold text-gray-900">{completedThisMonth ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-yellow-50 p-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          {!inspections?.length ? (
            <div className="py-8 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-500">No inspections yet.</p>
              <Link href="/inspections/new">
                <Button className="mt-4" variant="outline">Start your first inspection</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {inspections.map(inspection => (
                <Link
                  key={inspection.id}
                  href={`/inspections/${inspection.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {(inspection.properties as any)?.name ?? 'No property'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(inspection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      inspection.status === 'completed' ? 'success' :
                      inspection.status === 'report_sent' ? 'default' : 'warning'
                    }
                  >
                    {inspection.status.replace('_', ' ')}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
