import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { getOrgForUser } from '@/lib/get-org'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { isOwner, memberTeamName } = await getOrgForUser(supabase, user.id, user.email)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">
      <Sidebar isOwner={isOwner} memberTeamName={memberTeamName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userEmail={user.email ?? ''} />
        <main className="flex-1 overflow-auto p-4 md:p-6 pt-18 md:pt-6">{children}</main>
      </div>
    </div>
  )
}
