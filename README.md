# ROA

**ROA — Responds. Organizes. Learns.**
The brand name is **ROA**, built from its three promises:

- **R**esponds (FR: Répond · NL: Reageert)
- **O**rganizes (FR: Organise · NL: Organiseert)
- **A**pprend / Learns (FR: Apprend · NL: Leert)

The brand name **ROA** is identical in every language. Only the slogan is
translated:

| Language | Slogan |
| --- | --- |
| French | Répond. Organise. Apprend. |
| Dutch | Reageert. Organiseert. Leert. |
| English | Responds. Organizes. Learns. |

ROA is a multi-tenant B2B SaaS: an **AI employee for small and medium
businesses**. The first product targets independent car garages in the
Netherlands. Its first mission is simple: **no lead is ever lost because the
garage did not answer fast enough.**

This repository currently contains **Phase 0 — the technical foundation only**.
There is intentionally no authentication, no business screens, no telephony, no
WhatsApp, no billing and no real AI yet.

---

## Product philosophy

- Simplicity beats a long feature list.
- Trust beats artificial intelligence.
- Speed beats animation.
- The result for the customer beats the technology used.
- ROA removes repetitive tasks so entrepreneurs focus on their craft and their
  customers. It is not built to replace them.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 + CSS variables (multi-tenant ready) |
| Components | shadcn/ui (Radix primitives) |
| i18n | next-intl (NL default · EN · FR) |
| Theming | next-themes (light / dark / system) |
| Validation | Zod (shared client + server) |
| Data (wired, unused in Phase 0) | Supabase (`@supabase/ssr`) |
| AI (interface only in Phase 0) | `AIProvider` abstraction + `MockAIProvider` |
| Tests | Vitest |
| CI | GitHub Actions |
| Hosting | Vercel |

## Prerequisites

- Node.js **22+**
- npm **10+**

## Local installation

```bash
git clone <your-repo-url> roa
cd roa
npm install
cp .env.example .env.local   # optional in Phase 0 — no real values required
npm run dev                  # http://localhost:3000  (redirects to /nl)
```

Open `http://localhost:3000`. You land on `/nl`. Use the language selector (top
right) to switch NL · EN · FR — the choice is remembered via a cookie. Use the
theme toggle for light / dark / system.

## Environment variables

See [`.env.example`](./.env.example). **Phase 0 requires none of them** to
install, test or build. They are documented now so Phase 1 can wire Supabase and
a real AI provider without restructuring. Never commit real secrets; never
prefix a server secret with `NEXT_PUBLIC_`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (Next config) |
| `npm test` | Run the unit tests once |
| `npm run test:watch` | Tests in watch mode |
| `npm run format` | Prettier write |

## Branch strategy

- `main` — always deployable; protected; production deploys.
- `develop` — integration branch for Phase work.
- `feat/*`, `fix/*`, `chore/*` — short-lived branches merged via PR into
  `develop`. CI (typecheck · lint · test · build) must be green before merge.

## Deployment

Hosted on **Vercel**, connected to GitHub. Every push to `main` triggers a
production deploy; every PR gets a preview deploy. See the delivery notes for the
exact GitHub and Vercel steps.

## Documentation

- [`docs/PRODUCT.md`](./docs/PRODUCT.md) — vision, scope, philosophy.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — layers, i18n, AI, data.
- [`docs/SECURITY.md`](./docs/SECURITY.md) — multi-tenancy, secrets, AI limits.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phases and deferred decisions.

## License

Private and proprietary. Internal foundation build — not for production.
