import { test, expect } from '@playwright/test';
import fr from '../messages/fr.json';
import en from '../messages/en.json';
import nl from '../messages/nl.json';

const LOCALES = [
  { code: 'fr', messages: fr },
  { code: 'en', messages: en },
  { code: 'nl', messages: nl },
] as const;

test.describe('Landing page', () => {
  for (const { code, messages } of LOCALES) {
    test(`renders in ${code} with the right title`, async ({ page }) => {
      await page.goto(`/${code}`);
      await expect(page).toHaveTitle(new RegExp(messages.app.name, 'i'));
    });
  }
});

test.describe('Pricing page', () => {
  for (const { code, messages } of LOCALES) {
    test(`shows all three plans in ${code}`, async ({ page }) => {
      await page.goto(`/${code}/pricing`);
      for (const key of ['starter', 'professional', 'enterprise'] as const) {
        await expect(page.getByText(messages.pricing.plans[key], { exact: false }).first()).toBeVisible();
      }
    });
  }
});

test.describe('Language switcher', () => {
  test('navigating straight to the English landing page renders English copy', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(new RegExp(en.app.name, 'i'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('navigating straight to the Dutch landing page renders Dutch copy', async ({ page }) => {
    await page.goto('/nl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  });
});
