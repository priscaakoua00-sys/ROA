# End-to-end tests (Playwright)

`npm run test:e2e` boots a real `next dev` server on port 4300 and drives it
with a real browser (Chromium). These are genuine end-to-end tests, not
mocked network responses — every request in this suite hits the real
middleware, real page components, and (for auth checks) the real Supabase
project's anonymous auth endpoint.

## What's covered today

- **Public pages** (`public-pages.spec.ts`): the landing page and pricing
  page render correctly in all three locales (nl/en/fr), and the right
  language is served at the right URL.
- **Auth guards** (`auth-guards.spec.ts`): every protected route (dashboard,
  settings, customers, vehicles, work orders, invoices, quotes, inventory,
  agenda, leads, knowledge, automations, reports, team, notifications)
  correctly bounces a signed-out visitor to `/login`, and the login/signup
  pages render their forms.

No test in this suite signs up, logs in, or writes any data — only
anonymous, read-only requests. Nothing here touches production data.

## What's deliberately not covered yet

The 12 core business flows (signup + garage creation, customer + vehicle
creation, request creation, quote creation + public accept + lock, quote →
work order/invoice conversion, Stripe payment + webhook, employee invite +
linking, full repair-order lifecycle, inventory management, customer portal,
cross-garage isolation) all require creating real rows: a real signup, a real
organization, real customers/vehicles/quotes/invoices.

This repo has exactly **one** configured Supabase project
(`NEXT_PUBLIC_SUPABASE_URL` in `.env.local`). Its own auth logs confirm it is
**actively serving live production traffic** right now (real logins from real
accounts, referer `roavaa.com`), not a dormant pre-launch database — so this
is not a theoretical risk. Automating signup/create/delete flows against it
would create and remove real rows in a database with real users on it — the
founder has explicitly **not** authorized that, including for a one-off
manual click-through. A dedicated Supabase branch for isolated e2e testing is
a billed feature and likewise needs explicit sign-off before creation.

**Until an isolated staging project or branch is connected and authorized,
these 12 flows stay unautomated, and no manual click-through has been done
against production either. Do not present them as covered or manually
verified.** `business-flows.spec.ts` in this directory lists each one as
`test.fixme(...)` — Playwright reports them as fixme, not passing — so the
gap stays visible in `npx playwright test --list` instead of silently
disappearing. Coverage for these flows today comes only from unit tests
(`npx vitest run`) and manual code reading, documented per-flow in
`docs/AUDIT_REPORT.md`.

## Connecting a staging environment later

1. Create a separate Supabase project, or a development branch of the
   existing one, dedicated to e2e testing.
2. Copy `.env.local` to `.env.e2e.local` and point
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY` at that staging project instead.
   `playwright.config.ts` loads `.env.e2e.local` in preference to
   `.env.local` when present — no other config change is needed.
3. Implement each flow in `business-flows.spec.ts` for real and remove its
   `test.fixme(...)`. Because the staging project is isolated, tests are
   free to create and delete rows (e.g. in `test.afterEach`) without any
   risk to real data.

## Running locally

```bash
npm run test:e2e
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
the environment (`.env.e2e.local` if present, else `.env.local`) — the anon
key is a public, RLS-protected credential, safe to use here and in CI.
