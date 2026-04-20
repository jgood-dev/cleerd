'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ClipboardCheck, Users, FileText, Settings, CheckSquare } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-white/10 bg-[#161b27]">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <CheckSquare className="h-6 w-6 text-blue-400" />
        <span className="text-lg font-bold text-white">CleanCheck</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
