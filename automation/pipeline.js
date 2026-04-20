require('dotenv').config()
const https = require('https')
const fs = require('fs')

const APOLLO_KEY = process.env.APOLLO_API_KEY
const INSTANTLY_KEY = process.env.INSTANTLY_API_KEY
const CAMPAIGN_ID = 'f865d4a5-e78c-42ff-8086-e5d3f4019f0f'
const CONTACTED_FILE = './contacted.json'
const LEADS_PER_RUN = 50

// Track already-contacted leads to avoid duplicates
function loadContacted() {
  if (!fs.existsSync(CONTACTED_FILE)) return new Set()
  return new Set(JSON.parse(fs.readFileSync(CONTACTED_FILE, 'utf8')))
}

function saveContacted(set) {
  fs.writeFileSync(CONTACTED_FILE, JSON.stringify([...set]))
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : null
    if (serialized) {
      options.headers['Content-Type'] = 'application/json'
      options.headers['Content-Length'] = Buffer.byteLength(serialized)
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(data) }
      })
    })
    req.on('error', reject)
    if (serialized) req.write(serialized)
    req.end()
  })
}

// Rotate through US states to spread outreach geographically
const STATE_ROTATION = [
  'Florida', 'Texas', 'California', 'Georgia', 'North Carolina',
  'Arizona', 'Colorado', 'Virginia', 'Washington', 'Illinois',
  'Pennsylvania', 'Ohio', 'Michigan', 'Tennessee', 'Nevada'
]

function getCurrentState() {
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return STATE_ROTATION[week % STATE_ROTATION.length]
}

async function fetchLeads(page = 1) {
  const state = getCurrentState()
  console.log(`Searching Apollo for cleaning business owners in ${state}...`)

  const body = {
    person_titles: ['Owner', 'Founder', 'CEO', 'President', 'Proprietor'],
    q_organization_keyword_tags: ['cleaning service', 'maid service', 'house cleaning', 'residential cleaning', 'commercial cleaning'],
    organization_num_employees_ranges: ['1,20'],
    person_locations: [state + ', United States'],
    contact_email_status: ['verified', 'likely_to_engage'],
    per_page: LEADS_PER_RUN,
    page,
  }

  const data = await request({
    hostname: 'api.apollo.io',
    path: '/api/v1/mixed_people/api_search',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': APOLLO_KEY,
    }
  }, body)

  return data
}

async function enrichLead(apolloId) {
  const data = await request({
    hostname: 'api.apollo.io',
    path: '/api/v1/people/match',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': APOLLO_KEY,
    }
  }, { id: apolloId, reveal_personal_emails: false })

  return data?.person ?? null
}

async function addLeadToInstantly(lead) {
  const body = {
    campaign_id: CAMPAIGN_ID,
    email: lead.email,
    first_name: lead.first_name ?? '',
    last_name: lead.last_name ?? '',
    company_name: lead.organization?.name ?? '',
  }

  const data = await request({
    hostname: 'api.instantly.ai',
    path: '/api/v2/leads',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INSTANTLY_KEY}`,
    }
  }, body)

  return data
}

async function run() {
  console.log('=== CleanCheck Lead Pipeline ===')
  console.log(`Run time: ${new Date().toISOString()}`)

  const contacted = loadContacted()
  console.log(`Already contacted: ${contacted.size} leads`)

  const searchData = await fetchLeads()

  if (!searchData.people?.length) {
    console.log('No leads found from Apollo. Check API key or search filters.')
    return
  }

  console.log(`Found ${searchData.total_entries} total leads. Processing batch...`)

  let added = 0
  let skipped = 0

  for (const person of searchData.people) {
    if (contacted.has(person.id)) {
      skipped++
      continue
    }

    if (!person.has_email) {
      skipped++
      continue
    }

    // Enrich to get actual email
    const enriched = await enrichLead(person.id)
    if (!enriched?.email) {
      skipped++
      continue
    }

    const result = await addLeadToInstantly(enriched)
    if (result?.id) {
      contacted.add(person.id)
      added++
      console.log(`Added: ${enriched.first_name} ${enriched.last_name} at ${enriched.organization?.name ?? 'Unknown'}`)
    } else {
      console.log(`Failed to add ${enriched.first_name}: ${JSON.stringify(result)}`)
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200))
  }

  saveContacted(contacted)
  console.log(`\nDone. Added: ${added} | Skipped: ${skipped}`)
  console.log(`Total contacted to date: ${contacted.size}`)
}

run().catch(console.error)
