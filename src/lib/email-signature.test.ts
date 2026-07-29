import { describe, expect, it } from 'vitest';
import { buildEmailSignatureHtml, buildEmailSignatureText, type EmailSignatureOrg } from './email-signature';

const baseOrg: EmailSignatureOrg = {
  name: 'Garage De Vries',
  phone: '+32 470 12 34 56',
  email: 'contact@garagedevries.example',
  address: 'Kerkstraat 12',
  postalCode: '2000',
  city: 'Antwerpen',
  website: 'garagedevries.example',
  logoUrl: 'https://cdn.example/logo.png',
  cardUrl: 'https://roavaa.com/nl/card/garage-de-vries',
};

describe('buildEmailSignatureHtml', () => {
  it('includes the org name, contact details, and card link', () => {
    const html = buildEmailSignatureHtml(baseOrg);
    expect(html).toContain('Garage De Vries');
    expect(html).toContain('href="tel:+32470123456"');
    expect(html).toContain('contact@garagedevries.example');
    expect(html).toContain('Kerkstraat 12, 2000 Antwerpen');
    expect(html).toContain('garagedevries.example');
    expect(html).toContain(baseOrg.cardUrl);
    expect(html).toContain(baseOrg.logoUrl!);
  });

  it('omits the logo cell and optional fields when absent', () => {
    const html = buildEmailSignatureHtml({
      ...baseOrg,
      logoUrl: null,
      phone: null,
      website: null,
      address: null,
      postalCode: null,
      city: null,
    });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('tel:');
    expect(html).toContain('Garage De Vries');
  });

  it('normalizes a website without a protocol into an https:// link', () => {
    const html = buildEmailSignatureHtml(baseOrg);
    expect(html).toContain('href="https://garagedevries.example"');
  });
});

describe('buildEmailSignatureText', () => {
  it('produces a plain-text signature with one field per line', () => {
    const text = buildEmailSignatureText(baseOrg);
    expect(text.split('\n')).toEqual([
      'Garage De Vries',
      '+32 470 12 34 56',
      'contact@garagedevries.example',
      'Kerkstraat 12, 2000 Antwerpen',
      'garagedevries.example',
      'roavaa.com/nl/card/garage-de-vries',
    ]);
  });

  it('skips fields that are missing', () => {
    const text = buildEmailSignatureText({ ...baseOrg, phone: null, website: null });
    expect(text.split('\n')).toEqual([
      'Garage De Vries',
      'contact@garagedevries.example',
      'Kerkstraat 12, 2000 Antwerpen',
      'roavaa.com/nl/card/garage-de-vries',
    ]);
  });
});
