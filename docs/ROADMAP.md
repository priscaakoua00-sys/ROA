# Roadmap

## Phase 0 — Technical foundation (this repository) ✅

Delivered and verified (typecheck · lint · tests · production build all green):

- Next.js 15 App Router + React 19 + TypeScript (strict) project.
- Layered architecture with no vendor lock-in.
- Full i18n (NL default · EN · FR) with a working, **persistent** language
  selector (browser detection + `NEXT_LOCALE` cookie) and identical keys across
  all three bundles (enforced by a test).
- Theme system: light / dark / system via next-themes.
- Multi-tenant theming prepared with CSS variables (`--brand` / `--primary`),
  including a `[data-tenant]` override example.
- shadcn/ui components (button, card, badge, dropdown-menu) on Radix.
- Calm, premium witness page proving language, persistence, theme, components,
  responsiveness and basic accessibility.
- `AIProvider` interface + Zod output schemas + `MockAIProvider` (offline, no
  key) + `getAIProvider()` factory.
- Supabase browser/server clients wired with a `server-only` guard (not called).
- Vitest test suite and a GitHub Actions CI workflow.

## Deferred to Phase 1 (explicit)

These were intentionally left out of Phase 0:

- Authentication and sessions.
- Supabase Row Level Security policies and the first real database migrations.
- Final business tables (organizations, members, customers, vehicles, leads,
  appointments, messages, ...).
- Real AI providers (Anthropic / OpenAI) behind the existing interface.
- Any business screens (dashboard, leads list, agenda, assistant).
- Telephony and WhatsApp intake.
- Billing and subscriptions.
- Per-organization theming/branding UI (the CSS mechanism exists; the admin UI
  does not).
- Onboarding flow.

## Phase 1 — First functional product

Account creation; create a garage organization; invite members; configure hours;
manage customers and vehicles; public request form; auto-created leads; leads
list and detail with history, notes and assignment; create appointments; a
simple dashboard; an AI-generated structured lead summary with human handoff on
low confidence. Introduce RLS and the first migrations. Add one real AI provider
behind `AIProvider`.

## Phase 2 — Automation and channels

Automated replies and reminders (configurable, human-reviewed); WhatsApp and/or
telephony intake through provider interfaces; richer availability logic; audit
logging.

## Phase 3 — Scale and intelligence

The three-memory architecture in practice (company / trade / shared-anonymous);
outcome evaluation; billing and subscriptions; multi-trade and multi-country
readiness; groundwork for mobile and voice.

## Known technical notes

- `next lint` is deprecated in favour of the ESLint CLI from Next.js 16 onward;
  migrate the lint script when upgrading Next.
- Fonts use a system stack (no external font fetch at build). A branded font can
  be added later via `next/font/local` without layout changes.
