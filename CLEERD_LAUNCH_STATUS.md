# Cleerd Launch Status

Updated by **Manus AI** on 2026-04-30.

## Production Validation Summary

The latest Vercel production deployment is live after correcting the Stripe pricing mismatch. The live homepage now reflects the production Stripe products: **Solo at $39**, **Growth at $69**, and **Pro at $99** per month. The production environment variables were re-pulled and shape-checked after the redeploy; the Stripe price variables now use `price_` IDs rather than `prod_` IDs.

| Area | Status | Notes |
|---|---:|---|
| Vercel production deploy | Passed | Corrected pricing build was deployed to production. |
| Public route smoke checks | Passed | Public pages returned successful responses in the production smoke matrix. |
| Stripe webhook route | Passed safe check | Unauthenticated POST produced the expected safe failure path, confirming the webhook route and secret wiring are present without exposing secret values. |
| Protected cron route | Passed | Authenticated cron smoke check succeeded using the production `CRON_SECRET`. |
| Pricing consistency | Passed | Application pricing copy and billing plan values now match the live Stripe products. |
| Supabase email template file | Updated | `supabase-email-confirm.html` now uses Cleerd branding and `cleerd.io` contact/domain references. This still needs to be pasted into Supabase Auth templates by the account owner. |

## Changes Made Locally

The following repository files currently have local modifications or untracked handoff files. No commit was created during this autonomous pass.

| Path | Reason |
|---|---|
| `src/app/page.tsx` | Updated homepage pricing text to match the Stripe products. |
| `src/lib/billing.ts` | Updated billing plan amounts/copy to match the Stripe products. |
| `supabase-email-confirm.html` | Rebranded the Supabase confirmation email template from CleanCheck to Cleerd. |
| `AGENTS.md`, `CLAUDE.md`, `.claude/`, `CLAUDE_HANDOFF.md`, `CLAUDE_STATUS.md` | Existing local coordination/instruction files from the current launch workflow. Review before committing if desired. |
| `CLEERD_LAUNCH_STATUS.md` | This status handoff document. |

## Remaining Account Actions

These are the only meaningful blockers I could not complete autonomously because they require dashboard access or owner judgment.

| Priority | Action | Where | Notes |
|---:|---|---|---|
| 1 | Paste the updated confirmation email HTML into the Supabase Auth email template. | Supabase Dashboard → Authentication → Email Templates → Confirm signup | Use `supabase-email-confirm.html` from the repo. |
| 2 | Confirm Supabase production auth URLs. | Supabase Dashboard → Authentication → URL Configuration | Site URL should be `https://www.cleerd.io`. Add redirect URLs for `https://www.cleerd.io/**` and the Vercel production domain if Supabase requires explicit redirects. |
| 3 | Confirm Resend domain verification and sender. | Resend Dashboard → Domains / API Keys | Production email should use a verified `cleerd.io` sender, preferably `support@cleerd.io` or `hello@cleerd.io`. |
| 4 | Run one real owner signup and checkout test when ready. | Live site + Stripe Dashboard | This is the first end-to-end human test after dashboard-side Supabase/Resend settings are done. |

## Git Handoff

Current working tree summary at the time of writing showed modified tracked files and several untracked coordination files. If you want one launch commit, review with `git diff` first, then commit only the intended files. A reasonable commit would include `src/app/page.tsx`, `src/lib/billing.ts`, `supabase-email-confirm.html`, and this `CLEERD_LAUNCH_STATUS.md` file. Include the Claude coordination files only if you actually want them preserved in the repository.

```powershell
cd C:\Users\goodw\OneDrive\Desktop\Cleerd\cleerd
git status --short
git diff -- src/app/page.tsx src/lib/billing.ts supabase-email-confirm.html
git add src/app/page.tsx src/lib/billing.ts supabase-email-confirm.html CLEERD_LAUNCH_STATUS.md
git commit -m "Align production pricing and launch email branding"
git push
```

## Bottom Line

Cleerd production is substantially ready from the application side. The remaining work is mostly dashboard polish: Supabase Auth email/URL settings, Resend sender-domain confirmation, and one real end-to-end signup plus checkout test. The app did not spontaneously become a money printer while Josh was gone, but it is at least wearing pants and answering production traffic now.
