import { test, expect } from '@playwright/test';

/**
 * These run with no signed-in session (no auth cookies are ever set in this
 * suite), so every protected route must bounce to /login. This is the
 * middleware's isApp guard plus each page's own `if (!user) redirect(...)`
 * defense-in-depth check — both are exercised here since the browser makes a
 * real request through the real middleware.
 */
const PROTECTED_ROUTES = [
  'dashboard',
  'settings',
  'customers',
  'vehicles',
  'work-orders',
  'invoices',
  'quotes',
  'inventory',
  'agenda',
  'leads',
  'knowledge',
  'automations',
  'reports',
  'team',
  'notifications',
  'admin/errors',
];

test.describe('Protected routes redirect signed-out visitors to login', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`/fr/${route} redirects to /fr/login`, async ({ page }) => {
      await page.goto(`/fr/${route}`);
      await expect(page).toHaveURL(/\/fr\/login/);
    });
  }
});

test.describe('Auth pages render for signed-out visitors', () => {
  test('login page shows the email/password form', async ({ page }) => {
    await page.goto('/fr/login');
    await expect(page.getByLabel(/e-mail|email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe|password/i)).toBeVisible();
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/fr/signup');
    await expect(page).toHaveURL(/\/fr\/signup/);
  });
});
