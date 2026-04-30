export async function userCanAccessOrg(supabase: any, orgId: string | null | undefined, userId: string) {
  if (!orgId) return false

  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .maybeSingle()

  if (org?.owner_id === userId) return true

  const { data: membership } = await supabase
    .from('org_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .not('invite_accepted_at', 'is', null)
    .maybeSingle()

  return Boolean(membership)
}

