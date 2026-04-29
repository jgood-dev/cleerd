import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ClipboardCheck, CheckCircle, AlertTriangle, Calendar, RefreshCw, MapPin, PackageCheck, Users, CreditCard, Settings, ArrowRight, Send, Trophy } from 'lucide-react'
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
  let scheduledJobQuery = supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('org_id', org?.id)
  let completedAnyQuery = supabase.from('inspections').select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id).in('status', ['completed', 'report_sent'])
  let sentReportQuery = supabase.from('inspections').select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id).eq('status', 'report_sent')

  if (teamJobIds) {
    statsQuery = statsQuery.in('job_id', teamJobIds.length ? teamJobIds : [''])
    completedQuery = completedQuery.in('job_id', teamJobIds.length ? teamJobIds : [''])
    pendingQuery = pendingQuery.in('job_id', teamJobIds.length ? teamJobIds : [''])
    scheduledJobQuery = scheduledJobQuery.in('id', teamJobIds.length ? teamJobIds : [''])
    completedAnyQuery = completedAnyQuery.in('job_id', teamJobIds.length ? teamJobIds : [''])
    sentReportQuery = sentReportQuery.in('job_id', teamJobIds.length ? teamJobIds : [''])
  }

  const [
    { data: todayJobs },
    { count: totalInspections },
    { count: completedThisMonth },
    { count: pendingCount },
    { count: clientCount },
    { count: templateCount },
    { count: teamCount },
    { count: scheduledJobCount },
    { count: completedAnyCount },
    { count: sentReportCount },
  ] = await Promise.all([
    todayJobsQuery,
    statsQuery,
    completedQuery,
    pendingQuery,
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('org_id', org?.id),
    supabase.from('packages').select('*', { count: 'exact', head: true }).eq('org_id', org?.id),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('org_id', org?.id),
    scheduledJobQuery,
    completedAnyQuery,
    sentReportQuery,
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

  const firstReportTasks = [
    {
      title: 'Add a client location',
      description: 'Capture the address and client email so Cleerd can send confirmations and polished reports.',
      href: '/settings/properties',
      cta: 'Add client',
      icon: MapPin,
      done: (clientCount ?? 0) > 0,
    },
    {
      title: 'Create a reusable service template',
      description: 'Save the checklist once, then reuse it for every repeat job instead of freelancing in the field.',
      href: '/settings/packages',
      cta: 'Create template',
      icon: PackageCheck,
      done: (templateCount ?? 0) > 0,
    },
    {
      title: 'Schedule the first real job',
      description: 'Put work on the calendar, assign a team, and start building the operational habit.',
      href: '/schedule?new=1',
      cta: 'Schedule job',
      icon: Calendar,
      done: (scheduledJobCount ?? 0) > 0,
    },
    {
      title: 'Complete an inspection',
      description: 'The first completed checklist creates the proof a client actually sees after the work is done.',
      href: (pendingCount ?? 0) > 0 ? '/inspections?filter=in_progress' : '/inspections',
      cta: 'Open inspections',
      icon: ClipboardCheck,
      done: (completedAnyCount ?? 0) > 0,
    },
    {
      title: 'Send the first client report',
      description: 'This is the money moment: a branded recap with proof photos, next steps, and review/rebooking prompts.',
      href: (completedAnyCount ?? 0) > 0 ? '/reports' : '/inspections',
      cta: 'Send report',
      icon: Send,
      done: (sentReportCount ?? 0) > 0,
    },
  ]
  const completedFirstReportTasks = firstReportTasks.filter(task => task.done).length
  const firstReportProgress = Math.round((completedFirstReportTasks / firstReportTasks.length) * 100)
  const nextFirstReportTask = firstReportTasks.find(task => !task.done)
  const NextFirstReportIcon = nextFirstReportTask?.icon

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

      {isOwner && (sentReportCount ?? 0) === 0 && (
        <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-transparent">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge variant="success" className="mb-3">First value path</Badge>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Trophy className="h-5 w-5 text-emerald-400" />
                  Send your first client report
                </CardTitle>
                <p className="mt-2 max-w-2xl text-sm text-gray-400">
                  Cleerd becomes sticky when a customer receives a clean completion recap with proof photos, notes, and an easy path to rebook or leave a review. This checklist keeps the next revenue-producing action front and center.
                </p>
              </div>
              <div className="min-w-[160px] rounded-xl border border-white/10 bg-[#111722]/80 px-4 py-3 text-center">
                <p className="text-3xl font-bold text-white">{firstReportProgress}%</p>
                <p className="text-xs text-gray-500">first report ready</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextFirstReportTask && (
              <Link href={nextFirstReportTask.href} className="group flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-[#111722]/80 p-4 transition-colors hover:border-emerald-400/40 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    {NextFirstReportIcon && <NextFirstReportIcon className="h-4 w-4 text-emerald-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Next best action</p>
                    <p className="mt-1 font-medium text-white">{nextFirstReportTask.title}</p>
                    <p className="mt-1 text-sm text-gray-400">{nextFirstReportTask.description}</p>
                  </div>
                </div>
                <Button size="sm" className="w-full sm:w-auto">
                  {nextFirstReportTask.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
              {firstReportTasks.map(({ title, href, icon: Icon, done }) => (
                <Link key={title} href={href} className={`rounded-xl border p-4 transition-colors hover:bg-white/5 ${done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-[#161b27]'}`}>
                  <div className="flex items-center gap-2">
                    {done ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Icon className="h-4 w-4 text-gray-500" />}
                    <p className={`text-sm font-medium ${done ? 'text-emerald-200' : 'text-gray-300'}`}>{title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
