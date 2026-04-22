import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  CheckSquare, Camera, Sparkles, Send, CheckCircle, CalendarDays,
  Users, ClipboardList, Bell, CreditCard, ArrowRight, Zap,
  Circle,
} from 'lucide-react'

function AppMockup() {
  const checklistItems = [
    { label: 'Vacuumed all carpeted areas', done: true },
    { label: 'Mopped hard floors', done: true },
    { label: 'Cleaned and sanitized bathrooms', done: true },
    { label: 'Wiped down all countertops', done: true },
    { label: 'Emptied trash and replaced liners', done: true },
    { label: 'Cleaned kitchen appliances', done: true },
    { label: 'Dusted blinds and ceiling fans', done: false },
  ]

  const photos = [
    { label: 'Before', color: 'from-slate-700 to-slate-800' },
    { label: 'After', color: 'from-emerald-900 to-slate-800' },
    { label: 'After', color: 'from-emerald-900 to-slate-900' },
    { label: 'Issue', color: 'from-amber-900 to-slate-800' },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Browser chrome */}
      <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
        <div className="bg-[#1e2433] border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-amber-500/70" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex-1 mx-4 bg-[#161b27] rounded-md px-3 py-1 text-xs text-gray-500 text-center">
            app.cleancheck.io/inspections/job-detail
          </div>
        </div>

        {/* App shell */}
        <div className="flex bg-[#0f1117] min-h-[480px]">
          {/* Sidebar */}
          <div className="hidden sm:flex w-44 flex-col bg-[#161b27] border-r border-white/10 p-3 gap-1 flex-shrink-0">
            <div className="flex items-center gap-2 px-2 py-3 mb-2">
              <CheckSquare className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-bold text-white">CleanCheck</span>
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

          {/* Main content */}
          <div className="flex-1 p-5 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-bold text-white">247 Maple Drive — Unit 3B</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">Completed</span>
                </div>
                <p className="text-xs text-gray-500">Morning Crew · Mon Apr 21, 2025 · 9:00 AM · 2h 30m</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-bold text-emerald-400">94%</div>
                <div className="text-xs text-gray-500">QC Score</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Checklist */}
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
                {/* Photos */}
                <div className="rounded-lg bg-[#161b27] border border-white/10 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Photos</p>
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map(({ label, color }, i) => (
                      <div key={i} className={`aspect-square rounded-md bg-gradient-to-br ${color} flex flex-col items-center justify-center gap-1`}>
                        <Camera className="h-3 w-3 text-white/40" />
                        <span className="text-[9px] text-white/40">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Report excerpt */}
                <div className="rounded-lg bg-[#161b27] border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Quality Report</p>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
                    Overall quality score: <span className="text-emerald-400 font-semibold">94/100</span>. All primary cleaning tasks completed to standard. Minor gap noted: ceiling fan in master bedroom not dusted. Kitchen and bathrooms show thorough sanitization. Before/after photos confirm visible improvement across all areas...
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
  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f1117]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-bold text-white">CleanCheck</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#pricing" className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/signup">
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-sm text-blue-400 mb-8">
          <Zap className="h-3.5 w-3.5" /> Built for small cleaning businesses
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6 tracking-tight">
          Schedule jobs. Document work.<br className="hidden sm:block" />
          <span className="text-blue-400">Impress your clients.</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          CleanCheck gives your cleaning business a complete operations platform — scheduling, team management, photo documentation, AI quality reports, and automated client communication.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
              Start 14-day free trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#pricing">
            <Button size="lg" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10 hover:text-white">See pricing</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">No credit card required · Cancel anytime</p>
      </section>

      {/* App mockup */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <p className="text-center text-sm text-gray-500 mb-6">Job detail view — checklist, photos, and AI quality report</p>
        <AppMockup />
      </section>

      {/* How it works */}
      <section className="bg-[#161b27] border-y border-white/10 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">How it works</h2>
            <p className="text-gray-400 max-w-xl mx-auto">From booking to payment, every step of the job is covered.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '01', icon: CalendarDays, title: 'Schedule the job', desc: 'Assign a property, team, package, and time. Booking confirmation goes to the client automatically.' },
              { step: '02', icon: ClipboardList, title: 'Team completes checklist', desc: 'Your team logs in, sees their jobs, works through the checklist, and uploads before & after photos.' },
              { step: '03', icon: Sparkles, title: 'AI generates your QC report', desc: 'AI analyzes photos and the completed checklist to produce an internal quality report with scores and notes — in seconds.' },
              { step: '04', icon: Send, title: 'Client gets a summary', desc: 'Send a clean job completion summary to your client. Mark the job paid and send an invoice — all from one place.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative rounded-xl bg-[#1e2433] border border-white/10 p-6">
                <div className="text-xs font-bold text-blue-400/60 tracking-widest uppercase mb-4">{step}</div>
                <div className="mb-3 inline-flex rounded-lg bg-blue-500/10 p-2.5">
                  <Icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Everything in one place</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Replace the spreadsheets, group chats, and paper checklists with one clean platform.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: CalendarDays,
              color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
              title: 'Job scheduling',
              desc: 'Schedule one-time or recurring jobs. Assign teams, set durations, and manage your full calendar from a single view.',
            },
            {
              icon: Users,
              color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20',
              title: 'Team management',
              desc: 'Invite your staff with their own login. Each team member sees only their assigned jobs — nothing else.',
            },
            {
              icon: Camera,
              color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
              title: 'Photo documentation',
              desc: 'Capture before, after, and issue photos on any phone. Build a visual record of every job completed.',
            },
            {
              icon: Sparkles,
              color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
              title: 'AI internal QC reports',
              desc: 'AI reads your checklist and photos and writes a scored internal QC report — so you always know the quality of work your team delivered.',
            },
            {
              icon: Bell,
              color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20',
              title: 'Automated communication',
              desc: 'Booking confirmations and appointment reminders go out automatically. Keep clients informed without the admin work.',
            },
            {
              icon: CreditCard,
              color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20',
              title: 'Invoicing & payments',
              desc: 'Mark jobs as paid and send a polished invoice email in one click. Track what\'s been paid and what hasn\'t.',
            },
          ].map(({ icon: Icon, color, bg, border, title, desc }) => (
            <div key={title} className={`rounded-xl border ${border} bg-[#161b27] p-6`}>
              <div className={`mb-4 inline-flex rounded-lg ${bg} p-3`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="bg-[#161b27] border-y border-white/10 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Built for teams of 1–20, not enterprise</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Most QC software costs $250+/month and is designed for large janitorial companies with IT departments. CleanCheck is purpose-built for independent cleaning businesses that want to look professional without the overhead.
              </p>
              <ul className="space-y-3">
                {[
                  'Set up in minutes, not weeks',
                  'No training required — your team figures it out on day one',
                  'Works from any phone or computer',
                  'Starting at $39/month',
                ].map(point => (
                  <li key={point} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span className="text-sm text-gray-300">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Replace', items: ['Google Forms · WhatsApp threads · Paper checklists · Manual email updates'] },
                { label: 'With', items: ['One platform your whole team actually uses'] },
              ].map(({ label, items }) => (
                <div key={label} className={`rounded-xl border p-5 ${label === 'Replace' ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${label === 'Replace' ? 'text-red-400' : 'text-emerald-400'}`}>{label}</p>
                  {items.map(i => <p key={i} className="text-sm text-gray-300">{i}</p>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[#161b27] border-y border-white/10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Simple, transparent pricing</h2>
          <p className="text-gray-400 mb-12">Start free for 14 days. No credit card required.</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                name: 'Solo', price: 39,
                desc: 'Perfect for owner-operators',
                features: ['1 team', 'Up to 50 jobs/month', 'AI internal QC reports', 'Photo documentation', 'Client email delivery', 'Booking confirmations'],
              },
              {
                name: 'Growth', price: 69,
                desc: 'For growing cleaning businesses',
                features: ['Up to 3 teams', 'Unlimited jobs', 'AI internal QC reports', 'Photo documentation', 'Client email delivery', 'Booking confirmations', 'Appointment reminders'],
                popular: true,
              },
              {
                name: 'Pro', price: 99,
                desc: 'For established operations',
                features: ['Unlimited teams', 'Unlimited jobs', 'AI internal QC reports', 'Photo documentation', 'Client email delivery', 'Booking confirmations', 'Appointment reminders', 'Priority support'],
              },
            ].map(plan => (
              <div key={plan.name} className={`rounded-xl border p-6 text-left flex flex-col ${plan.popular ? 'border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-500/10' : 'border-white/10 bg-[#1e2433]'}`}>
                {plan.popular && <div className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-400">Most popular</div>}
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
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
                <Link href="/signup">
                  <Button className={`w-full ${plan.popular ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white border-0'}`}>
                    Start free trial
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to run a tighter operation?</h2>
        <p className="text-gray-400 mb-10 leading-relaxed">
          Join cleaning businesses using CleanCheck to schedule smarter, document every job, and keep quality high across every team.
        </p>
        <Link href="/signup">
          <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
            Start your free 14-day trial <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <p className="mt-4 text-sm text-gray-500">No credit card · Cancel anytime · Set up in minutes</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-sm text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-blue-400" />
            <span className="font-semibold text-gray-400">CleanCheck</span>
            <span className="ml-2">© {new Date().getFullYear()}</span>
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
