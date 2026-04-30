# Cleerd

Cleerd is a business-agnostic, mobile-first field-service SaaS for small operators who need to schedule jobs, manage teams, document work with photos, generate AI quality reports, send client updates, and invoice from one practical workspace.

The product is positioned as a leaner alternative to Jobber for owner-operators and small service teams that want clarity without enterprise bloat or confusing add-ons.

## Core Product Areas

| Area | Launch Scope |
| --- | --- |
| Scheduling | One-time and recurring jobs, team assignment, duration tracking, monthly plan limits, and conflict warnings. |
| Teams | Owner/admin/member access, team limits by plan, and field-worker-focused navigation. |
| Clients and properties | Customer contact details, service addresses, notes, and Google Places autocomplete. |
| Packages and checklists | Reusable service templates with editable task lists and price/duration defaults. |
| Proof of work | Before/after/issue photos, checklist completion, client notes, and shareable public job summaries. |
| AI reports | Claude-powered quality reports based on job data, checklist completion, and photos. |
| Communication | Booking confirmations, reminders, completion reports, invoices, and review-link requests. |
| Billing | Stripe checkout, customer portal, and webhook-based subscription sync. |

## Environment Variables

Copy `.env.example` to `.env.local` for local development. Do not commit real secrets. For production, configure the same variables in Vercel and run `npm run validate:launch-env` with production values loaded before enabling live traffic.

| Variable | Required For | Launch Note |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client and admin access | Must point to the production Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server Supabase client | Use the production anon key only. |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, analytics, public report lookup, and scheduled jobs | Keep server-only. Never expose it in browser code or client logs. |
| `NEXT_PUBLIC_APP_URL` | Email links and Stripe redirects | Must be the production `https://` app URL before launch. |
| `CRON_SECRET` | Scheduled reminder endpoint | Use a long random value and configure the same value for Vercel Cron authorization. |
| `ANTHROPIC_API_KEY` | AI quality reports | Required for report generation. |
| `RESEND_API_KEY` | Transactional emails | Required for invites, confirmations, reminders, reports, and invoices. |
| `FROM_EMAIL` | Transactional emails | Must use a verified sending domain. |
| `REPLY_TO_EMAIL` | Transactional emails | Should route customer replies to the operator or support inbox. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Address autocomplete | Should be restricted to the production domain in Google Cloud. |
| `STRIPE_SECRET_KEY` | Checkout and billing portal | Use a live key for production launch. |
| `STRIPE_WEBHOOK_SECRET` | Billing webhook signature verification | Must come from the production Stripe webhook endpoint. |
| `STRIPE_PRICE_SOLO` | Solo plan checkout | Must be a live Stripe price ID. |
| `STRIPE_PRICE_GROWTH` | Growth plan checkout | Must be a live Stripe price ID. |
| `STRIPE_PRICE_PRO` | Pro plan checkout | Must be a live Stripe price ID. |

The optional outbound-growth variables in `.env.example` are intentionally separated from the product launch path. Keep `DRY_RUN=true` and `LIVE_OUTREACH_APPROVED=false` until sender domains, opt-out language, campaign limits, and compliance decisions have been manually approved.

## Database Setup

Run the SQL files in Supabase SQL Editor before enabling production traffic. The existing SQL files are intentionally plain SQL so they can be reviewed and applied manually to the production project.

| Order | File | Purpose |
| --- | --- | --- |
| 1 | Base schema files already used by the project | Creates the core organizations, jobs, teams, properties, inspections, and storage structures. |
| 2 | `supabase-billing-stripe.sql` | Adds Stripe customer, subscription, status, and period fields to `organizations`. |
| 3 | `supabase-add-share-token.sql` | Adds tokenized public report sharing support without broad public report read policies. |
| 4 | `supabase-harden-public-reports.sql` | Removes legacy broad public report RLS policies if they were previously applied. |

After applying SQL, verify that public reports still load through `/report/[token]`, that authenticated users can only see their own organization data, and that Stripe webhook events can update the matching organization row.

## Deployment Runbook

The production launch path is Vercel for the Next.js app, Supabase for auth/database/storage, Stripe for billing, Resend for transactional email, Anthropic for AI reports, and Google Maps for autocomplete. Configure production credentials first, then deploy, then run smoke tests against the deployed URL.

| Step | Command or Location | Expected Result |
| --- | --- | --- |
| Install dependencies | `npm install` | Dependencies install without lockfile conflicts. |
| Validate code | `npm run lint` | Lint finishes with no errors. Existing warnings should be reviewed but do not block the current launch track. |
| Build production bundle | `npm run build` | Next.js production build completes successfully. |
| Scan tracked files for secrets | `npm run scan:secrets` | No obvious committed secrets are found. |
| Validate production env | `npm run validate:launch-env` | Required production variables are present, non-placeholder, and launch-safe. |
| Deploy | Vercel project connected to this repository | Production deployment completes and uses the production environment variables. |
| Configure Stripe webhook | `/api/billing/webhook` on the production domain | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` events are delivered successfully. |
| Configure Vercel Cron | `vercel.json` path `/api/cron/reminders` | Daily reminder job receives the configured bearer secret and returns a JSON sent count. |

## Smoke Test Checklist

Perform the smoke tests with a real production-style account before announcing launch. These checks are intentionally focused on revenue, customer communication, and data isolation because those are the flows that most directly affect launch trust.

| Flow | Check |
| --- | --- |
| Signup and login | A new user can create an account, confirm email, and land in the app. |
| Organization setup | The user can create or join an organization and cannot access another organization by guessing IDs. |
| Team management | Owners can create teams, invite members, update roles, and remove members. Pending invites should not grant access until accepted. |
| Job workflow | A user can create a property, schedule a job, complete checklist items, and attach photos. |
| AI report | Report generation succeeds when `ANTHROPIC_API_KEY` is configured and fails cleanly if it is not. |
| Client communication | Confirmation, reminder, report, and invoice emails send through the shared transactional email helper. |
| Public report | The tokenized report URL works, and non-token public report table reads are not broadly exposed. |
| Billing | Owner-only checkout creates a Stripe subscription, the webhook syncs plan state, and the billing portal opens for the same organization. |

## Local Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
npm run scan:secrets
npm run validate:launch-env
```

The current launch track prioritizes secure credentials, Stripe activation, mobile-first job workflow polish, and automation that can run safely without human babysitting. In other words: less “spreadsheet rodeo,” more “business runs while Josh drinks coffee.”
