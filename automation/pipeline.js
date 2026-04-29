require('dotenv').config()
const https = require('https')
const fs = require('fs')
const path = require('path')

const APOLLO_KEY = process.env.APOLLO_API_KEY
const INSTANTLY_KEY = process.env.INSTANTLY_API_KEY
const CAMPAIGN_ID = process.env.INSTANTLY_CAMPAIGN_ID
const CONTACTED_FILE = process.env.CONTACTED_FILE || path.join(__dirname, 'contacted.json')
const requestedLeadsPerRun = Number.parseInt(process.env.LEADS_PER_RUN || '25', 10)
const LEADS_PER_RUN = Number.isFinite(requestedLeadsPerRun) ? Math.min(Math.max(requestedLeadsPerRun, 1), 50) : 25
const DRY_RUN = process.env.DRY_RUN !== 'false'
const LIVE_OUTREACH_APPROVED = process.env.LIVE_OUTREACH_APPROVED === 'true'

const STATE_ROTATION = [
  'Florida', 'Texas', 'California', 'Georgia', 'North Carolina',
  'Arizona', 'Colorado', 'Virginia', 'Washington', 'Illinois',
  'Pennsylvania', 'Ohio', 'Michigan', 'Tennessee', 'Nevada'
]

const VERTICAL_ROTATION = [
  { name: 'lawn_and_landscape', keywords: ['lawn care', 'landscaping', 'tree service', 'irrigation'] },
  { name: 'pest_and_pool', keywords: ['pest control', 'pool service', 'pool cleaning', 'mosquito control'] },
  { name: 'cleaning_and_janitorial', keywords: ['cleaning service', 'janitorial', 'commercial cleaning', 'maid service'] },
  { name: 'handyman_and_repair', keywords: ['handyman', 'home repair', 'maintenance', 'property maintenance'] },
  { name: 'mobile_services', keywords: ['mobile detailing', 'pressure washing', 'window cleaning', 'gutter cleaning'] },
]

function requireEnv(name, value) {
  if (!value) throw new Error(`${name} is required. Set it in automation/.env or the scheduled runtime environment.`)
}

function loadContacted() {
  if (!fs.existsSync(CONTACTED_FILE)) return new Set()
  return new Set(JSON.parse(fs.readFileSync(CONTACTED_FILE, 'utf8')))
}

function saveContacted(set) {
  fs.mkdirSync(path.dirname(CONTACTED_FILE), { recursive: true })
  fs.writeFileSync(CONTACTED_FILE, `${JSON.stringify([...set], null, 2)}\n`)
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : null
    const headers = { ...(options.headers || {}) }
    if (serialized) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(serialized)
    }

    const req = https.request({ ...options, headers }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        let parsed = data
        try { parsed = data ? JSON.parse(data) : {} }
        catch { /* Keep raw response for debugging. */ }

        if (res.statusCode >= 400) {
          reject(new Error(`${options.hostname}${options.path} failed with ${res.statusCode}: ${JSON.stringify(parsed)}`))
          return
        }
        resolve(parsed)
      })
    })
    req.on('error', reject)
    if (serialized) req.write(serialized)
    req.end()
  })
}

function getRotationIndex() {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
}

function getCurrentState() {
  return STATE_ROTATION[getRotationIndex() % STATE_ROTATION.length]
}

function getCurrentVertical() {
  return VERTICAL_ROTATION[getRotationIndex() % VERTICAL_ROTATION.length]
}

async function fetchLeads(page = 1) {
  requireEnv('APOLLO_API_KEY', APOLLO_KEY)
  const state = getCurrentState()
  const vertical = getCurrentVertical()
  console.log(`Searching Apollo for ${vertical.name} owners in ${state}...`)

  return request({
    hostname: 'api.apollo.io',
    path: '/api/v1/mixed_people/api_search',
    method: 'POST',
    headers: { 'X-Api-Key': APOLLO_KEY },
  }, {
    person_titles: ['Owner', 'Founder', 'CEO', 'President', 'Proprietor'],
    q_organization_keyword_tags: vertical.keywords,
    organization_num_employees_ranges: ['1,20'],
    person_locations: [`${state}, United States`],
    contact_email_status: ['verified', 'likely_to_engage'],
    per_page: LEADS_PER_RUN,
    page,
  })
}

async function enrichLead(apolloId) {
  requireEnv('APOLLO_API_KEY', APOLLO_KEY)
  const data = await request({
    hostname: 'api.apollo.io',
    path: '/api/v1/people/match',
    method: 'POST',
    headers: { 'X-Api-Key': APOLLO_KEY },
  }, { id: apolloId, reveal_personal_emails: false })

  return data?.person ?? null
}

async function addLeadToInstantly(lead) {
  requireEnv('INSTANTLY_API_KEY', INSTANTLY_KEY)
  requireEnv('INSTANTLY_CAMPAIGN_ID', CAMPAIGN_ID)
  if (!DRY_RUN && !LIVE_OUTREACH_APPROVED) {
    throw new Error('LIVE_OUTREACH_APPROVED=true is required before adding leads to Instantly with DRY_RUN=false.')
  }

  const vertical = getCurrentVertical()
  const body = {
    campaign_id: CAMPAIGN_ID,
    email: lead.email,
    first_name: lead.first_name ?? '',
    last_name: lead.last_name ?? '',
    company_name: lead.organization?.name ?? '',
    personalization: `Runs a ${vertical.name.replaceAll('_', ' ')} business`,
    custom_variables: {
      vertical: vertical.name,
      source: 'apollo_weekly_pipeline',
      product: 'Cleerd',
    },
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Would add ${body.email} (${body.company_name || 'Unknown company'}) to Instantly campaign ${CAMPAIGN_ID || '[missing campaign id]'}`)
    return { id: `dry-run-${lead.id ?? lead.email}` }
  }

  return request({
    hostname: 'api.instantly.ai',
    path: '/api/v2/leads',
    method: 'POST',
    headers: { Authorization: `Bearer ${INSTANTLY_KEY}` },
  }, body)
}

async function run() {
  console.log('=== Cleerd Lead Pipeline ===')
  console.log(`Run time: ${new Date().toISOString()}`)
  console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'live-send'}`)
  console.log(`Lead cap: ${LEADS_PER_RUN}`)
  if (!DRY_RUN && !LIVE_OUTREACH_APPROVED) {
    throw new Error('Refusing live outreach: set LIVE_OUTREACH_APPROVED=true only after sender domain, copy, opt-out language, and daily limits are approved.')
  }

  const contacted = loadContacted()
  console.log(`Already contacted: ${contacted.size} leads`)

  const searchData = await fetchLeads()
  if (!searchData.people?.length) {
    console.log('No leads found from Apollo. Check API key or search filters.')
    return
  }

  console.log(`Found ${searchData.total_entries ?? searchData.people.length} total leads. Processing batch...`)

  let added = 0
  let skipped = 0

  for (const person of searchData.people) {
    if (contacted.has(person.id) || !person.has_email) {
      skipped++
      continue
    }

    const enriched = await enrichLead(person.id)
    if (!enriched?.email) {
      skipped++
      continue
    }

    const result = await addLeadToInstantly(enriched)
    if (result?.id) {
      contacted.add(person.id)
      added++
      console.log(`Added: ${enriched.first_name ?? ''} ${enriched.last_name ?? ''} at ${enriched.organization?.name ?? 'Unknown'}`.trim())
    } else {
      console.log(`Failed to add ${enriched.first_name ?? 'lead'}: ${JSON.stringify(result)}`)
    }

    await new Promise(r => setTimeout(r, 500))
  }

  saveContacted(contacted)
  console.log(`\nDone. Added: ${added} | Skipped: ${skipped}`)
  console.log(`Total contacted to date: ${contacted.size}`)
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
