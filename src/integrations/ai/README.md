# AI layer

The application depends on the `AIProvider` **interface**, never on a vendor SDK.
This keeps the product independent of any single AI company.

## Files

| File | Responsibility |
| --- | --- |
| `types.ts` | Shared types, input contracts, the `AIResult` envelope. |
| `schemas.ts` | Zod schemas for every structured **output** (single source of truth). |
| `provider.ts` | The `AIProvider` interface every provider must implement. |
| `mock-provider.ts` | Offline, deterministic provider for dev/tests/CI. No key, no network. |
| `emergency-keywords.ts` | Safety-critical keyword detection per language. |
| `index.ts` | Public entry point + `getAIProvider()` factory. |

## Guarantees

- **Server-only.** Real providers must never run in the browser.
- **Validated output.** Every provider validates its output with the Zod schema
  before returning. Unvalidated model output is never trusted.
- **Knows its limits.** A provider returns `status: 'handoff'` when it is unsure,
  when information is missing, or on a safety trigger (e.g. emergency keywords).
- **Humans decide.** The AI only proposes; it never deletes data, confirms a
  repair, promises a fixed price, or invents availability.

## Adding a real provider later (Phase 1+)

1. Create `anthropic-provider.ts` (or `openai-provider.ts`) implementing `AIProvider`.
2. Read the API key **only** from `process.env` on the server (e.g. `ANTHROPIC_API_KEY`).
3. Ask the model for JSON, then `schema.parse(...)` the result. On parse failure,
   return `status: 'handoff'`: never pass raw output downstream.
4. Register it in the `switch` inside `getAIProvider()`.
5. Set `AI_PROVIDER="anthropic"` (or `"openai"`) in the environment.

No change is required anywhere else in the app.
