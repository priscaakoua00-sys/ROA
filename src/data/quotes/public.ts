import 'server-only';

import { createSupabaseServerClient } from '@/data/supabase/server';

export interface PublicQuoteLineItem {
  description: string;
  kind: 'part' | 'labor' | 'other';
  quantity: number;
  unitPrice: number;
}

export interface PublicQuote {
  quoteNumber: string;
  status: 'sent' | 'accepted' | 'refused' | 'expired' | 'converted';
  issueDate: string;
  validUntil: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  notes: string | null;
  orgName: string;
  orgLogoUrl: string | null;
  orgPhone: string | null;
  customerFirstName: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleLicensePlate: string | null;
  lineItems: PublicQuoteLineItem[];
}

/**
 * Reads a quote through the public, unauthenticated `public_quote_view` /
 * `public_quote_line_items` RPCs — no session required, works for a customer
 * who opens the link from an email or a message. Returns null for an unknown
 * id or a quote still in 'draft' (not sent to the customer yet).
 */
export async function getPublicQuote(quoteId: string): Promise<PublicQuote | null> {
  const supabase = await createSupabaseServerClient();
  const [{ data: rows, error }, { data: itemRows }] = await Promise.all([
    supabase.rpc('public_quote_view', { p_quote_id: quoteId }),
    supabase.rpc('public_quote_line_items', { p_quote_id: quoteId }),
  ]);
  if (error || !rows || rows.length === 0) return null;
  const q = rows[0] as Record<string, unknown>;

  return {
    quoteNumber: q.quote_number as string,
    status: q.status as PublicQuote['status'],
    issueDate: q.issue_date as string,
    validUntil: (q.valid_until as string | null) ?? null,
    subtotal: Number(q.subtotal),
    vatRate: Number(q.vat_rate),
    vatAmount: Number(q.vat_amount),
    total: Number(q.total),
    notes: (q.notes as string | null) ?? null,
    orgName: q.org_name as string,
    orgLogoUrl: (q.org_logo_url as string | null) ?? null,
    orgPhone: (q.org_phone as string | null) ?? null,
    customerFirstName: (q.customer_first_name as string | null) ?? null,
    vehicleMake: (q.vehicle_make as string | null) ?? null,
    vehicleModel: (q.vehicle_model as string | null) ?? null,
    vehicleLicensePlate: (q.vehicle_license_plate as string | null) ?? null,
    lineItems: ((itemRows as Record<string, unknown>[]) ?? []).map((li) => ({
      description: li.description as string,
      kind: li.kind as PublicQuoteLineItem['kind'],
      quantity: Number(li.quantity),
      unitPrice: Number(li.unit_price),
    })),
  };
}
