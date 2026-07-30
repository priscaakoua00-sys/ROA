import { test } from '@playwright/test';

/**
 * Scaffold for the 12 core business flows — NOT implemented, and NOT
 * manually verified either. Each one needs to create real rows (a signup, an
 * organization, customers, quotes, invoices, a Stripe test-mode payment...)
 * and this repo has exactly one configured Supabase project — confirmed via
 * its own auth logs to be actively serving live production traffic right
 * now, not a dormant pre-launch database. Creating or deleting rows there,
 * automated or one-off manual, was explicitly not authorized; see
 * e2e/README.md for how to connect an isolated staging project or branch
 * instead.
 *
 * `test.fixme(...)` makes Playwright report these as "fixme", never as
 * passing — `npx playwright test --list` and the test run output both show
 * the gap instead of hiding it. Replace each fixme with a real
 * implementation once a staging environment is connected.
 */

test.describe('Signup and garage creation', () => {
  test.fixme('a new visitor can sign up and their garage is created', async () => {});
});

test.describe('Customer and vehicle creation', () => {
  test.fixme('a garage member can create a customer and attach a vehicle', async () => {});
});

test.describe('Request creation', () => {
  test.fixme('a public request creates a lead, customer, and vehicle', async () => {});
});

test.describe('Quote lifecycle', () => {
  test.fixme('a quote can be created and publicly accepted by the customer', async () => {});
  test.fixme('an accepted quote locks its line items and VAT', async () => {});
  test.fixme('an accepted quote converts to a work order or an invoice', async () => {});
});

test.describe('Payment', () => {
  test.fixme('a Stripe test-mode payment and webhook mark an invoice as paid', async () => {});
});

test.describe('Employee invitation', () => {
  test.fixme('an invited employee joins the inviting organization on signup', async () => {});
});

test.describe('Work order lifecycle', () => {
  test.fixme('a work order can progress through its stages with a gated checklist', async () => {});
});

test.describe('Inventory', () => {
  test.fixme('recording part usage decrements stock and blocks negative stock', async () => {});
});

test.describe('Customer portal', () => {
  test.fixme('a customer can sign in via magic link and see their vehicle history', async () => {});
});

test.describe('Multi-garage isolation', () => {
  test.fixme('a member of garage A cannot see garage B\'s customers, quotes, or invoices', async () => {});
});
