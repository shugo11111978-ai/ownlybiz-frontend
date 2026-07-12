# Ownlybiz Deployment Guardrails

This file exists to help future developers, operators, and AI agents distinguish production from staging before making changes. Read it before editing environment URLs, payment/session code, routing, or deploy configuration.

## Live Environments

| Environment | Frontend | Backend |
| --- | --- | --- |
| Production | https://ownlybiz.com | https://ownlybiz-backend-production.up.railway.app |
| Production expert example | https://ownlybiz.com/liran1 | production backend above |
| Production subdomain example | https://liran1.ownlybiz.com | production backend above |
| Production custom domain example | https://lunapsychics.online | production backend above |
| Staging frontend | Vercel preview/staging URL | staging backend below |
| Staging backend | n/a | https://victorious-wisdom-production-a6b0.up.railway.app |

Note: the staging Railway hostname includes the word `production`. Treat the URL above as staging only because it is the known staging backend for this project.

## Current Production Architecture

- Production uses Redis for realtime bus, presence, and background tasks.
- Production uses a Postgres primary/shadow layer with SQLite fallback still present.
- Production storage mode is expected to be `postgres-primary-hybrid`.
- Stripe may intentionally be configured with Stripe test keys while the product is being tested, but that is not the same as staging payment bypass.

## Hard Rules

- Do not deploy staging payment bypass behavior to production.
- Do not point production frontend at the staging backend.
- Do not point staging frontend at the production backend unless that is an explicit, temporary diagnostic action.
- Do not change Stripe, billing, session charging, free minutes, or live media flows without end-to-end QA.
- Do not rename Railway services casually. Internal hostnames and env vars may depend on service names.
- Do not commit database artifacts or temporary local files such as `ownlybiz-staging.db`.

## Frontend-Specific Checks

Before production deploy, verify the built page:

- `window.OWNLYBIZ_API_URL` points to `https://ownlybiz-backend-production.up.railway.app`.
- `window.OWNLYBIZ_WS_URL` points to `wss://ownlybiz-backend-production.up.railway.app`.
- No staging backend URL is present in production HTML.
- No staging payment bypass marker is present in production HTML.
- URL routing works for:
  - `/`
  - `/admin/...`
  - `/dash/{expert-slug}/...`
  - `/{expert-slug}`
  - `/{expert-slug}/book`
  - expert subdomains
  - custom domains

## Routing Notes

Ownlybiz supports these public surfaces:

- Platform marketing/admin on `ownlybiz.com`.
- Expert pages on `ownlybiz.com/{slug}`.
- Expert dashboards on `ownlybiz.com/dash/{slug}`.
- Expert subdomains like `{slug}.ownlybiz.com`.
- Expert custom domains when DNS and Vercel routing are correct.

Custom domain problems can be caused by DNS propagation or registrar configuration even when the app code is correct.

## Branch Names Are Not Environment Proof

A local git branch name can include `staging` or `production` and still not represent the currently deployed environment. Always verify:

- the deployed URL,
- the frontend backend constants,
- the backend health endpoint,
- Railway/Vercel deployment target,
- and the current git remote/commit.

## Safe Production QA Checklist

- Check backend health first.
- Smoke test marketing routes.
- Smoke test expert public page and book page.
- Smoke test expert dashboard login and panel navigation.
- Smoke test live chat and book-later flows with Stripe test card only when production Stripe is intentionally in test mode.
- Verify free-minute display and final receipt/session summary.
- Verify browser console and network logs for unexpected 401/403/500 errors.

When unsure, stop and ask before changing payment, billing, session, Redis, Postgres, Railway, or domain configuration.
