import 'server-only';

import { createSupabaseServerClient } from '@/data/supabase/server';

export interface PublicInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PublicInvoice {
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paidAmount: number;
  notes: string | null;
  orgId: string;
  orgName: string;
  orgLogoUrl: string | null;
  orgPhone: string | null;
  orgEmail: string | null;
  customerFirstName: string | null;
  customerEmail: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleLicensePlate: string | null;
  lineItems: PublicInvoiceLineItem[];
}

/**
 * Reads an invoice through the public, unauthenticated `public_invoice_view` /
 * `public_invoice_line_items` RPCs — no session required, mirrors the public
 * quote page. Returns null for an unknown id, a draft, or a cancelled invoice.
 */
export async function getPublicInvoice(invoiceId: string): Promise<PublicInvoice | null> {
  const supabase = await createSupabaseServerClient();
  const [{ data: rows, error }, { data: itemRows }] = await Promise.all([
    supabase.rpc('public_invoice_view', { p_invoice_id: invoiceId }),
    supabase.rpc('public_invoice_line_items', { p_invoice_id: invoiceId }),
  ]);
  if (error || !rows || rows.length === 0) return null;
  const i = rows[0] as Record<string, unknown>;

  return {
    invoiceNumber: i.invoice_number as string,
    status: i.status as string,
    issueDate: i.issue_date as string,
    dueDate: (i.due_date as string | null) ?? null,
    subtotal: Number(i.subtotal),
    vatRate: Number(i.vat_rate),
    vatAmount: Number(i.vat_amount),
    total: Number(i.total),
    paidAmount: Number(i.paid_amount),
    notes: (i.notes as string | null) ?? null,
    orgId: i.org_id as string,
    orgName: i.org_name as string,
    orgLogoUrl: (i.org_logo_url as string | null) ?? null,
    orgPhone: (i.org_phone as string | null) ?? null,
    orgEmail: (i.org_email as string | null) ?? null,
    customerFirstName: (i.customer_first_name as string | null) ?? null,
    customerEmail: (i.customer_email as string | null) ?? null,
    vehicleMake: (i.vehicle_make as string | null) ?? null,
    vehicleModel: (i.vehicle_model as string | null) ?? null,
    vehicleLicensePlate: (i.vehicle_license_plate as string | null) ?? null,
    lineItems: ((itemRows as Record<string, unknown>[]) ?? []).map((li) => ({
      description: li.description as string,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unit_price),
    })),
  };
}
