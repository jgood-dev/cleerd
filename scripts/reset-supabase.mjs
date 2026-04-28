import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  'https://apugkorembzgpwcczrlt.supabase.co',
  'sb_secret_dQYaE5l6OdNZV-cm6yA_tw__mMqF3_a',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function reset() {
  console.log('Deleting all auth users...')
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const user of users) {
    await admin.auth.admin.deleteUser(user.id)
    console.log(`  Deleted user: ${user.email}`)
  }

  console.log('Clearing all org data...')
  await admin.from('checklist_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('inspection_photos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('inspections').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('package_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('packages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('properties').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('org_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('Done — Supabase is clean.')
}

reset().catch(console.error)
