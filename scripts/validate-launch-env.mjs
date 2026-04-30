#!/usr/bin/env node

const productionMode = process.argv.includes('--production') || process.env.NODE_ENV === 'production'

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
  'ANTHROPIC_API_KEY',
  'RESEND_API_KEY',
  'FROM_EMAIL',
  'REPLY_TO_EMAIL',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_SOLO',
  'STRIPE_PRICE_GROWTH',
  'STRIPE_PRICE_PRO',
]

const optionalGrowthAutomation = [
  'APOLLO_API_KEY',
  'INSTANTLY_API_KEY',
  'INSTANTLY_CAMPAIGN_ID',
]

const placeholderPattern = /^(|your_|replace_|sk_test_or_live_|price_xxx|whsec_xxx|hello@yourdomain\.com|support@yourdomain\.com|https:\/\/your-project\.supabase\.co)$/i
const failures = []
const warnings = []

function valueOf(name) {
  return (process.env[name] ?? '').trim()
}

for (const name of required) {
  const value = valueOf(name)
  if (!value) {
    failures.push(`${name} is missing`)
    continue
  }

  if (placeholderPattern.test(value)) {
    failures.push(`${name} still looks like an example placeholder`)
  }
}

const appUrl = valueOf('NEXT_PUBLIC_APP_URL')
if (appUrl) {
  try {
    const parsed = new URL(appUrl)
    if (productionMode && parsed.protocol !== 'https:') {
      failures.push('NEXT_PUBLIC_APP_URL must use https:// for production launch')
    }
    if (productionMode && ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      failures.push('NEXT_PUBLIC_APP_URL must not point to localhost for production launch')
    }
  } catch {
    failures.push('NEXT_PUBLIC_APP_URL must be a valid absolute URL')
  }
}

const supabaseUrl = valueOf('NEXT_PUBLIC_SUPABASE_URL')
if (supabaseUrl && !/^https:\/\/[^/]+\.supabase\.co$/i.test(supabaseUrl)) {
  warnings.push('NEXT_PUBLIC_SUPABASE_URL does not look like a standard Supabase project URL')
}

const fromEmail = valueOf('FROM_EMAIL')
const replyToEmail = valueOf('REPLY_TO_EMAIL')
for (const [name, email] of [['FROM_EMAIL', fromEmail], ['REPLY_TO_EMAIL', replyToEmail]]) {
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    failures.push(`${name} must be a valid email address`)
  }
}

const stripeSecret = valueOf('STRIPE_SECRET_KEY')
if (stripeSecret && !stripeSecret.startsWith('sk_')) {
  failures.push('STRIPE_SECRET_KEY must look like a Stripe secret key')
}
if (productionMode && stripeSecret.startsWith('sk_test_')) {
  failures.push('STRIPE_SECRET_KEY is a test key; use a live Stripe key for production launch')
}

const webhookSecret = valueOf('STRIPE_WEBHOOK_SECRET')
if (webhookSecret && !webhookSecret.startsWith('whsec_')) {
  failures.push('STRIPE_WEBHOOK_SECRET must look like a Stripe webhook signing secret')
}

for (const name of ['STRIPE_PRICE_SOLO', 'STRIPE_PRICE_GROWTH', 'STRIPE_PRICE_PRO']) {
  const value = valueOf(name)
  if (value && !value.startsWith('price_')) {
    failures.push(`${name} must look like a Stripe price ID`)
  }
}

const cronSecret = valueOf('CRON_SECRET')
if (cronSecret && cronSecret.length < 24) {
  failures.push('CRON_SECRET should be at least 24 characters long')
}

if (valueOf('LIVE_OUTREACH_APPROVED') === 'true') {
  for (const name of optionalGrowthAutomation) {
    if (!valueOf(name)) warnings.push(`${name} is required before live outbound automation is enabled`)
  }
  if (valueOf('DRY_RUN') !== 'false') warnings.push('LIVE_OUTREACH_APPROVED is true but DRY_RUN is not false')
}

if (warnings.length) {
  console.warn('Launch environment warnings:')
  for (const warning of warnings) console.warn(`- ${warning}`)
}

if (failures.length) {
  console.error('Launch environment validation failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Launch environment validation passed${productionMode ? ' for production mode' : ''}.`)
