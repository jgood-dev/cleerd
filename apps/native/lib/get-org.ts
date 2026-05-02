import { supabase } from './supabase'

export type OrgResult = {
  org: any | null
  isOwner: boolean
  memberTeamId: string | null
}

export async function getOrgForUser(userId: string, userEmail?: string): Promise<OrgResult> {
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', userId)
    .single()
  if (ownedOrg) return { org: ownedOrg, isOwner: true, memberTeamId: null }

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .not('invite_accepted_at', 'is', null)
    .single()

  if (membership?.org_id) {
    const { data: org } = await supabase.rpc('get_org_by_id', { p_org_id: membership.org_id })
    if (org) {
      const isAdmin = membership.role === 'admin'
      let memberTeamId: string | null = null
      if (!isAdmin && userEmail) {
        const { data: tm } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('email', userEmail)
          .maybeSingle()
        memberTeamId = tm?.team_id ?? null
      }
      return { org, isOwner: isAdmin, memberTeamId }
    }
  }

  return { org: null, isOwner: false, memberTeamId: null }
}
