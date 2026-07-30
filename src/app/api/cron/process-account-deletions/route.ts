import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/data/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Runs once a day (Vercel Cron, see vercel.json). Processes GDPR erasure
 * requests (settings > privacy > "delete my account"): re-checks that the
 * user owns no organization, then deletes their auth.users row via the
 * service-role Admin API. Membership rows already cascade on delete, so no
 * further cleanup is needed. organizations.owner_id references auth.users
 * with `on delete restrict`, so a request from a user who still owns an org
 * is left as 'blocked_owner' rather than silently failing.
 * Protected by CRON_SECRET, matching Vercel Cron's own
 * `Authorization: Bearer <secret>` convention. Fails closed.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: requests } = await admin
    .from('account_deletion_requests')
    .select('id, user_id, status');

  let deleted = 0;
  let blocked = 0;
  for (const request of requests ?? []) {
    const { data: ownedOrgs } = await admin.from('organizations').select('id').eq('owner_id', request.user_id).limit(1);
    if ((ownedOrgs ?? []).length > 0) {
      if (request.status !== 'blocked_owner') {
        await admin.from('account_deletion_requests').update({ status: 'blocked_owner' }).eq('id', request.id);
      }
      blocked += 1;
      continue;
    }

    const { error } = await admin.auth.admin.deleteUser(request.user_id);
    if (!error) deleted += 1;
  }

  return NextResponse.json({ ok: true, deleted, blocked });
}
