import { createClient } from '@supabase/supabase-js'

/**
 * Local-only destructive reset tool.
 *
 * This script deletes all Supabase Auth users and clears application data tables.
 * Never paste Supabase keys into this file. Run it only from a trusted local shell
 * with environment variables supplied by your shell or a private, uncommitted env file.
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
 *   RESET_SUPABASE_CONFIRM=delete-all-data
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resetConfirmation = process.env.RESET_SUPABASE_CONFIRM

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL. Refusing to reset Supabase.')
}

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Refusing to reset Supabase.')
}

if (resetConfirmation !== 'delete-all-data') {
  throw new Error(
    'Refusing to reset Supabase. Set RESET_SUPABASE_CONFIRM=delete-all-data to confirm this destructive local-only action.'
  )
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function deleteAllAuthUsers() {
  console.log('Deleting all auth users...')

  let page = 1
  const perPage = 1000

  while (true) {
    const {
      data: { users },
      error,
    } = await admin.auth.admin.listUsers({ page, perPage })

    if (error) {
      throw error
    }

    if (!users.length) {
      return
    }

    for (const user of users) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)

      if (deleteError) {
        throw deleteError
      }

      console.log(`  Deleted user: ${user.email ?? user.id}`)
    }

    if (users.length < perPage) {
      return
    }

    page += 1
  }
}

async function clearTable(tableName) {
  const { error } = await admin
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) {
    throw error
  }

  console.log(`  Cleared table: ${tableName}`)
}

async function reset() {
  await deleteAllAuthUsers()

  console.log('Clearing all org data...')

  const tables = [
    'checklist_items',
    'inspection_photos',
    'inspections',
    'jobs',
    'package_items',
    'packages',
    'team_members',
    'teams',
    'properties',
    'org_members',
    'organizations',
  ]

  for (const tableName of tables) {
    await clearTable(tableName)
  }

  console.log('Done — Supabase is clean.')
}

reset().catch((error) => {
  console.error(error)
  process.exit(1)
})
