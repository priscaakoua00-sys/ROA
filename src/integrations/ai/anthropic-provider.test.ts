import { describe, expect, it } from 'vitest';
import { enforceCatalogPricing } from './anthropic-provider';
import type { QuoteDraft } from './schemas';

const catalogParts = [
  { name: 'Brake pads front', unitCost: 30 },
  { name: 'Oil filter', unitCost: 8 },
];

function draft(lineItems: QuoteDraft['lineItems']): QuoteDraft {
  return { lineItems, disclaimer: 'Draft to review before sending.' };
}

describe('enforceCatalogPricing', () => {
  it('recomputes the price for a part that matches the catalog, ignoring the model\'s number', () => {
    const result = enforceCatalogPricing(
      draft([{ description: 'Brake pads front', kind: 'part', quantity: 1, unitPrice: 999 }]),
      catalogParts,
      20,
      'en',
    );
    expect(result.lineItems[0]!.unitPrice).toBe(36); // 30 * 1.2
  });

  it('matches case-insensitively and via partial containment', () => {
    const result = enforceCatalogPricing(
      draft([{ description: 'oil filter (front)', kind: 'part', quantity: 1, unitPrice: 1 }]),
      catalogParts,
      50,
      'en',
    );
    expect(result.lineItems[0]!.unitPrice).toBe(12); // 8 * 1.5
  });

  it('zeroes out and marks a part with no catalog match instead of trusting a fabricated price', () => {
    const result = enforceCatalogPricing(
      draft([{ description: 'Turbocharger unit', kind: 'part', quantity: 1, unitPrice: 850 }]),
      catalogParts,
      20,
      'en',
    );
    expect(result.lineItems[0]!.unitPrice).toBe(0);
    expect(result.lineItems[0]!.description).toContain('price to confirm');
  });

  it('uses the French placeholder for fr and does not double-mark an already-marked description', () => {
    const result = enforceCatalogPricing(
      draft([{ description: 'Pièce inconnue (prix à confirmer)', kind: 'part', quantity: 1, unitPrice: 42 }]),
      catalogParts,
      20,
      'fr',
    );
    expect(result.lineItems[0]!.unitPrice).toBe(0);
    expect(result.lineItems[0]!.description).toBe('Pièce inconnue (prix à confirmer)');
  });

  it('leaves labor and other line items untouched', () => {
    const result = enforceCatalogPricing(
      draft([{ description: 'Labour (2h)', kind: 'labor', quantity: 2, unitPrice: 65 }]),
      catalogParts,
      20,
      'en',
    );
    expect(result.lineItems[0]!.unitPrice).toBe(65);
  });
});
