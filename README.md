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

**Connected to a live Supabase database and covers the full garage workflow, not
just Phase 1.** See [`PILOT_READINESS.md`](./PILOT_READINESS.md) for how to
deploy and test it, and [`docs/AUDIT_REPORT.md`](./docs/AUDIT_REPORT.md) for a
line-by-line, dated account of what's connected vs. simulated vs. still
outstanding.

Built and working (all connected to real data, not mocked UI):
- Authentication: sign up, sign in, sign out, forgot / reset password, email
  callback, sessions, protected routes, rate-limited, state-based redirects.
- Onboarding: create the garage, choose demo data or a real empty start.
- Multi-tenant: RLS enabled on every table, role-gated writes
  (`role_has()`/`manage_*` capabilities), isolated per garage; multi-garage
  accounts supported.
- Public request form, AI-assisted qualification (deterministic emergency
  detection first, then AI summary/urgency), dashboard, agenda, customers,
  vehicles (RDW plate lookup), leads, work orders (13-stage workflow +
  checklists), quotes (public accept/refuse link with proof), invoices
  (PDF, Stripe online payment), inventory/parts, reports (PDF/CSV export),
  automations (suggestions, human sends), team roles, 2FA, activity log,
  customer portal, public API + webhooks, digital business card, email
  signature generator.
- Real AI provider (Anthropic) auto-selected when `ANTHROPIC_API_KEY` is set,
  with a deterministic `MockAIProvider` fallback for development — see
  "Simulated vs. connected" below for exactly what that covers.
- i18n NL / EN / FR everywhere.
- **154 unit tests** (24 files) + **26 Playwright e2e tests** (2 spec files).
  Four green checks: `typecheck`, `lint`, `test`, `build`.
- WhatsApp Business (Cloud API): each organization can connect its OWN
  WhatsApp Business number (Settings > WhatsApp Business) and send real
  messages through it — see `src/integrations/whatsapp/`. Requires the
  organization's own Meta Business Manager account and business
  verification; the code path is real, the account is not included.
- Phone (Twilio): each organization can connect its OWN Twilio phone number
  (Settings > Phone). An inbound call is answered automatically, transcribed,
  qualified by the same AI pipeline as the public web-request form, and
  logged as a lead — see `src/integrations/telephony/`. Requires the
  organization's own Twilio account and phone number; the code path is real,
  the account is not included.

Simulated / not yet connected (see `docs/AUDIT_REPORT.md` for the full,
per-module breakdown): outbound/placed calls and SMS have no integration —
only inbound call answering is built. WhatsApp and phone are both real for
organizations that connect their own account (above); an organization that
hasn't connected WhatsApp still gets the manual `wa.me` click-to-chat link it
always had. Client-facing automations (reminders, follow-ups) are AI-drafted
suggestions a human must send, or now a one-click real send (email or
WhatsApp) — nothing auto-sends to a customer without a click. Stripe
subscription billing is wired end-to-end but commercially disabled during
launch (`LAUNCH_FREE`).

## Roadmap

See [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Tech

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS |
| i18n | next-intl (nl default, en, fr) |
| Data / auth | Supabase (`@supabase/ssr`) with Row Level Security |
| AI | `AIProvider` interface + `AnthropicAIProvider` (real, auto-selected by API key) + `MockAIProvider` (dev fallback) |
| Email | Resend (transactional: invites, quotes, invoices, reminders) |
| Payments | Stripe (invoices live; subscriptions wired, commercially gated) |
| Validation | Zod |
| Tests / CI | Vitest + Playwright + GitHub Actions |

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
- [`docs/AUDIT_REPORT.md`](./docs/AUDIT_REPORT.md): line-by-line acquisition audit.
- [`docs/SELF_HOSTING.md`](./docs/SELF_HOSTING.md): deploy without Vercel/Supabase Cloud.
- [`HANDOVER.md`](./HANDOVER.md): start here if you received this code as a buyer.
