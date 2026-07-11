# Architecture

## Principles

- Clear separation of concerns. Presentation, business logic, data access,
  external integrations, automation, AI, auth, logging and scheduled jobs are
  distinct layers.
- **No vendor lock-in.** The app depends on interfaces, not SDKs. AI, messaging,
  telephony and payments are reached through abstractions so a provider can be
  swapped without breaking the app.
- **Never call Supabase or the AI directly from React components.** Components go
  through a data-access / service layer.
- Multi-tenant from day one. Every business row is scoped by `organization_id`,
  enforced by Supabase Row Level Security (Phase 1).

## Layers (folder map)

```
src/
├── app/[locale]/        Presentation (App Router, locale-scoped)
│   ├── layout.tsx       Root layout: i18n provider + theme provider
│   ├── page.tsx         Phase 0 witness page
│   └── globals.css      Design tokens (light/dark) + multi-tenant CSS vars
├── components/          UI (shadcn/ui in components/ui, app components alongside)
├── core/                Business logic (framework-agnostic) — Phase 1
├── data/
│   └── supabase/        Data access: browser + server clients (server-only guard)
├── integrations/
│   └── ai/              AI abstraction (interface, schemas, mock, factory)
├── i18n/                routing, navigation, request config
├── lib/                 utilities (cn, ...)
└── middleware.ts        next-intl locale detection + persistence
```

Not yet created (added as needed in later phases): `automation/`, `auth/`,
`audit/`, `jobs/`.

## Internationalization

- `next-intl` with locales `['nl', 'en', 'fr']`, default `nl`,
  `localePrefix: 'always'` (URLs are `/nl`, `/en`, `/fr`).
- Strings live in `messages/{nl,en,fr}.json` — never hard-coded in components.
  A test enforces identical keys across all three bundles.
- The middleware detects the browser language, persists the manual choice in the
  `NEXT_LOCALE` cookie, and redirects `/` accordingly.
- Adding a locale (e.g. `de`) = add it to `routing.locales` + a `de.json`
  bundle. No component change.

## Theming (multi-tenant ready)

- Colors and radius are CSS variables in `globals.css`, consumed by Tailwind via
  `hsl(var(--token))`. Light and dark are full token sets.
- `--brand` defaults to `--primary`. A per-tenant theme (Phase 1) overrides
  `--primary` / `--brand` on a wrapper element at runtime — no component change.
  A `[data-tenant='demo']` example proves the mechanism.
- `next-themes` provides light / dark / system with no flash and respects
  `prefers-reduced-motion` (handled globally in CSS).

## AI layer

The app imports only from `@/integrations/ai`.

```
integrations/ai/
├── types.ts               shared types + AIResult envelope + inputs
├── schemas.ts             Zod schemas for every structured output (source of truth)
├── provider.ts            AIProvider interface
├── mock-provider.ts       offline deterministic provider (Phase 0 default)
├── emergency-keywords.ts  safety-critical keyword detection per language
└── index.ts               getAIProvider() factory
```

- `AIResult<T>` is a discriminated union: `ok` | `handoff` | `error`. `handoff`
  encodes "I don't know / a human must take over" (low confidence, missing info,
  safety trigger).
- Providers validate output with the Zod schema before returning. Raw model
  output is never trusted.
- Phase 0 ships only `MockAIProvider` — no key, no network. `getAIProvider()`
  will select a real provider from `process.env.AI_PROVIDER` in Phase 1.

## Data layer

- `data/supabase/client.ts` — browser client (anon key, RLS-protected).
- `data/supabase/server.ts` — server client with `import 'server-only'` so it
  cannot be imported into a client bundle. The service-role key is intentionally
  **not** used here; it belongs to dedicated audited server actions (Phase 1).
- Both read env at call-time and are not invoked anywhere in Phase 0, so
  install/build stay green without real credentials.

## The three memories (intelligence roadmap)

A responsible learning design, prepared but not built in Phase 0:

1. **Company memory** — this garage's hours, team, tone, preferences, approved
   replies, corrections. Stays scoped to the organization.
2. **Trade memory** — repairs, parts, urgencies, common qualification questions.
3. **Shared memory** — anonymized, aggregated, GDPR-compliant global trends
   (best follow-up time, effective reminders, phrasings that convert).

Early versions do **not** retrain a model automatically. Intelligence grows via
structured memory, a knowledge base, correction history, contextual retrieval,
versioned prompts, business rules and outcome evaluation.

## Data flow (rendering)

1. Request hits `middleware.ts` → locale resolved (cookie / browser / default).
2. `app/[locale]/layout.tsx` loads the message bundle and wraps children in the
   i18n and theme providers.
3. Server components read translations; client components (switchers) use the
   i18n client provider. No component talks to Supabase or the AI directly.
