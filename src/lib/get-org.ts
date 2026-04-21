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
    .select('org_id, organizations(*)')
    .eq('user_id', userId)
    .not('invite_accepted_at', 'is', null)
    .single()
  if (membership?.organizations) return { org: membership.organizations as any, isOwner: false }

  return { org: null, isOwner: false }
}
