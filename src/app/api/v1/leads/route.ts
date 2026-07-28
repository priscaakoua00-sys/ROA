import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateApiKey } from '@/lib/api-auth';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { dispatchWebhooks } from '@/lib/webhooks';

const bodySchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  description: z.string().trim().min(1),
  licensePlate: z.string().trim().min(1).optional(),
  make: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  mileage: z.number().int().positive().optional(),
});

/**
 * POST /api/v1/leads — Authorization: Bearer <api key>
 * Creates a customer (+ optional vehicle) and a lead from a third-party
 * integration (website widget, marketing tool...). Fires the lead.created
 * webhook to any subscribed endpoint, same as leads captured in-app.
 */
export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      organization_id: auth.organizationId,
      first_name: parsed.data.firstName ?? null,
      last_name: parsed.data.lastName ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      consent: true,
    })
    .select('id')
    .single();
  if (customerError || !customer) {
    return NextResponse.json({ error: 'Could not create lead.' }, { status: 500 });
  }

  let vehicleId: string | null = null;
  if (parsed.data.licensePlate || parsed.data.make || parsed.data.model) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .insert({
        organization_id: auth.organizationId,
        customer_id: customer.id,
        license_plate: parsed.data.licensePlate ?? null,
        make: parsed.data.make ?? null,
        model: parsed.data.model ?? null,
        mileage: parsed.data.mileage ?? null,
      })
      .select('id')
      .single();
    vehicleId = vehicle?.id ?? null;
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      organization_id: auth.organizationId,
      customer_id: customer.id,
      vehicle_id: vehicleId,
      channel: 'api',
      status: 'new',
      description: parsed.data.description,
    })
    .select('id')
    .single();
  if (leadError || !lead) {
    return NextResponse.json({ error: 'Could not create lead.' }, { status: 500 });
  }

  await dispatchWebhooks(supabase, auth.organizationId, 'lead.created', {
    leadId: lead.id,
    customerId: customer.id,
    vehicleId,
    description: parsed.data.description,
  });

  return NextResponse.json({ data: { id: lead.id } }, { status: 201 });
}
