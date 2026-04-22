import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  CheckSquare, Camera, Sparkles, Send, CheckCircle, CalendarDays,
  Users, ClipboardList, Bell, CreditCard, ArrowRight, Zap,
} from 'lucide-react'

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
                features: ['1 team', 'Up to 30 jobs/month', 'AI internal QC reports', 'Photo documentation', 'Client email delivery', 'Booking confirmations'],
              },
              {
                name: 'Growth', price: 69,
                desc: 'For growing cleaning businesses',
                features: ['Up to 3 teams', 'Unlimited jobs', 'AI internal QC reports', 'Photo documentation', 'Client email delivery', 'Appointment reminders'],
                popular: true,
              },
              {
                name: 'Pro', price: 99,
                desc: 'For established operations',
                features: ['Unlimited teams', 'Unlimited jobs', 'AI internal QC reports', 'Photo documentation', 'Client email delivery', 'Priority support'],
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
