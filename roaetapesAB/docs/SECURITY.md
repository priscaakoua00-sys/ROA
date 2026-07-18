# Security

Roavaa is multi-tenant and will hold customer conversations and business data.
Security is a first-class design constraint, not an afterthought.

## Multi-tenancy isolation

- Every business row is scoped by `organization_id`.
- Isolation is enforced at the database with **Supabase Row Level Security**
  (Phase 1). The application never relies on client-side filtering alone.
- One organization must never read or write another organization's data,
  including through the AI layer.

## Secrets

- Real secrets live only in environment variables, never in the repository.
  `.env.local` is git-ignored; only `.env.example` (placeholders) is committed.
- **Public vs private.** `NEXT_PUBLIC_*` values are exposed to the browser and
  must be safe there (Supabase URL + anon key are protected by RLS). Anything
  secret (service-role key, AI keys) must never carry the `NEXT_PUBLIC_` prefix.
- The Supabase **service-role key** bypasses RLS. It is treated like a master
  password: server-only, used exclusively in dedicated, audited server actions
  (Phase 1), and never imported into a client bundle.

## Server / client boundary

- `src/data/supabase/server.ts` starts with `import 'server-only'`, which turns
  any accidental client import into a build error.
- Components do not call Supabase or the AI provider directly; they go through a
  data-access / service layer. This keeps credentials and trust decisions on the
  server.

## AI safety and limits

- The AI **proposes**, humans **decide**. The assistant never deletes data,
  confirms a repair, promises a fixed price, or invents availability on its own.
- Every provider validates its output against a Zod schema before the app trusts
  it. Unvalidated model output is never used.
- The provider can return `status: 'handoff'`, "I don't know / a human must
  take over", on low confidence, missing information, or a safety trigger.
- **Emergency detection.** Safety-critical keywords (smoke, fire, fuel leak,
  brakes not working, ...) are detected per language. On a match, the assistant
  does not try to resolve the request itself; it hands off and flags immediate
  human contact.
- No AI jargon is ever shown to the user. Prompts, model names and tokens stay
  internal.

## Data protection (direction)

- Collect only what is needed to run the service.
- The "shared memory" (cross-tenant learning) is **anonymized and aggregated**;
  it never exposes one organization's raw data to another.
- Plan for GDPR rights (access, export, deletion) as data models are built in
  Phase 1.

## Dependencies

- Pinned versions and a committed lockfile for reproducible installs.
- Next.js is kept on a patched release line (the initial scaffold was moved off
  a version with a published CVE before first commit).
- CI runs typecheck, lint, tests and a production build on every push and PR.
