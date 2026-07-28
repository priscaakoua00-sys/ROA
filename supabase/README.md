# Database migrations

Every schema change ROAVAA has ever made is versioned here, in
`supabase/migrations/`, one file per migration, named `<timestamp>_<name>.sql`
and applied in that order. This is the same history Supabase's own migration
tracker (`supabase_migrations.schema_migrations`) holds — these files were
generated directly from it, so they are the actual SQL that ran, not a
reconstruction.

## Why this exists

Until now, every migration was applied straight to the live database via the
Supabase MCP tooling and only lived in Supabase's internal history — nothing
was committed to git. That meant:

- No code review for schema changes.
- No way to diff two points in time without querying the live database.
- No local/staging environment could be rebuilt from source control alone.
- A new engineer (or a buyer's technical reviewer) had no way to read the
  schema's evolution without direct database access.

This directory fixes that: the full schema history is now part of the
repository, reviewable in the same PRs as the application code that depends
on it.

## Applying migrations

Using the Supabase CLI against a project (local or remote):

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Or apply a single file directly with `psql` / the Supabase SQL editor, in
filename order, starting from wherever the target database's history ends.

## Adding a new migration

1. Write the SQL as a new file: `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`.
   Use a timestamp later than the last file so ordering stays chronological.
2. Apply it to the project (Supabase MCP `apply_migration`, or the CLI/SQL
   editor).
3. Commit the file alongside the application code that depends on it, in the
   same PR.

## Rollback

Postgres migrations here are additive (new tables/columns/policies), which is
deliberately the safest default — nothing already in production is dropped or
renamed in place. If a migration needs to be undone:

- If nothing has read/written the new objects yet, drop them in a new,
  separate migration file (`drop table if exists ...`) rather than editing or
  deleting the original file — the history must stay append-only so it keeps
  matching what actually ran in production.
- If the change is already in use, prefer a forward-fixing migration (adjust
  the schema to the corrected shape) over a destructive rollback, to avoid
  losing data written under the old shape.
- Before either, check `mcp__Supabase__get_advisors` and confirm the affected
  tables' row counts — a migration touching empty or near-empty tables is much
  cheaper to safely undo than one touching live customer data.
