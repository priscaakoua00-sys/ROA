'use server';

import { randomInt } from 'node:crypto';
import { createSupabaseServerClient, getSafeUser } from '@/data/supabase/server';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { isPlatformOwnerEmail } from '@/lib/platform-admin';
import { logServerError } from '@/lib/error-log';

export interface SetTemporaryPasswordState {
  error?: 'forbidden' | 'invalid' | 'lookup_failed' | 'not_found' | 'update_failed';
  email?: string;
  password?: string;
}

// No ambiguous characters (0/O, 1/l/I) — this gets read aloud or retyped by hand.
const PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generateTemporaryPassword(length = 14): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARSET[randomInt(PASSWORD_CHARSET.length)];
  }
  return out;
}

/**
 * Emergency admin path for the 2026-08-07 email-recovery outage: sets a
 * strong random password directly via the service-role admin API so the
 * platform owner can hand it to a locked-out user by another channel
 * (phone, WhatsApp) while the real self-serve reset flow is being fixed.
 * Restricted to the platform owner; never exposes the service-role key to
 * the browser — everything here runs server-side.
 */
export async function adminSetTemporaryPasswordAction(
  _prevState: SetTemporaryPasswordState,
  formData: FormData,
): Promise<SetTemporaryPasswordState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSafeUser(supabase);
  if (!user || !isPlatformOwnerEmail(user.email)) {
    return { error: 'forbidden' };
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return { error: 'invalid' };

  const admin = createSupabaseAdminClient();

  // The admin API has no direct getUserByEmail; list and match. Fine at
  // this account scale — revisit with real pagination if the user base
  // ever grows past a single page.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    await logServerError({ route: 'admin_set_temp_password', message: `listUsers failed: ${listError.message}` });
    return { error: 'lookup_failed', email };
  }
  const target = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!target) return { error: 'not_found', email };

  const temporaryPassword = generateTemporaryPassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(target.id, { password: temporaryPassword });
  if (updateError) {
    await logServerError({
      route: 'admin_set_temp_password',
      message: `updateUserById failed for ${email}: ${updateError.message}`,
    });
    return { error: 'update_failed', email };
  }

  return { email, password: temporaryPassword };
}
