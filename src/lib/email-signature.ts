export interface EmailSignatureOrg {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  website: string | null;
  logoUrl: string | null;
  cardUrl: string;
}

function addressLine(org: EmailSignatureOrg): string | null {
  const cityLine = [org.postalCode, org.city].filter(Boolean).join(' ');
  const parts = [org.address, cityLine].filter((p) => p && p.trim() !== '');
  return parts.length > 0 ? parts.join(', ') : null;
}

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

/**
 * Table-based markup with inline styles only — email clients (Outlook,
 * Gmail) strip <style> blocks and ignore most CSS layout, so this is the one
 * template shape that renders consistently across all of them.
 */
export function buildEmailSignatureHtml(org: EmailSignatureOrg): string {
  const address = addressLine(org);
  const rows: string[] = [];
  if (org.phone) rows.push(`<a href="tel:${org.phone.replace(/\s+/g, '')}" style="color:#57534e;text-decoration:none;">${org.phone}</a>`);
  if (org.email) rows.push(`<a href="mailto:${org.email}" style="color:#57534e;text-decoration:none;">${org.email}</a>`);
  if (address) rows.push(address);
  if (org.website) {
    rows.push(
      `<a href="${websiteHref(org.website)}" style="color:#b8860b;text-decoration:none;">${org.website.replace(/^https?:\/\//i, '')}</a>`,
    );
  }

  const logoCell = org.logoUrl
    ? `<td style="padding-right:16px;vertical-align:top;"><img src="${org.logoUrl}" alt="${org.name}" width="64" height="64" style="display:block;border-radius:8px;object-fit:contain;" /></td>`
    : '';

  return [
    '<table cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#292524;">',
    '<tr>',
    logoCell,
    '<td style="border-left:3px solid #b8860b;padding-left:16px;">',
    `<div style="font-size:15px;font-weight:700;color:#1c1917;">${org.name}</div>`,
    rows.map((r) => `<div style="margin-top:2px;">${r}</div>`).join(''),
    `<div style="margin-top:8px;"><a href="${org.cardUrl}" style="color:#b8860b;text-decoration:none;font-size:12px;">${org.cardUrl.replace(/^https?:\/\//i, '')}</a></div>`,
    '</td>',
    '</tr>',
    '</table>',
  ].join('');
}

export function buildEmailSignatureText(org: EmailSignatureOrg): string {
  const address = addressLine(org);
  const lines = [org.name];
  if (org.phone) lines.push(org.phone);
  if (org.email) lines.push(org.email);
  if (address) lines.push(address);
  if (org.website) lines.push(org.website.replace(/^https?:\/\//i, ''));
  lines.push(org.cardUrl.replace(/^https?:\/\//i, ''));
  return lines.join('\n');
}
