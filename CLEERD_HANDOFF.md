# Cleerd Restart Handoff

Author: **Manus AI**  
Last updated: **April 28, 2026**

## Purpose

This document exists so a future conversation can resume Cleerd work without losing context. It should be downloaded, kept with the project, or committed into the repository as `CLEERD_HANDOFF.md`. Sandbox files are useful during this session, but they should not be treated as permanent project memory.

## Current Product Context

Cleerd is a **business-agnostic, mobile-first field-service SaaS** positioned as a competitor to [Jobber](https://www.getjobber.com/). It is no longer cleaning-specific, even though the original repo and some legacy infrastructure still use the CleanCheck name.

The current strategic recommendation is **PWA-first now, native mobile later**. A responsive PWA lets the product validate with real field-service businesses faster, while still supporting the field workflows that matter most: scheduling, job access, proof photos, reports, customer updates, invoicing, and billing. Native mobile should be considered after real usage proves a need for offline job packets, background photo sync, push notifications, geofencing, or technician-native workflows.

## Repository State

| Item | Value |
|---|---|
| GitHub repo | `https://github.com/jgood-dev/cleerd` private repo, `main` branch |
| Sandbox repo path | `/home/ubuntu/cleancheck` |
| Product name | Cleerd |
| Legacy name still present | CleanCheck in repo/infrastructure history and some legacy references |
| Main patch file | `/home/ubuntu/cleerd_launch_automation_patch.diff` |
| Main progress report | `/home/ubuntu/cleerd_owner_progress_report.md` |
| Validation output | `/home/ubuntu/cleerd_validation_output.txt` |
| Production setup checklist | `CLEERD_PRODUCTION_SETUP.md` |

## Work Completed in This Session

The project was audited against the updated Jobber-competitor positioning and Jobber customer review patterns. The committed baseline includes Stripe billing scaffolding, generalized field-service product copy, PWA/mobile metadata, server-side schedule conflict protection, and a safer growth automation pipeline. Billing-stack evaluation is now complete: **Stripe is the recommended production billing provider** for Cleerd unless Stripe onboarding blocks launch.

| Area | Completed Work |
|---|---|
| Competitive research | Reviewed accessible Jobber feedback from Capterra, Software Advice, GetApp, Google Play, and Reddit discussions. |
| Product strategy | Reframed Cleerd as a business-agnostic field-service platform, not a cleaning-only tool. |
| Mobile strategy | Recommended PWA-first, native app later. |
| Billing | Added Stripe checkout, customer portal, webhook route, Stripe helper, billing plan helper, billing UI component, and Supabase billing migration. After comparing Stripe and Lemon Squeezy, keep Stripe because it is more mature for multi-tenant SaaS subscriptions, customer portal flows, webhook lifecycle handling, dunning/invoice events, and future extensibility; Lemon Squeezy remains a fallback only if Stripe account setup blocks launch. |
| Scheduling | Added server-side schedule conflict detection to reduce double-booking risk. |
| PWA | Added manifest and root metadata/viewport support. |
| Automation | Hardened outbound automation to default to dry-run mode with configurable campaigns, vertical/state rotation, dedupe, and safer logs. |
| Environment hygiene | Added `.env.example` and improved `.gitignore` handling for env files and automation state. |
| Transactional email | Added `src/lib/email.ts`, a shared Resend helper with branded email shell rendering, sender/reply-to configuration, HTML escaping helpers, and safer header handling. |
| Owner onboarding | Added a non-blocking welcome email after owner signup confirmation and initial organization creation. |
| Team operations | Added non-blocking job-assignment emails to team members when a scheduled job is created. |
| Business-agnostic polish | Replaced the remaining cleaning-specific team role copy with technician language and changed the appointment-reminder fallback sender to `Your Service Company`. |
| Production checklist | Added `CLEERD_PRODUCTION_SETUP.md` with required Vercel variables, owner-only dashboard steps, and live automation gates. |
| Validation | Lint has warnings only; production build succeeds; automation script syntax check succeeds. |

## Important Files Created or Updated

| Path | Purpose |
|---|---|
| `/home/ubuntu/cleerd_launch_automation_patch.diff` | Apply-ready patch containing staged code changes. |
| `/home/ubuntu/cleerd_owner_progress_report.md` | Full owner-style progress report and deployment handoff. |
| `/home/ubuntu/jobber_review_research_notes.md` | Jobber customer review research notes. |
| `/home/ubuntu/cleerd_owner_product_priorities.md` | Product priorities derived from Jobber review themes. |
| `/home/ubuntu/cleerd_validation_output.txt` | Raw validation output from lint/build/check commands. |
| `/home/ubuntu/cleerd_memory_state_raw.txt` | Raw current repo and artifact state snapshot. |
| `/home/ubuntu/CLEERD_HANDOFF.md` | This restart handoff document. |

## Validation Status

| Check | Status | Notes |
|---|---:|---|
| `npm run lint` | Passed with warnings | Latest validation reports 155 warnings and 0 errors; warnings are inherited non-blocking lint cleanup items. |
| `npm run build` | Passed | Next.js production build completed successfully with placeholder public Supabase values. |
| `node --check automation/pipeline.js` | Passed | Automation script syntax is valid. |

## Next Recommended Actions

The next agent or developer should avoid redoing the audit and should continue from the patch/deployment workflow. The best next move is to apply the patch to a clean branch, review it, then wire live services carefully.

| Priority | Action | Owner Input Needed? |
|---:|---|---:|
| 1 | Apply `cleerd_launch_automation_patch.diff` to a new Git branch and review the diff. | No, unless repo write access is needed. |
| 2 | Rotate any credentials that were previously committed or included in project documentation. | Yes. |
| 3 | Run `supabase-billing-stripe.sql` in Supabase. | Yes, if database access is not available. |
| 4 | Create Stripe products/prices for Solo $29, Growth $79, and Pro $149 monthly tiers; set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_GROWTH`, and `STRIPE_PRICE_PRO` in Vercel. | Yes, because payment credentials and dashboard access are sensitive. |
| 5 | Test Stripe checkout, webhook sync, and customer portal in test mode. | Possibly, depending on account access. |
| 6 | Follow `CLEERD_PRODUCTION_SETUP.md` to configure Vercel, Supabase, Stripe, Resend, DNS, and the final smoke test. | Yes for account credentials and dashboard actions. |
| 7 | Improve mobile job detail flow, blackout/availability controls, and quick-edit workflows. | No. |
| 8 | Keep outbound automation in `DRY_RUN=true` until campaign copy, sender domain, and compliance language are reviewed. | Yes before live sending. |

## Operational Rule for Future Work

Only involve Josh when required for credentials, account access, legal/compliance approval, payment setup, live customer-facing submissions, or decisions that could materially change product positioning. Otherwise, proceed autonomously and keep Josh updated with concise progress reports.

## Restart Prompt for a Future Conversation

If this chat closes, start the next conversation with the following prompt and attach this file plus the patch:

> Continue taking ownership of my Cleerd SaaS project. Cleerd is a business-agnostic, mobile-first field-service SaaS positioned as a Jobber competitor. Read `CLEERD_HANDOFF.md`, apply or review `cleerd_launch_automation_patch.diff`, and continue from the next recommended actions. Only involve me for credentials, account access, live payments, live outreach, or irreversible production changes.

## References

[1]: https://www.getjobber.com/ "Jobber"  
[2]: https://www.capterra.com/p/127994/Jobber/reviews/ "Capterra Jobber Reviews"  
[3]: https://www.softwareadvice.com/field-service/jobber-profile/reviews/ "Software Advice Jobber Reviews"  
[4]: https://www.getapp.com/operations-management-software/a/jobber/ "GetApp Jobber Profile"  
[5]: https://play.google.com/store/apps/details?id=com.getjobber.jobber&hl=en_US "Google Play Jobber App Listing"  
[6]: https://docs.stripe.com/get-started/use-cases/saas-subscriptions "Stripe Docs: Sell subscriptions as a SaaS startup"  
[7]: https://docs.lemonsqueezy.com/guides/developer-guide/customer-portal "Lemon Squeezy Docs: Customer Portal"
