# Cleerd

Cleerd is a business-agnostic, mobile-first field-service SaaS for small operators who need to schedule jobs, manage teams, document work with photos, generate AI quality reports, send client updates, and invoice from one practical workspace.

The product is positioned as a leaner alternative to Jobber for owner-operators and small service teams that want clarity without enterprise bloat or confusing add-ons.

## Core Product Areas

- **Scheduling:** one-time and recurring jobs, team assignment, duration tracking, monthly plan limits, and conflict warnings.
- **Teams:** owner/admin/member access, team limits by plan, and field-worker-focused navigation.
- **Clients and properties:** customer contact details, service addresses, notes, and Google Places autocomplete.
- **Packages and checklists:** reusable service templates with editable task lists and price/duration defaults.
- **Proof of work:** before/after/issue photos, checklist completion, client notes, and shareable public job summaries.
- **AI reports:** Claude-powered quality reports based on job data, checklist completion, and photos.
- **Communication:** booking confirmations, reminders, completion reports, invoices, and review-link requests.
- **Billing:** Stripe checkout, customer portal, and webhook-based subscription sync are staged in code and require live Stripe configuration.

## Environment Variables

Copy `.env.example` to `.env.local` for local development. Do not commit real secrets.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SOLO=
STRIPE_PRICE_GROWTH=
STRIPE_PRICE_PRO=
```

## Database Setup

Run the base schema and follow-up migrations in Supabase SQL Editor. For billing, run:

```sql
-- supabase-billing-stripe.sql
```

The billing migration adds Stripe customer/subscription fields to `organizations` so webhook events can keep plan status in sync.

## Local Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

The current launch track prioritizes secure credentials, Stripe activation, mobile-first job workflow polish, and automation that can run safely without human babysitting. In other words: less “spreadsheet rodeo,” more “business runs while Josh drinks coffee.”
