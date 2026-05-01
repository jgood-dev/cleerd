import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  CheckSquare, Camera, Sparkles, Send, CheckCircle, CalendarDays,
  Users, ClipboardList, Bell, CreditCard, ArrowRight, Zap,
  ShieldCheck, TrendingUp, Clock, MessageSquare, Star, DollarSign,
  MapPin, FileText, Circle,
} from 'lucide-react'

const signupHref = '/signup'

function AppMockup() {
  const checklistItems = [
    { label: 'Initial walkthrough completed', done: true },
    { label: 'All primary tasks completed', done: true },
    { label: 'Before photos uploaded', done: true },
    { label: 'After photos uploaded', done: true },
    { label: 'Client area secured', done: true },
    { label: 'Equipment returned', done: true },
    { label: 'Final quality check', done: false },
  ]

  const photos = [
    { label: 'Before', color: 'from-slate-700 to-slate-800' },
    { label: 'After', color: 'from-emerald-900 to-slate-800' },
    { label: 'After', color: 'from-emerald-900 to-slate-900' },
    { label: 'Issue', color: 'from-amber-900 to-slate-800' },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
        <div className="bg-[#1e2433] border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-amber-500/70" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex-1 mx-4 bg-[#161b27] rounded-md px-3 py-1 text-xs text-gray-500 text-center">
            app.cleerd.io/inspections/job-detail
          </div>
        </div>

        <div className="flex bg-[#0f1117] min-h-[480px]">
          <div className="hidden sm:flex w-44 flex-col bg-[#161b27] border-r border-white/10 p-3 gap-1 flex-shrink-0">
            <div className="flex items-center gap-2 px-2 py-3 mb-2">
              <CheckSquare className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-bold text-white">Cleerd</span>
            </div>
            {[
              { label: 'Dashboard', active: false },
              { label: 'Schedule', active: false },
              { label: 'Jobs', active: true },
              { label: 'Reports', active: false },
              { label: 'Settings', active: false },
            ].map(({ label, active }) => (
              <div key={label} className={`px-3 py-2 rounded-lg text-xs font-medium ${active ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-500'}`}>
                {label}
              </div>
            ))}
          </div>

          <div className="flex-1 p-5 overflow-hidden">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-bold text-white">247 Maple Drive &mdash; Unit 3B</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">Completed</span>
                </div>
                <p className="text-xs text-gray-500">Morning Crew &middot; Mon Apr 21 &middot; 9:00 AM &middot; 2h 30m</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-bold text-emerald-400">94%</div>
                <div className="text-xs text-gray-500">QC Score</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg bg-[#161b27] border border-white/10 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Checklist</p>
                <div className="space-y-2">
                  {checklistItems.map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <div className={`h-4 w-4 rounded flex-shrink-0 flex items-center justify-center ${done ? 'bg-emerald-500/20 border border-emerald-500/40' : 'border border-white/20'}`}>
                        {done && <CheckCircle className="h-3 w-3 text-emerald-400" />}
                      </div>
                      <span className={`text-xs ${done ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg bg-[#161b27] border border-white/10 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Proof photos</p>
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map(({ label, color }, i) => (
                      <div key={i} className={`aspect-square rounded-md bg-gradient-to-br ${color} flex flex-col items-center justify-center gap-1`}>
                        <Camera className="h-3 w-3 text-white/40" />
                        <span className="text-[9px] text-white/40">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-[#161b27] border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI client summary</p>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
                    Overall quality score: <span className="text-emerald-400 font-semibold">94/100</span>. All primary tasks completed to standard. Before/after photos confirm work completed across all areas. Client-ready summary prepared for delivery...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const revenueStats = [
    { value: '14 days', label: 'free trial', sub: 'No credit card required' },
    { value: '$29/mo', label: 'solo plan', sub: 'Built for owner-operators' },
    { value: '10 min', label: 'setup target', sub: 'Add client, team, template, job' },
  ]

  const painKillers = [
    {
      icon: Clock,
      title: 'Stop donating nights to admin work',
      desc: 'Replace spreadsheet schedules, manual reminders, and copy-pasted client updates with one simple workflow.',
    },
    {
      icon: ShieldCheck,
      title: 'Prove the job was done right',
      desc: 'Every visit gets a checklist, timestamped job record, before/after photos, and a polished completion summary.',
    },
    {
      icon: TrendingUp,
      title: 'Look premium before you hire ops staff',
      desc: 'Give clients the professional communication they expect from bigger competitors without buying enterprise software.',
    },
  ]

  const plans = [
    {
      id: 'solo', name: 'Solo', price: 29,
      desc: 'Owner-operators proving every job',
      bestFor: 'Solo crews and side-hustle service businesses',
      features: ['1 team', 'Up to 50 jobs/month', 'AI quality reports', 'Photo documentation', 'Client email delivery', 'Booking confirmations'],
    },
    {
      id: 'growth', name: 'Growth', price: 79,
      desc: 'Best value for recurring service revenue',
      bestFor: 'Most small service teams with recurring clients',
      features: ['Up to 3 teams', 'Unlimited jobs', 'AI quality reports', 'Photo documentation', 'Client email delivery', 'Booking confirmations', 'Appointment reminders'],
      popular: true,
    },
    {
      id: 'pro', name: 'Pro', price: 149,
      desc: 'Automation leverage for established operators',
      bestFor: 'Growing businesses with multiple crews',
      features: ['Unlimited teams', 'Unlimited jobs', 'AI quality reports', 'Photo documentation', 'Client email delivery', 'Booking confirmations', 'Appointment reminders', 'Priority support'],
    },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f1117]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-bold text-white">Cleerd</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#how-it-works" className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors">How it works</Link>
            <Link href="#pricing" className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
            <Link href={signupHref}>
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-6 pb-16 pt-20 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-sm text-blue-400 mb-8">
          <Zap className="h-3.5 w-3.5" /> Field-service software for teams that would rather make money than babysit spreadsheets
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6 tracking-tight">
          Turn every field job into<br className="hidden sm:block" />
          <span className="text-blue-400">proof, trust, and repeat revenue.</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
          Cleerd helps small field-service businesses schedule jobs, guide crews, capture photo proof, generate AI quality reports, and send client-ready updates without hiring an operations manager.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={signupHref}>
            <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
              Start your 14-day free trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#pricing">
            <Button size="lg" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10 hover:text-white">Compare plans</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">No credit card required &middot; Cancel anytime &middot; Built for teams of 1&ndash;20</p>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {revenueStats.map(stat => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-[#161b27] p-5">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-blue-300">{stat.label}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <p className="text-center text-sm text-gray-500 mb-6">Job detail view &mdash; tasks, photos, AI quality report, and client summary in one place</p>
        <AppMockup />
      </section>

      <section className="bg-[#161b27] border-y border-white/10 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">The cheapest admin hire you will never have to manage</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">If Cleerd saves one admin hour, prevents one callback, or helps win one review-driven booking, the monthly subscription is easy to justify.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {painKillers.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-[#1e2433] p-6">
                <div className="mb-4 inline-flex rounded-lg bg-blue-500/10 p-3">
                  <Icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">From scheduled to paid, every step is covered</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Cleerd gives you a repeatable operating system for the part of the business that usually lives in someone&apos;s head.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: '01', icon: CalendarDays, title: 'Schedule the job', desc: 'Assign a client location, team, package, time, and duration. Booking confirmation can go to the client automatically.' },
            { step: '02', icon: ClipboardList, title: 'Guide the team', desc: 'Your crew logs in, sees assigned jobs, follows the checklist, and documents the work from any phone.' },
            { step: '03', icon: Sparkles, title: 'Generate proof', desc: 'AI turns checklist completion and job photos into a scored quality report with notes your team can understand.' },
            { step: '04', icon: Send, title: 'Close the loop', desc: 'Send a clean client summary, request the review, track payment, and keep the next job moving.' },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="relative rounded-xl bg-[#161b27] border border-white/10 p-6">
              <div className="text-xs font-bold text-blue-400/60 tracking-widest uppercase mb-4">{step}</div>
              <div className="mb-3 inline-flex rounded-lg bg-blue-500/10 p-2.5">
                <Icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#161b27] border-y border-white/10 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Built for real service businesses, not demo-day theater</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Use Cleerd for cleaning, lawn care, mobile detailing, pest control, maintenance, inspections, and any recurring field work where client trust matters.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: CalendarDays, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', title: 'Recurring job scheduling', desc: 'Schedule one-time or repeat jobs, assign teams, set durations, and keep the calendar from becoming a crime scene.' },
              { icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', title: 'Team-specific access', desc: 'Invite staff with their own login. Members see their assigned work without wandering through owner-only settings.' },
              { icon: Camera, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', title: 'Photo documentation', desc: 'Capture before, after, and issue photos on any phone so callbacks become conversations instead of arguments.' },
              { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', title: 'AI quality reports', desc: 'Turn task completion and photos into a scored internal quality report that helps owners spot issues faster.' },
              { icon: MessageSquare, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', title: 'Client communication', desc: 'Send booking confirmations, reminders, completion reports, invoices, and review requests from a repeatable workflow.' },
              { icon: CreditCard, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', title: 'Billing-ready operations', desc: 'Track plan limits, keep payments in view, and give owners a clean upgrade path as the business grows.' },
            ].map(({ icon: Icon, color, bg, border, title, desc }) => (
              <div key={title} className={`rounded-xl border ${border} bg-[#0f1117] p-6`}>
                <div className={`mb-4 inline-flex rounded-lg ${bg} p-3`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">Win the follow-up before your competitor even sends an invoice</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Clients do not just buy the service. They buy confidence that the work happened, the team was professional, and someone is in control. Cleerd makes that confidence visible after every job.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: Star, label: 'Ask for reviews while the work is fresh' },
                { icon: FileText, label: 'Send completion summaries clients can forward' },
                { icon: MapPin, label: 'Keep locations, notes, contacts, and access details organized' },
                { icon: DollarSign, label: 'Recover the subscription with one saved admin hour' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-lg border border-white/10 bg-[#161b27] p-4">
                  <Icon className="mb-3 h-5 w-5 text-blue-400" />
                  <p className="text-sm text-gray-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">Quick ROI math</p>
            <h3 className="text-2xl font-bold text-white mb-4">One less admin headache can pay for the month.</h3>
            <div className="space-y-3 text-sm text-gray-300">
              {[
                ['Saved scheduling/admin time', '1 hour'],
                ['Avoided missed reminder or callback', '$50+ value'],
                ['One better-timed review request', 'Potential new booking'],
                ['Solo plan', '$29/month'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#161b27] border-y border-white/10 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Built for operators who need proof, not another toy dashboard</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Cleerd is still early, so the promise is simple: get one real workflow live fast, document the work clearly, and make the client follow-up feel professional from day one.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { title: 'Owner-first setup', desc: 'The dashboard points you to the next useful action instead of dumping you into empty software.', metric: '10 min setup target' },
              { title: 'Customer-ready proof', desc: 'Checklists, photos, and AI summaries turn field work into a recap clients can understand.', metric: 'Reports in the workflow' },
              { title: 'Revenue-aware trial', desc: 'Start without a card, then upgrade when Cleerd is actually helping run jobs.', metric: '14 days free' },
            ].map(({ title, desc, metric }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-[#0f1117] p-6">
                <Star className="mb-4 h-5 w-5 text-blue-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-blue-300">{metric}</p>
                <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#161b27] border-y border-white/10 px-6 py-20">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300 mb-6">
            <CheckCircle className="h-3.5 w-3.5" /> Start free, upgrade when Cleerd is running your workflow
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Simple pricing that does not require a committee meeting</h2>
          <p className="text-gray-400 mb-4">Start free for 14 days. No credit card required.</p>
          <p className="mx-auto mb-12 max-w-2xl text-sm text-gray-500">Most teams should start on Growth if they have recurring clients or more than one crew. Solo is intentionally affordable for owner-operators validating the workflow.</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map(plan => (
              <div key={plan.id} className={`relative rounded-xl border p-6 text-left flex flex-col ${plan.popular ? 'border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-500/10' : 'border-white/10 bg-[#1e2433]'}`}>
                {plan.popular && <div className="absolute -top-3 left-6 rounded-full bg-blue-500 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">Best value</div>}
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{plan.desc}</p>
                <p className="mb-4 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-gray-400">Best for: <span className="text-gray-200">{plan.bestFor}</span></p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-sm text-gray-400">/month</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className={`h-4 w-4 flex-shrink-0 ${plan.popular ? 'text-blue-400' : 'text-emerald-400'}`} />
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`${signupHref}?plan=${plan.id}`}>
                  <Button className={`w-full ${plan.popular ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white border-0'}`}>
                    Start free on {plan.name}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-white/10 bg-[#0f1117] p-5 text-left md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <p className="font-semibold text-white">Not sure which plan fits?</p>
              <p className="mt-1 text-sm text-gray-400">Start free, set up a real job workflow, then pick the plan that matches your team count and job volume.</p>
            </div>
            <Link href={signupHref} className="mt-4 inline-flex md:mt-0">
              <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10 hover:text-white">Try it before deciding</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Questions owners ask before trying Cleerd</h2>
          <p className="text-gray-400">Short answers, because nobody launched a service business to read SaaS poetry.</p>
        </div>
        <div className="space-y-4">
          {[
            { q: 'Do I need a credit card to start?', a: 'No. The trial starts without a card so you can test the workflow before paying.' },
            { q: 'Is Cleerd only for cleaning companies?', a: 'No. Cleerd works for any field-service business that schedules visits, documents work, and communicates with clients.' },
            { q: 'Will my crew need training?', a: 'The product is designed around simple job lists, checklists, photos, and submit buttons so field teams can learn by doing.' },
            { q: 'Why not just use spreadsheets and texts?', a: 'You can, until the missed reminder, missing photo, or forgotten follow-up costs more than the software. Cleerd keeps the process repeatable.' },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-white/10 bg-[#161b27] p-5">
              <h3 className="font-semibold text-white">{q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24 text-center max-w-2xl mx-auto">
        <div className="mb-6 inline-flex rounded-full bg-blue-500/10 p-3">
          <Circle className="h-3 w-3 fill-blue-400 text-blue-400" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Your next job can look more professional than your last one.</h2>
        <p className="text-gray-400 mb-10 leading-relaxed">
          Start the free trial, add one client, schedule one job, and let Cleerd turn the work into proof your customer can trust.
        </p>
        <Link href={signupHref}>
          <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
            Start free for 14 days <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <p className="mt-4 text-sm text-gray-500">No credit card &middot; Cancel anytime &middot; Set up in minutes</p>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-sm text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-blue-400" />
            <span className="font-semibold text-gray-400">Cleerd</span>
            <span className="ml-2">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-gray-300 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}


