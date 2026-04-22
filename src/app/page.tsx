import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckSquare, Camera, Sparkles, Send, CheckCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b border-white/10">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-7 w-7 text-blue-400" />
          <span className="text-xl font-bold text-white">CleanCheck</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
          <Link href="/signup">
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">Start Free Trial</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-sm text-blue-400 mb-8">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered quality reports in seconds
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-6">
          Stop using Google Forms<br className="hidden sm:block" /> for cleaning inspections
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          CleanCheck lets your team document jobs with photos, auto-generates professional QC reports using AI, and emails them directly to your clients.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white">Start 14-day free trial</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10 hover:text-white">Sign in</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">No credit card required · Cancel anytime</p>
      </section>

      {/* Features */}
      <section className="bg-[#161b27] border-y border-white/10 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Everything your team needs</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: Camera,
                title: 'Photo documentation',
                desc: 'Capture before, during, and after photos directly from any phone. GPS and timestamp included automatically.',
              },
              {
                icon: Sparkles,
                title: 'AI quality reports',
                desc: 'Claude AI analyzes your photos and checklist to generate a professional report in seconds — not minutes.',
              },
              {
                icon: Send,
                title: 'Client delivery',
                desc: 'Send polished reports directly to property managers. Build trust and win repeat business.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl bg-[#1e2433] border border-white/10 p-6">
                <div className="mb-4 inline-flex rounded-lg bg-blue-500/10 p-3">
                  <Icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Built for small cleaning businesses</h2>
        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
          Most QC software costs $250+/month and is built for enterprise janitorial companies. CleanCheck is built for teams of 1–20, starting at $39/month.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {['Replace Google Forms + WhatsApp', 'Professional client-facing reports', 'Know exactly what each team completed'].map(point => (
            <div key={point} className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
              <span className="text-sm font-medium text-gray-200">{point}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[#161b27] border-y border-white/10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Simple pricing</h2>
          <p className="text-gray-400 mb-12">Start free for 14 days. No credit card required.</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { name: 'Solo', price: 39, features: ['1 team', 'Up to 30 jobs/month', 'AI reports', 'Photo uploads'] },
              { name: 'Growth', price: 69, features: ['Up to 3 teams', 'Unlimited jobs', 'AI reports', 'Client email delivery'], popular: true },
              { name: 'Pro', price: 99, features: ['Unlimited teams', 'Unlimited jobs', 'AI reports', 'Client portal', 'Priority support'] },
            ].map(plan => (
              <div key={plan.name} className={`rounded-xl border p-6 text-left ${plan.popular ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-white/10 bg-[#1e2433]'}`}>
                {plan.popular && <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-400">Most popular</div>}
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  <span className="text-sm text-gray-400">/month</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-blue-400" />
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
      <section className="px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to upgrade your QC process?</h2>
        <p className="text-gray-400 mb-8">Join cleaning businesses already using CleanCheck to deliver better results and win more clients.</p>
        <Link href="/signup">
          <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white">Start your free trial today</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-4">
          <CheckSquare className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-gray-300">CleanCheck</span>
        </div>
        <p>© {new Date().getFullYear()} CleanCheck. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-6">
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  )
}
