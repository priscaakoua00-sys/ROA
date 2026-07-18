# Product

> Brand name: **Roavaa**, from Répond · Organise · Apprend (Responds · Organizes ·
> Learns). The name is the same in every language; only the slogan is translated.

## Vision

Roavaa wants to become the **first AI employee** of small and medium
businesses. The first product targets **independent car garages in the
Netherlands**.

Initial mission: **no lead is ever lost because the garage did not answer fast
enough.** The system receives a request, understands the need, asks the
necessary questions, creates the customer file, proposes an appointment, follows
up, and hands off to a human when needed.

## Philosophy (non-negotiable)

Every feature must answer at least one question: does it save time, does it make
money, does it reduce the customer's stress? If not, it is not built now.

- **Almost empty interface.** One primary question per screen. Details appear on
  click, not all at once. Progressive disclosure over dashboards full of charts.
- **Very fast.** Page open < 1s, instant search, fluid navigation. Speed is part
  of the premium feel.
- **The AI knows its limits.** It can say "I don't know" or "I'll pass this to a
  colleague." An AI that invents is a bad AI.
- **Humans own decisions.** The AI proposes ("this looks urgent"); it never
  decides alone on anything that matters.
- **No AI jargon.** The owner never sees "LLM", "prompt", "tokens",
  "embeddings", "vector database". They see: assistant, AI employee,
  conversation, summary, proposal.
- **Everything configurable without code.** Hours, appointment durations, tone,
  automated messages, languages, urgencies, logo, colors, signature.
- **A personal universe.** Each business feels the product is *theirs*, logo,
  name, colors, assistant name, personalized welcome.

## Languages

Built for three complete languages from day one: **Dutch (default), English,
French**. Two distinct language axes:

1. The language the **owner** uses inside the app.
2. The `preferred_language` of **each customer** in conversations.

The owner can work in English while the assistant answers one customer in Dutch
and another in French. A known preferred language is respected; the AI does not
switch language without reason.

## Current scope

Phase 1 (core business) is built and connected to Supabase: authentication,
organizations with RLS, onboarding, customers, vehicles, leads with emergency
detection and AI qualification, team and roles, appointments and agenda, work
orders, public request form, dashboard, and internal conversations with
AI-drafted replies. Full i18n (NL/EN/FR), tests, and CI.

Still simulated or not connected: the AI provider is a deterministic mock (no
real model), and no real channels (email, WhatsApp, phone) are wired. See
PILOT_READINESS.md.

## First functional scope (Phase 1, delivered)

Account creation; create a garage organization; invite members; configure hours;
create/edit customers and vehicles; receive a request via a public form; auto-
create a lead; list and open leads; view history; internal notes; assign a lead;
create an appointment; a simple dashboard; an AI-generated structured summary;
hand off to a human when confidence is low.

## Dashboard intent (later)

The dashboard explains numbers, it does not just display them. Each
recommendation shows the data used, a confidence level, the proposed action, the
expected result, and accept/ignore. When data is insufficient it says so,
it never invents a conclusion.
