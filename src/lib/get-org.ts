// Works with both server and client Supabase instances
export async function getOrgForUser(supabase: any, userId: string, userEmail?: string) {
  // Check if user owns an org
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', userId)
    .single()
  if (ownedOrg) return { org: ownedOrg, isOwner: true, memberTeamId: null as string | null, memberTeamName: null as string | null }

  // Check if user is an invited member
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .not('invite_accepted_at', 'is', null)
    .single()

  if (membership?.org_id) {
    // Use SECURITY DEFINER RPC to bypass RLS — invitees can't read organizations directly
    const { data: org } = await supabase.rpc('get_org_by_id', { p_org_id: membership.org_id })
    if (org) {
      const isAdmin = membership.role === 'admin'
      let memberTeamId: string | null = null
      let memberTeamName: string | null = null
      if (!isAdmin && userEmail) {
        const { data: tm } = await supabase
          .from('team_members')
          .select('team_id, teams(name)')
          .eq('email', userEmail)
          .maybeSingle()
        if (tm) {
          memberTeamId = tm.team_id ?? null
          memberTeamName = (tm.teams as any)?.name ?? null
        }
      }
      return { org, isOwner: isAdmin, memberTeamId, memberTeamName }
    }
  }

  return { org: null, isOwner: false, memberTeamId: null as string | null, memberTeamName: null as string | null }
}
