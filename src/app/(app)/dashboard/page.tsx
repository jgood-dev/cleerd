import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ClipboardCheck, CheckCircle, AlertTriangle, TrendingUp, Calendar, RefreshCw } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: org } = await supabase.from('organizations').select('*').eq('owner_id', user!.id).single()

  // Today's jobs
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const { data: todayJobs } = await supabase
    .from('jobs')
    .select('*, properties(name, address), teams(name), inspections(id)')
    .eq('org_id', org?.id)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at')

  const { data: inspections } = await supabase
    .from('inspections')
    .select('*, properties(name)')
    .eq('org_id', org?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { count: totalInspections } = await supabase
    .from('inspections').select('*', { count: 'exact', head: true }).eq('org_id', org?.id)

  const { count: completedThisMonth } = await supabase
    .from('inspections').select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id).eq('status', 'completed')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const { count: pendingCount } = await supabase
    .from('inspections').select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id).eq('status', 'in_progress')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">{org?.name}</p>
        </div>
        <Link href="/schedule?new=1">
          <Button><ClipboardCheck className="mr-2 h-4 w-4" />Schedule Job</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: ClipboardCheck, label: 'Total Jobs', value: totalInspections ?? 0, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/inspections?filter=all' },
          { icon: CheckCircle, label: 'Completed This Month', value: completedThisMonth ?? 0, color: 'text-green-400', bg: 'bg-green-500/10', href: '/inspections?filter=done' },
          { icon: AlertTriangle, label: 'In Progress', value: pendingCount ?? 0, color: 'text-yellow-400', bg: 'bg-yellow-500/10', href: '/inspections?filter=in_progress' },
        ].map(({ icon: Icon, label, value, color, bg, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:bg-white/5 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg ${bg} p-3`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{label}</p>
                  <p className="text-2xl font-bold text-white">{value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Today's Jobs
            </CardTitle>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {!todayJobs?.length ? (
            <div className="py-6 text-center">
              <p className="text-gray-500 text-sm">No jobs scheduled for today.</p>
              <Link href="/schedule?new=1">
                <Button className="mt-3" variant="outline" size="sm">Schedule a job</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {todayJobs.map((job: any) => {
                const property = job.properties as any
                const inspection = (job.inspections as any[])?.[0]
                const displayName = property?.address ?? property?.name ?? 'Unknown property'
                const time = new Date(job.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                const isDone = job.status === 'done'
                const isInProgress = job.status === 'in_progress'
                return (
                  <div key={job.id} className="flex items-center justify-between py-3 px-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium truncate ${isDone ? 'text-gray-500 line-through' : 'text-gray-100'}`}>{displayName}</p>
                        {job.recurrence && <RefreshCw className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-500">
                        {time}
                        {(job.teams as any)?.name && <span className="mx-1.5 text-gray-600">·</span>}
                        {(job.teams as any)?.name}
                        {job.duration_minutes && <span className="mx-1.5 text-gray-600">·</span>}
                        {job.duration_minutes && `${Math.floor(job.duration_minutes / 60)}h${job.duration_minutes % 60 ? ` ${job.duration_minutes % 60}m` : ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Badge variant={isDone ? 'success' : isInProgress ? 'warning' : 'default'}>
                        {isDone ? 'Done' : isInProgress ? 'In Progress' : 'Scheduled'}
                      </Badge>
                      {inspection
                        ? <Link href={`/inspections/${inspection.id}`}><Button size="sm" variant="ghost" className="text-xs">View</Button></Link>
                        : <Link href="/schedule"><Button size="sm" variant="ghost" className="text-xs text-gray-500">Schedule</Button></Link>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Jobs</CardTitle></CardHeader>
        <CardContent>
          {!inspections?.length ? (
            <div className="py-8 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-gray-600" />
              <p className="text-gray-400">No jobs yet.</p>
              <Link href="/schedule?new=1">
                <Button className="mt-4" variant="outline">Schedule your first job</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {inspections.map(inspection => (
                <Link key={inspection.id} href={`/inspections/${inspection.id}`}
                  className="flex items-center justify-between py-3 px-2 hover:bg-white/5 rounded-lg transition-colors">
                  <div>
                    <p className="font-medium text-gray-100">{(inspection.properties as any)?.name ?? 'No property'}</p>
                    <p className="text-sm text-gray-500">{new Date(inspection.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={inspection.status === 'completed' ? 'success' : inspection.status === 'report_sent' ? 'default' : 'warning'}>
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
