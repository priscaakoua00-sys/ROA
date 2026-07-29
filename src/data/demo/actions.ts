'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';

export async function seedDemoDataAction(formData: FormData) {
  const locale = String(formData.get('locale') ?? 'nl');
  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const { error } = await supabase.rpc('seed_demo_data', { p_organization_id: orgId });
  redirect(`/${locale}/settings${error ? '?demo=error' : '?demo=seeded'}`);
}

export async function deleteDemoDataAction(formData: FormData) {
  const locale = String(formData.get('locale') ?? 'nl');
  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const { error } = await supabase.rpc('delete_demo_data', { p_organization_id: orgId });
  redirect(`/${locale}/settings${error ? '?demo=error' : '?demo=deleted'}`);
}
