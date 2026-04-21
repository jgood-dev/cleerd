'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, ClipboardCheck, Users, FileText, Settings, CheckSquare, Menu, X, LogOut, CalendarDays } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 space-y-1 p-4">
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
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
  )
}

function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={signOut}
      className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-100 transition-colors w-full', className)}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-60 flex-col border-r border-white/10 bg-[#161b27] flex-shrink-0">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
          <CheckSquare className="h-6 w-6 text-blue-400" />
          <span className="text-lg font-bold text-white">CleanCheck</span>
        </div>
        <NavLinks />
        <div className="border-t border-white/10 p-4">
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#161b27] px-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-blue-400" />
          <span className="text-base font-bold text-white">CleanCheck</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 text-gray-400 hover:text-white">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex w-64 flex-col bg-[#161b27] border-r border-white/10">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-blue-400" />
                <span className="text-base font-bold text-white">CleanCheck</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onClick={() => setMobileOpen(false)} />
            <div className="border-t border-white/10 p-4">
              <SignOutButton />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
