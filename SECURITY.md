# Security Policy

Author: **Manus AI**

Last updated: **April 29, 2026**

## Secret Handling Standard

Cleerd treats service credentials as production infrastructure, not as source code. Supabase secret keys, legacy `service_role` keys, Stripe secret keys, Resend API keys, Anthropic keys, and webhook secrets must only be stored in trusted secret managers such as Vercel Environment Variables or in private local shells for one-off maintenance. They must never be committed, pasted into scripts, sent through chat, or added to public documentation.

| Credential type | Safe location | Unsafe location |
|---|---|---|
| Supabase secret or `service_role` key | Vercel environment variable named `SUPABASE_SERVICE_ROLE_KEY` | Source files, scripts, browser code, screenshots, logs, chat, or email |
| Stripe secret or webhook key | Vercel environment variables and Stripe dashboard | Client code, docs, or committed test helpers |
| Email and AI provider keys | Vercel environment variables | Local scratch files unless ignored and private |

Supabase documents that secret keys provide elevated access and bypass Row Level Security, which means a leaked key should be treated as a production incident even if the repository is private.[^supabase-api-keys]

## Local Checks Before Committing

Before preparing any patch or commit, run the normal validation commands plus the local secret scan.

```bash
npm run lint
npm run build
npm run scan:secrets
```

The scan is intentionally simple and fast. It does not replace GitHub secret scanning, GitGuardian, or careful review, but it catches obvious committed key patterns before they leave a developer machine.

## Rotation Procedure After Exposure

When a secret is exposed, rotate first and investigate second. For Supabase secret keys, create a new key in the Supabase dashboard, update every runtime environment that uses the old key, redeploy or restart those consumers, then delete the exposed key. After the live credential is invalidated, remove hardcoded usages from the repository, run `npm run scan:secrets`, and consider history cleanup for any repository that contains the exposed value in reachable Git history.

## GitHub Repository Guardrails

GitHub secret scanning should remain enabled for all Cleerd-related repositories. If GitHub or GitGuardian flags a credential, do not close the alert as a false positive unless the credential format is demonstrably synthetic and nonfunctional.

[^supabase-api-keys]: Supabase, “Understanding API keys,” https://supabase.com/docs/guides/api/api-keys.
