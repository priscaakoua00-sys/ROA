# Roadmap

> Corrected 2026-07-29 after a full audit (see `docs/AUDIT_REPORT.md`) found
> this file badly out of date — it described an early Phase-1 snapshot while
> quotes, invoices, reports, automations, settings, and subscriptions were all
> already built and connected.

## Phase 1: Core business (DONE) ✅

- Authentication (sign up / in / out, forgot + reset password, email callback,
  sessions, route protection, rate limiting, state-based redirects).
- Organizations + multi-tenant model; **RLS on every table** (48 at last
  count), role-gated writes via `role_has()`, org isolation via
  `current_user_org_ids()`. Multi-garage accounts supported.
- Onboarding (create garage, default hours + default service seeded, choice of
  demo data or a real empty start).
- Customers, vehicles (RDW plate lookup, indicative valuation), full history.
- Leads: public request form, deterministic emergency detection, AI
  qualification, dashboard, lead detail.
- Team: members, invitations (real email, auto-joins the right garage on
  signup), roles, enable / disable; assign a mechanic.
- Appointments: availability engine, proposed slots, booking, agenda.
- Work orders: 13-stage workflow, checklists (gated before "delivered"),
  task assignment.
- Conversations: thread + AI-drafted reply (human validates and sends).
- Dashboard with real counts + notifications.
- i18n NL / EN / FR. **146 unit tests** (23 files) + **26 Playwright e2e
  tests** (2 spec files). Four green checks: typecheck, lint, test, build.

## Phase 2: Real intelligence (DONE) ✅

- Real `AnthropicAIProvider` behind the `AIProvider` interface, auto-selected
  whenever `ANTHROPIC_API_KEY` is set; `MockAIProvider` remains the
  deterministic dev-only fallback, never silently used in place of a
  configured real provider.
- Learning loop: `repair_outcomes` capture per delivered work order, fed back
  into future diagnoses as ranked hypotheses with probability + reasoning.
- Business knowledge base (per-organization articles: common failures, repair
  times, parts, FAQ, safety rules).
- Remaining: no admin-facing indicator of which provider is currently active,
  and `ai_usage_log` doesn't yet record a prompt-version field — both tracked
  as follow-up work.

## Phase 3: Connections (PARTIALLY DONE)

- Real email delivery (Resend): quotes, invoice payment reminders, quote
  reminders, and team invitations all send a real message today.
- Employee invitation emails: done, including auto-join on signup.
- Notification delivery: in-app only; email digest not built.
- **WhatsApp: real send capability added 2026-08-04** — each organization
  connects its own WhatsApp Business Cloud API number (Settings > WhatsApp
  Business); requires their own verified Meta Business Manager account. An
  organization that hasn't connected one keeps the manual `wa.me` link.
- **Phone: automatic inbound call answering added 2026-08-04** — each
  organization connects its own Twilio phone number (Settings > Phone); an
  inbound call is answered, transcribed, AI-qualified, and logged as a lead
  automatically. Requires their own Twilio account. Outbound calls and SMS
  are not built.
- **Still not connected**: outbound calls, SMS. Client-facing automations
  (appointment reminders, follow-ups, reactivation) remain AI-drafted
  suggestions that a human must send (now with a one-click real send by
  email or WhatsApp on the follow-ups page for payment reminders); nothing
  auto-sends to a customer today. Calendar sync with an external calendar is
  not built.

## Phase 4: Advanced modules (DONE) ✅

- Quotes: full lifecycle (create, line items, VAT, PDF in 3 languages, public
  accept/refuse link with IP + timestamp proof, locked after response,
  conversion to work order/invoice). No archive/soft-delete yet.
- Invoices: numbering, Dutch legal fields, line items, Stripe online payment,
  payment reminders, audit-logged status changes; "paid" only reachable
  through an action that records a real payment.
- Reports: real revenue (paid amounts, not quotes), PDF/CSV export, period
  filters.
- Automations: daily suggestions (reminders, no-response follow-up,
  post-repair follow-up, reactivation) — advisory only, see Phase 3.
- Full garage settings: company identity, hours, services, checklist
  templates — writes now require owner/admin/manager (`role_has`), reads stay
  open to every member who needs them to do their job.
- Subscriptions: Stripe checkout, activation, renewal, cancellation, and
  idempotent webhooks are all built and working; billing is commercially
  disabled during launch (`LAUNCH_FREE`), which is a deliberate business
  decision, not a technical gap.

## Phase 5: Remaining gaps (tracked, not yet done)

- Outbound calling and SMS (would need real per-minute/per-message budget on
  each organization's own Twilio account — inbound call answering itself is
  done as of 2026-08-04, see Phase 3). WhatsApp itself is also done as of
  2026-08-04 (see Phase 3) — each organization connects its own account.
- Auto-sending client-facing automations once a channel above is chosen.
- True IANA-timezone-aware appointment scheduling (Europe/Amsterdam with real
  DST handling) — today's naive wall-clock approach is correct for
  Netherlands-only use but should be fixed before any international/DST-edge
  expansion.
- GDPR self-service data export/deletion (today handled by contacting
  `privacy@roavaa.com`).
- Admin-facing "which AI provider is active" indicator + `ai_usage_log`
  prompt-version tracking.
- Quote archive/soft-delete.

## After the garage vertical is stable

Add other trades (plumbers, electricians, HVAC, dentists, real estate, etc.).
The architecture stays the same; only the domain "brain" changes. The
`business_type` field is already in place.

## Recommended next step

WhatsApp send and automatic inbound call answering are now both built
(2026-08-04); the natural next step is turning automations from suggestions
into real auto-sends now that both channels exist, or outbound
calling/SMS if a garage specifically needs it.
