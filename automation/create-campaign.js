require('dotenv').config()
const https = require('https')

const INSTANTLY_KEY = process.env.INSTANTLY_API_KEY

const payload = {
  name: 'CleanCheck Outreach',
  daily_limit: 30,
  stop_on_reply: true,
  open_tracking: false,
  campaign_schedule: {
    schedules: [{
      name: 'Weekdays',
      timing: { from: '08:00', to: '17:00' },
      days: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
      timezone: 'America/New_York'
    }]
  },
  sequences: [{
    steps: [
      {
        type: 'email',
        delay: 0,
        delay_unit: 'days',
        variants: [{
          subject: 'Quick question about your QC process, {{first_name}}',
          body: `Hi {{first_name}},\n\nDo you use Google Forms or WhatsApp to track cleaning quality at {{company_name}}?\n\nMost owners I talk to spend 20-30 minutes per job on documentation. I built CleanCheck to cut that to under 5 minutes — your team takes photos on their phone, and AI generates a professional report automatically.\n\nWorth a quick look? cleancheck.io\n\nBest,\nJason`
        }]
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        variants: [{
          subject: '',
          body: `Hi {{first_name}},\n\nJust following up — I know running a cleaning business keeps you busy.\n\nCleanCheck replaces your inspection paperwork with a mobile app. Your team documents with photos, AI writes the report, and you can send it directly to the client.\n\nOrangeQC charges $250+/month for the same thing. CleanCheck starts at $49.\n\n14-day free trial at cleancheck.io — no card required.\n\nJason`
        }]
      },
      {
        type: 'email',
        delay: 5,
        delay_unit: 'days',
        variants: [{
          subject: '',
          body: `Hi {{first_name}},\n\nLast one — I promise.\n\nWhat does your team do when a client complains about quality? If the answer involves digging through WhatsApp photos or trying to remember who cleaned what, CleanCheck solves that.\n\nEvery job gets timestamped photos and an AI-written report. Takes 5 minutes. Clients love it.\n\nFree trial: cleancheck.io\n\nJason`
        }]
      }
    ]
  }]
}

const body = JSON.stringify(payload)

const options = {
  hostname: 'api.instantly.ai',
  path: '/api/v2/campaigns',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Authorization': `Bearer ${INSTANTLY_KEY}`,
  }
}

const req = https.request(options, res => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    console.log('Status:', res.statusCode)
    console.log(data)
  })
})

req.on('error', console.error)
req.write(body)
req.end()
