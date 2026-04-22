require('dotenv').config()
const https = require('https')

const INSTANTLY_KEY = process.env.INSTANTLY_API_KEY
const CAMPAIGN_ID = 'b2d3b546-e8bc-4e7d-bec3-0d22a6e7af53'

const payload = {
  name: 'Cleerd - Service Business Owners',
  daily_limit: 30,
  stop_on_reply: true,
  open_tracking: false,
  sequences: [{
    steps: [
      {
        type: 'email',
        delay: 0,
        delay_unit: 'days',
        variants: [{
          subject: 'Quick question about your job documentation, {{first_name}}',
          body: `Hi {{first_name}},

Do you use Google Forms or WhatsApp to track job quality at {{company_name}}?

Most owners we talk to spend 20-30 minutes per job on documentation. We built Cleerd to cut that to under 5 minutes — your team takes photos on their phone, and AI generates a professional report automatically.

Worth a quick look? cleerd.io

Best,
Josh
Cleerd`
        }]
      },
      {
        type: 'email',
        delay: 3,
        delay_unit: 'days',
        variants: [{
          subject: '',
          body: `Hi {{first_name}},

Just following up — I know running a service business keeps you busy.

The short version: Cleerd replaces your inspection paperwork with a mobile app. Your team documents with photos, AI writes the report, and you can send it directly to the client.

Jobber charges $69+/month for the same thing. We start at $39.

14-day free trial at cleerd.io — no card required.

Jason`
        }]
      },
      {
        type: 'email',
        delay: 5,
        delay_unit: 'days',
        variants: [{
          subject: '',
          body: `Hi {{first_name}},

Last note — I promise.

One question: what does your team currently do when a client complains about quality? If the answer involves digging through WhatsApp photos or trying to remember who did what, Cleerd fixes that.

Every job gets timestamped photos and an AI report. Takes 5 minutes. Clients love it.

Free trial: cleerd.io

Josh`
        }]
      }
    ]
  }]
}

const body = JSON.stringify(payload)

const options = {
  hostname: 'api.instantly.ai',
  path: `/api/v2/campaigns/${CAMPAIGN_ID}`,
  method: 'PATCH',
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
    console.log('Response:', data.substring(0, 500))
  })
})

req.on('error', console.error)
req.write(body)
req.end()
