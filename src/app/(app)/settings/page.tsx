import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Building2, ClipboardList, MapPin, CreditCard, ChevronRight } from 'lucide-react'

const sections = [
  {
    href: '/settings/business',
    icon: Building2,
    title: 'Business Info',
    description: 'Update your business name and account details.',
  },
  {
    href: '/settings/packages',
    icon: ClipboardList,
    title: 'Packages',
    description: 'Create and manage checklist packages for different types of cleans.',
  },
  {
    href: '/settings/properties',
    icon: MapPin,
    title: 'Properties',
    description: 'Manage client locations and their contact emails.',
  },
  {
    href: '/settings/billing',
    icon: CreditCard,
    title: 'Billing & Plan',
    description: 'View your current plan and manage your subscription.',
  },
]

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: org } = await supabase.from('organizations').select('name, plan').eq('owner_id', user!.id).single()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">{org?.name}</p>
      </div>

      <div className="space-y-2">
        {sections.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#161b27] p-5 hover:bg-[#1e2433] hover:border-white/20 transition-colors group"
          >
            <div className="rounded-lg bg-blue-500/10 p-3 flex-shrink-0">
              <Icon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-100">{title}</p>
              <p className="text-sm text-gray-400 mt-0.5">{description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
