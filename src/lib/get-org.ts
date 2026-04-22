// Works with both server and client Supabase instances
export async function getOrgForUser(supabase: any, userId: string) {
  // Check if user owns an org
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', userId)
    .single()
  if (ownedOrg) return { org: ownedOrg, isOwner: true }

  // Check if user is an invited member
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .not('invite_accepted_at', 'is', null)
    .single()

  if (membership?.org_id) {
    // Use SECURITY DEFINER RPC to bypass RLS — invitees can't read organizations directly
    const { data: org } = await supabase.rpc('get_org_by_id', { p_org_id: membership.org_id })
    if (org) return { org, isOwner: false }
  }

  return { org: null, isOwner: false }
}
