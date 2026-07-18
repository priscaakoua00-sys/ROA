# Roavaa

**Roavaa** is a multi-tenant B2B SaaS: an AI-assisted "employee" for small
service businesses. The first vertical is **independent car garages** in the
Netherlands.

Signature (per locale):
- NL: **Reageert. Organiseert. Leert.**
- EN: **Responds. Organizes. Learns.**
- FR: **Répond. Organise. Apprend.**

Core promise: no customer lost because the garage answered too late. Roavaa
responds to every request, organizes the day, and learns the business. The AI
proposes; the human always decides.

> "Roavaa" is the current working name. Run the BOIP/EUIPO trademark check before
> any public print or launch.

## Current state

**Phase 1 (core business) is complete and connected to a live Supabase database.**
See [`PILOT_READINESS.md`](./PILOT_READINESS.md) for how to deploy and test it.

Built and working:
- Authentication: sign up, sign in, sign out, forgot / reset password, email
  callback, sessions, protected routes, state-based redirects.
- Onboarding: create the garage (seeds default hours Mon-Fri 09:00-17:00 and a
  default service).
- Multi-tenant: 15 tables, **RLS enabled on all of them**; each garage is isolated.
- Public request form (`/[locale]/request/[slug]`): creates customer + vehicle +
  lead + conversation + first message + notification.
- Qualification: deterministic emergency detection first, then AI summary/urgency.
- Dashboard with real counts, clickable leads, notifications.
- Lead detail: assign mechanic, create work order, AI-drafted reply (human sends),
  propose free slots + book.
- Agenda, customers (list/search/detail with vehicles + history), team (invite,
  roles, enable/disable), work orders (status, tasks).
- i18n NL / EN / FR everywhere.
- 37 unit tests. Four green checks: `typecheck`, `lint`, `test`, `build`.

Simulated / not yet connected (see PILOT_READINESS.md): the AI provider is a
deterministic **mock** (no real model yet), and no real channels are wired
(email, WhatsApp, phone). "Sending" a reply stores the message; it is not
delivered to the customer. Employee invitations are created but no invite email
is sent yet.

## Roadmap

See [`docs/ROADMAP.md`](./docs/ROADMAP.md). In short: Phase 2 = real AI +
learning + knowledge base; Phase 3 = real channels (email / WhatsApp / phone);
Phase 4 = quotes, invoices, reports, settings, subscriptions. After the garage
vertical is stable, other trades reuse the same architecture.

## Tech

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS |
| i18n | next-intl (nl default, en, fr) |
| Data / auth | Supabase (`@supabase/ssr`) with Row Level Security |
| AI | `AIProvider` interface + `MockAIProvider` (default); real provider via env |
| Validation | Zod |
| Tests / CI | Vitest + GitHub Actions |

## Getting started

```bash
npm install
npm run dev
```

The public marketing landing runs without configuration. The **application**
(login, dashboard, etc.) needs Supabase env values:

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Never commit the `service_role` secret. See [`.env.example`](./.env.example).

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Docs

- [`PILOT_READINESS.md`](./PILOT_READINESS.md): deploy + test the pilot.
- [`docs/PRODUCT.md`](./docs/PRODUCT.md): product principles.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): code structure.
- [`docs/SECURITY.md`](./docs/SECURITY.md): security model.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md): phases.
