# Roadmap

## Phase 1: Core business (DONE) ✅

Complete and connected to a live Supabase database:

- Authentication (sign up / in / out, forgot + reset password, email callback,
  sessions, route protection, state-based redirects).
- Organizations + multi-tenant model; **RLS on all 15 tables**; org isolation via
  `current_user_org_ids()`.
- Onboarding (create garage, default hours + default service seeded).
- Customers, vehicles, full history per customer.
- Leads: public request form, deterministic emergency detection, AI qualification
  (summary / urgency / missing fields), dashboard, lead detail.
- Team: members, invitations (pending), roles, enable / disable; assign a mechanic.
- Appointments: availability engine (never proposes an occupied slot), proposed
  slots, booking, agenda.
- Work orders: create from a lead, status, assignee, task checklist.
- Conversations: thread + AI-drafted reply (human validates and sends).
- Dashboard with real counts + notifications.
- i18n NL / EN / FR. 37 tests. Four green checks.

## Phase 2: Real intelligence (PENDING)

- Real AI provider behind the existing `AIProvider` interface (needs API key +
  budget). Today the default is `MockAIProvider` (deterministic, offline).
- Learning from human corrections; per-org preferences; prompt versioning.
- Business knowledge base (global / industry / organization scopes).

## Phase 3: Connections (PENDING)

- Real message delivery (today "send" only stores the message).
- At least one real channel first: **email** or **WhatsApp**. Then phone / SMS.
- Employee invitation emails (accept via link).
- Notification delivery (email), calendar sync.
- Each channel needs an account + keys + budget.

## Phase 4: Advanced modules (PENDING)

- Quotes, invoices, reports, advanced statistics.
- Automations and real follow-ups (reminders, unanswered requests).
- Full garage settings.
- Subscriptions and payments.

## After the garage vertical is stable

Add other trades (plumbers, electricians, HVAC, dentists, real estate, etc.).
The architecture stays the same; only the domain "brain" changes. The
`business_type` field is already in place.

## Recommended next step

Real AI + one real channel (email or WhatsApp) + a full test with the first
garage using non-sensitive data.
