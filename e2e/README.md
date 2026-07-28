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

Testing the authenticated flows that matter most commercially — create a
vehicle, run a work order through its stages, issue an invoice, take an
online payment — means either signing in against a real database or
building a fake data layer the app can be pointed at in test mode. Both are
real scope: a disposable Supabase branch per test run (a few cents per run)
or a mock-mode refactor of the data layer. This is flagged as the natural
next step, not silently skipped.

## Running locally

```bash
npm run test:e2e
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
the environment (or `.env.local`) — the anon key is a public, RLS-protected
credential, safe to use here and in CI.
