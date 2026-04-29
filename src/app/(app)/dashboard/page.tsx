import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ClipboardCheck, CheckCircle, AlertTriangle, Calendar, RefreshCw, MapPin, PackageCheck, Users, CreditCard, Settings, ArrowRight } from 'lucide-react'
import { getOrgForUser } from '@/lib/get-org'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { org, isOwner, memberTeamId } = await getOrgForUser(supabase, user!.id, user!.email)

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

  let todayJobsQuery = supabase
    .from('jobs')
    .select('*, properties(name, address), teams(name), inspections(id)')
    .eq('org_id', org?.id)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at')
  if (!isOwner && memberTeamId) todayJobsQuery = todayJobsQuery.eq('team_id', memberTeamId)

  // For members, get their team's job IDs to scope inspection stats
  let teamJobIds: string[] | null = null
  if (!isOwner && memberTeamId) {
    const { data: teamJobs } = await supabase.from('jobs').select('id').eq('team_id', memberTeamId)
    teamJobIds = teamJobs?.map((j: any) => j.id) ?? []
  }

  let statsQuery = supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('org_id', org?.id)
  let completedQuery = supabase.from('inspections').select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id).eq('status', 'completed')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  let pendingQuery = supabase.from('inspections').select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id).eq('status', 'in_progress')

  if (teamJobIds) {
    statsQuery = statsQuery.in('job_id', teamJobIds.length ? teamJobIds : [''])
    completedQuery = completedQuery.in('job_id', teamJobIds.length ? teamJobIds : [''])
    pendingQuery = pendingQuery.in('job_id', teamJobIds.length ? teamJobIds : [''])
  }

  const [
    { data: todayJobs },
    { count: totalInspections },
    { count: completedThisMonth },
    { count: pendingCount },
    { count: clientCount },
    { count: templateCount },
    { count: teamCount },
  ] = await Promise.all([
    todayJobsQuery,
    statsQuery,
    completedQuery,
    pendingQuery,
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('org_id', org?.id),
    supabase.from('packages').select('*', { count: 'exact', head: true }).eq('org_id', org?.id),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('org_id', org?.id),
  ])

  const hasBillingSetup = Boolean(org?.stripe_customer_id || org?.subscription_status === 'active' || org?.subscription_status === 'trialing')
  const hasClientCommunicationSetup = Boolean(org?.review_link || org?.reminder_lead_hours)
  const setupTasks = [
    {
      title: 'Add your first client location',
      description: 'Store the contact, address, access notes, and email needed to send polished job updates.',
      href: '/settings/properties',
      icon: MapPin,
      done: (clientCount ?? 0) > 0,
    },
    {
      title: 'Create a service template',
      description: 'Turn repeat work into a reusable checklist so every crew follows the same standard.',
      href: '/settings/packages',
      icon: PackageCheck,
      done: (templateCount ?? 0) > 0,
    },
    {
      title: 'Set up a field team',
      description: 'Assign jobs to a crew or technician so the schedule is ready for real work.',
      href: '/teams',
      icon: Users,
      done: (teamCount ?? 0) > 0,
    },
    {
      title: 'Configure reminders and reviews',
      description: 'Automate client reminders and collect more Google reviews from completed jobs.',
      href: '/settings/business',
      icon: Settings,
      done: hasClientCommunicationSetup,
    },
    {
      title: 'Choose your launch plan',
      description: 'Connect billing early so the business can keep running after the free trial.',
      href: '/settings/billing',
      icon: CreditCard,
      done: hasBillingSetup,
    },
  ]
  const completedSetupTasks = setupTasks.filter(task => task.done).length
  const setupProgress = Math.round((completedSetupTasks / setupTasks.length) * 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">{org?.name}</p>
        </div>
        {isOwner && (
          <Link href="/schedule?new=1">
            <Button><ClipboardCheck className="mr-2 h-4 w-4" />Schedule Job</Button>
          </Link>
        )}
      </div>

      {isOwner && completedSetupTasks < setupTasks.length && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-400" />
                  Launch Checklist
                </CardTitle>
                <p className="mt-1 text-sm text-gray-400">Finish these setup steps to turn Cleerd into a sellable, repeatable operating system for your service business.</p>
              </div>
              <div className="min-w-[130px] rounded-lg border border-white/10 bg-[#161b27] px-3 py-2 text-center">
                <p className="text-2xl font-bold text-white">{setupProgress}%</p>
                <p className="text-xs text-gray-500">ready to launch</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {setupTasks.map(({ title, description, href, icon: Icon, done }) => (
                <Link key={title} href={href} className="group rounded-xl border border-white/10 bg-[#161b27] p-4 transition-colors hover:border-blue-500/40 hover:bg-white/5">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${done ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                      {done ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Icon className="h-4 w-4 text-blue-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-100'}`}>{title}</p>
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-600 transition-colors group-hover:text-blue-400" />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: ClipboardCheck, label: 'Total Jobs', value: totalInspections ?? 0, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10', border: 'border-blue-500/20', href: '/inspections?filter=all' },
          { icon: CheckCircle, label: 'Completed This Month', value: completedThisMonth ?? 0, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10', border: 'border-emerald-500/20', href: '/inspections?filter=done' },
          { icon: AlertTriangle, label: 'In Progress', value: pendingCount ?? 0, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10', border: 'border-amber-500/20', href: '/inspections?filter=in_progress' },
        ].map(({ icon: Icon, label, value, iconColor, iconBg, border, href }) => (
          <Link key={label} href={href}>
            <div className={`rounded-xl border ${border} bg-[#161b27] p-6 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer`}>
              <div className={`rounded-lg ${iconBg} p-3 flex-shrink-0`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            </div>
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
              {isOwner && (
                <Link href="/schedule?new=1">
                  <Button className="mt-3" variant="outline" size="sm">Schedule a job</Button>
                </Link>
              )}
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
                        : <Link href="/schedule?new=1"><Button size="sm" variant="ghost" className="text-xs text-gray-500">Schedule</Button></Link>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
