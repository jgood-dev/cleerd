# Cleerd Business Automation Playbook

Cleerd should automate growth and operations only after the core product is stable, billing is live, and sender-domain hygiene is configured. The current automation folder is intentionally staged as a **dry-run-first outbound pipeline** so leads can be inspected before any live outreach is sent.

## Operating Principles

Cleerd competes with Jobber by being simpler, more mobile-first, and less administratively heavy for small field-service teams. Automation should reinforce that positioning by finding owner-operated service businesses, sending relevant messaging, and keeping manual work low without creating compliance or deliverability risk.

| Workflow | Current Status | Owner Action Required | Automation Level |
|---|---:|---|---:|
| Apollo lead discovery | Staged | Add `APOLLO_API_KEY` | Semi-automated |
| Instantly campaign enrollment | Staged | Add `INSTANTLY_API_KEY` and `INSTANTLY_CAMPAIGN_ID` | Dry-run by default |
| Weekly vertical/state rotation | Implemented | None | Automated |
| Deduplication | Implemented through `contacted.json` | Keep file persistent in scheduler | Automated |
| Live sending | Disabled by default | Set `DRY_RUN=false` and `LIVE_OUTREACH_APPROVED=true` only after review | Manual approval |

## Setup

Create `automation/.env` or provide the same variables in the scheduled runtime. Keep `DRY_RUN=true` until the campaign, opt-out text, sending domain, daily limits, and lead filters have been verified.

```bash
APOLLO_API_KEY=your_apollo_api_key
INSTANTLY_API_KEY=your_instantly_api_key
INSTANTLY_CAMPAIGN_ID=your_campaign_id
LEADS_PER_RUN=25
DRY_RUN=true
LIVE_OUTREACH_APPROVED=false
```

Run the pipeline from the automation directory.

```bash
cd automation
npm install
npm run check
npm run dry-run
```

## Launch Guardrails

The pipeline now rotates across field-service verticals rather than staying cleaning-only. It also rotates geography weekly, limits leads per run, tracks contacted Apollo IDs, and defaults to dry-run mode. `LEADS_PER_RUN` is clamped between 1 and 50 so a typo cannot accidentally create a giant batch. This is intentionally conservative because cold outbound can hurt the brand fast if it sends irrelevant copy, exceeds warmed sender limits, or contacts the same company repeatedly.

Before setting `DRY_RUN=false`, verify that the Instantly campaign includes clear opt-out language, uses a warmed domain, has conservative daily volume, and points prospects to the correct Cleerd landing page. Live enrollment also requires `LIVE_OUTREACH_APPROVED=true`, which should only be set after owner approval. The automation should be treated like a very enthusiastic intern: useful, fast, and absolutely capable of embarrassing us if left unsupervised too early.

## Recommended Scheduler

A safe first schedule is once per weekday morning with `LEADS_PER_RUN=10` for the first week, then `25` once deliverability and reply quality look healthy. If running in GitHub Actions or another cron environment, persist `automation/contacted.json` or replace it with a small database table before scaling volume.

## Next Automation Targets

The next high-leverage operations to automate are trial onboarding emails, failed-payment reminders, weekly owner digest emails, review-request campaigns after completed jobs, and in-app activation prompts for teams that schedule jobs but do not complete reports.
