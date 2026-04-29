# Cleerd Production Setup Checklist

Author: **Manus AI**  
Last updated: **April 28, 2026**

## Purpose

This checklist is the owner-facing path to make Cleerd production-ready without asking Josh to do developer busywork. The product now builds successfully with required public Supabase values present, but live launch still requires account-level credentials and dashboard actions that should not be automated without explicit approval.

## Current Validation Status

| Check | Current Result | Notes |
|---|---:|---|
| `npm run lint` | Passed with warnings | Current warnings are non-blocking inherited warnings; the latest run reported **155 warnings and 0 errors**. |
| `npm run build` | Passed | Production build passes when Supabase public values are present. |
| Billing provider | Stripe-first | Use Lemon Squeezy only if Stripe onboarding blocks launch. |
| Email provider | Resend | Requires a verified sender domain before production customer emails should go live. |

## Required Vercel Environment Variables

The following values should be configured in Vercel for Production, Preview, and Development as appropriate. Secrets should be pasted directly into Vercel and never committed.

| Variable | Required? | Source | Purpose |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project settings | Browser/server Supabase URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase project settings | Public Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase project API settings | Server-only privileged operations, webhooks, invites, cron. |
| `NEXT_PUBLIC_APP_URL` | Yes | Production domain | Absolute app URL, for example `https://cleerd.io`. |
| `CRON_SECRET` | Yes | Generate random value | Protects reminder cron endpoint. |
| `RESEND_API_KEY` | Yes for email | Resend | Sends customer, team, invite, and welcome emails. |
| `FROM_EMAIL` | Yes for email | Resend verified domain | Email-only sender, for example `hello@cleerd.io`. |
| `REPLY_TO_EMAIL` | Recommended | Resend verified domain | Reply inbox, for example `support@cleerd.io`. |
| `STRIPE_SECRET_KEY` | Yes for billing | Stripe Developers dashboard | Creates checkout and portal sessions. |
| `STRIPE_WEBHOOK_SECRET` | Yes for billing | Stripe webhook endpoint signing secret | Verifies Stripe webhook events. |
| `STRIPE_PRICE_SOLO` | Yes for billing | Stripe product price | Solo monthly price ID. |
| `STRIPE_PRICE_GROWTH` | Yes for billing | Stripe product price | Growth monthly price ID. |
| `STRIPE_PRICE_PRO` | Yes for billing | Stripe product price | Pro monthly price ID. |
| `ANTHROPIC_API_KEY` | Yes for AI reports | Anthropic | AI report generation. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional but recommended | Google Cloud | Address autocomplete. |
| `APOLLO_API_KEY` | Optional automation | Apollo | Lead sourcing automation. |
| `INSTANTLY_API_KEY` | Optional automation | Instantly | Cold email campaign automation. |
| `INSTANTLY_CAMPAIGN_ID` | Optional automation | Instantly | Target campaign for automation inserts. |
| `LEADS_PER_RUN` | Optional automation | Vercel/env | Outreach batch size; default should stay conservative. |
| `DRY_RUN` | Yes for automation safety | Vercel/env | Keep `true` until live outreach is approved. |

## Owner-Only Account Steps

| Step | Dashboard | Owner Action |
|---:|---|---|
| 1 | Supabase | Run `supabase-billing-stripe.sql` once, after confirming it targets the production project. |
| 2 | Stripe | Create three monthly recurring products/prices: Solo **$39**, Growth **$69**, and Pro **$99**. |
| 3 | Stripe | Add webhook endpoint `${NEXT_PUBLIC_APP_URL}/api/billing/webhook` and subscribe to checkout/session and subscription lifecycle events. |
| 4 | Stripe | Copy the live secret key, webhook signing secret, and three price IDs into Vercel. |
| 5 | Resend | Verify the production sending domain and create/copy `RESEND_API_KEY`. |
| 6 | Resend | Choose `FROM_EMAIL` and `REPLY_TO_EMAIL`, ideally `hello@cleerd.io` and `support@cleerd.io`. |
| 7 | Vercel | Add all required environment variables and redeploy production. |
| 8 | Namecheap/DNS | Point the launch domain to Vercel and verify HTTPS. |
| 9 | Cleerd app | Create a test account, add one client, one team, one job, and confirm emails work. |
| 10 | Stripe test/live mode | Confirm checkout, webhook plan sync, and customer portal behavior before accepting real users. |

## Recent Launch-Critical Product Updates

The app now includes a shared transactional email helper at `src/lib/email.ts`, non-blocking welcome email delivery after owner signup confirmation, non-blocking team assignment emails when jobs are scheduled, business-agnostic technician role wording, and a corrected Resend sender configuration in `.env.example`. These updates reduce manual customer/team communication while preserving the rule that missing email provider credentials must not block account creation or job scheduling.

## Supabase Secret Key Handling

Supabase secret keys and legacy `service_role` keys are **server-only credentials**. Supabase documents that secret keys provide elevated access and bypass Row Level Security, so they must only live in trusted backend environments such as Vercel environment variables, secured jobs, or private local shells.[^supabase-api-keys] They must never be pasted into source files, committed scripts, logs, chats, screenshots, browser code, or public documents.

| Situation | Required action |
|---|---|
| A key is needed by the deployed app | Store it in Vercel as `SUPABASE_SERVICE_ROLE_KEY`, then redeploy. |
| A key is needed by a one-off local script | Export it in the local shell or load it from a private ignored env file. Do not paste it into the script. |
| A secret key is exposed in GitHub, logs, chat, or screenshots | Create a replacement key in Supabase, update all runtime environments, redeploy/restart consumers, then delete the exposed key. |
| A developer wants to check for obvious committed secrets | Run `npm run scan:secrets` before preparing a patch or commit. |

The destructive reset helper is now committed only as `scripts/reset-supabase.example.mjs`. If a local reset is ever needed, copy it to the ignored path `scripts/reset-supabase.mjs`, then provide `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `RESET_SUPABASE_CONFIRM=delete-all-data` through the local shell. This keeps the utility available for controlled maintenance while avoiding hardcoded credentials, tracked local reset scripts, and accidental resets.

## Live Automation Gate

Growth automation must remain in `DRY_RUN=true` until Josh explicitly approves live sending. Before switching it off, confirm sender-domain health, unsubscribe language, target vertical/state, daily limits, campaign copy, and dedupe behavior. In practical terms: let the robot write drafts, but do not let it sprint into strangers’ inboxes wearing a fake mustache.

[^supabase-api-keys]: Supabase, “Understanding API keys,” https://supabase.com/docs/guides/api/api-keys.
