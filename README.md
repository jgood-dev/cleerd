# CleanCheck

Job scheduling and quality tracking software for residential cleaning companies. CleanCheck helps cleaning businesses schedule jobs, manage teams, track checklists and photos, and deliver professional client summaries.

## Features

- **Job Scheduling** — Schedule jobs with property, team, package, date/time, and duration. Recurring jobs (weekly, bi-weekly, monthly) auto-schedule the next visit on completion.
- **Team Availability** — Weekly timeline showing all teams' bookings with overlap detection. Prevents double-booking.
- **Packages & Checklists** — Pre-built cleaning packages with editable checklists per job. Size-based duration multipliers (small/medium/large/XL homes).
- **Photo Documentation** — Before, after, and issue photos captured during the job.
- **Client Reports** — Branded, customer-friendly summaries sent via email: after photos, completed checklist, team info, time on-site, next visit, and a review link.
- **AI Quality Report** — Internal-only AI assessment and score for company use.
- **Appointment Reminders** — Automated email reminders sent to clients before their scheduled appointment (configurable lead time).
- **Booking Confirmation Email** — Automatically emailed to the client when a job is scheduled (date/time, team, duration).
- **Invoice & Payment Tracking** — Mark a job as paid to send the client a paid invoice email. Status shown on the job detail page.
- **Team Management** — Teams with members (name, phone, email, role).
- **Team Logins** — Invite team members by email to access the account. Invites create a CleanCheck account linked to your organization.
- **Properties** — Client locations with owner info, home size, entry instructions, and email for report delivery.

## Stack

- **Framework** — Next.js (App Router)
- **Database & Auth** — Supabase (Postgres + RLS)
- **Email** — Resend
- **Address Autocomplete** — Google Places API (server-side)
- **AI Reports** — Anthropic Claude API
- **Hosting** — Vercel (with Cron for daily reminders)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## Database Migrations

Run these SQL files in order in the Supabase SQL Editor:

1. `supabase-schema.sql` — base schema
2. `supabase-add-property-fields.sql` — owner name, phone on properties
3. `supabase-packages.sql` — packages and package items
4. `supabase-jobs.sql` — jobs table
5. `supabase-jobs-package.sql` — package_id on jobs
6. `supabase-jobs-items.sql` — custom_items on jobs
7. `supabase-duration.sql` — duration and size multipliers
8. `supabase-timezone.sql` — timezone on organizations
9. `supabase-client-report.sql` — client_note, review_link
10. `supabase-recurrence.sql` — recurrence and reminder tracking
11. `supabase-team-member-phone.sql` — phone on team members
12. `supabase-new-features.sql` — entry_notes on properties, payment tracking on jobs, org_members for multi-user login

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
