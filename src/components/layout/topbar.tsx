'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Bell } from 'lucide-react'

export function Topbar({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="hidden md:flex h-16 items-center justify-between border-b border-white/10 bg-[#161b27] px-6">
      <div />
      <div className="flex items-center gap-4">
        <button className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <span className="text-sm text-gray-400">{userEmail}</span>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
